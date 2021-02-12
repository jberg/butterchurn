const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log(
    "not enough arguments: yarn run time-presets audio-analysis-file output-json"
  );
  process.exit(1);
}

const onlyPresetsWithPixelEqs = false;
const presetList = JSON.parse(fs.readFileSync("presetList.json").toString())
  .test;

const audioAnalysis = JSON.parse(fs.readFileSync(args[0]).toString());
let outputJSON = {};
if (args[1]) {
  outputJSON = JSON.parse(fs.readFileSync(args[1]).toString());
}

let presetStartIdx = 0;
Object.keys(outputJSON).forEach((presetName) => {
  const presetIdx = presetList.indexOf(presetName) + 1;
  if (presetIdx > presetStartIdx) {
    presetStartIdx = presetIdx;
  }
});

console.log("Starting at preset index: ", presetStartIdx);

function clonePreset(preset) {
  return JSON.parse(JSON.stringify(preset));
}

function average(arr) {
  return arr.reduce((p, c) => p + c, 0) / arr.length;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

(async () => {
  const width = 800;
  const height = 600;
  const frameCount = 300;
  const trials = 5;
  const browser = await puppeteer.launch({ headless: false });

  for (let i = presetStartIdx; i < presetList.length; i++) {
    const presetName = presetList[i];
    const presetJSON = JSON.parse(
      fs.readFileSync(`../presets/${presetName}`).toString()
    );

    const pixelEqs = presetJSON.pixel_eqs_str;
    const hasPixelEqs = !(!pixelEqs || pixelEqs === "");

    if (onlyPresetsWithPixelEqs && !hasPixelEqs) {
      continue;
    }

    const presetData = {
      hasPixelEqs,
      jsTrials: [],
      wasmTrials: [],
      moreWasmTrials: [],
      jsAvg: null,
      wasmAvg: null,
      moreWasmAvg: null,
    };

    for (let j = 0; j < trials; j++) {
      const equationTypes = ["useMoreWASM", "useWASM", "JS"];
      shuffleArray(equationTypes);
      for (const equationType of equationTypes) {
        const useWASM = ["useMoreWASM", "useWASM"].includes(equationType);
        const useMoreWASM = equationType === "useMoreWASM";
        let preset = clonePreset(presetJSON);
        preset.useWASM = useWASM;
        preset.useMoreWASM = useMoreWASM;

        const page = await browser.newPage();
        page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
        page.on("pageerror", (err) =>
          console.log("PAGE ERROR: " + err.toString())
        );
        const html = `
          <!DOCTYPE html>
            <head>
              <style>
                body {
                  margin: 0;
                  overflow: hidden;
                }
              </style>

              <script type="text/javascript" src="http://localhost:8000/dist/butterchurn.min.js"></script>

              <script>
                document.addEventListener("DOMContentLoaded", function(event) {
                  let audioAnalysis = null;
                  const frameCount = ${frameCount};
                  const presetStats = []
                  const canvas = document.getElementById('canvas');
                  const visualizer = butterchurn.default.createVisualizer(null, canvas , {
                    width: ${width},
                    height: ${height},
                  });

                  window.loadPreset = (preset) => {
                    visualizer.loadPreset(preset, 0);
                  }

                  window.setAudioAnalysis = (analysis) => {
                    audioAnalysis = analysis;
                  }

                  const render = () => {
                    if (presetStats.length === frameCount) {
                      return;
                    }

                    requestAnimationFrame(() => {
                      render();
                    });

                    const i = presetStats.length;
                    const audioData = audioAnalysis[i];

                    let elapsedTime;
                    if (i === 0) {
                      elapsedTime = audioData.time;
                    } else {
                      elapsedTime = audioData.time - audioAnalysis[i - 1].time;
                    }

                    const renderOpts = {
                      elapsedTime,
                      audioLevels: {
                        timeByteArray: audioData.timeByteArray,
                        timeByteArrayL: audioData.timeByteArrayL,
                        timeByteArrayR: audioData.timeByteArrayR,
                      },
                    };

                    const frameStats = visualizer.render(renderOpts);
                    presetStats.push(frameStats);
                  }

                  window.renderFrames = () => {
                    return render();
                  }

                  window.getResults = () => {
                    if (presetStats.length === frameCount) {
                      return presetStats;
                    }

                    return false;
                  }
                });
              </script>
            </head>
            <body>
              <div style='overflow: hidden;'>
                <canvas id='canvas' width='${width}' height='${height}'></canvas>
              </div>
            </body>
          </html>`;
        await page.setViewport({ width, height, deviceScaleFactor: 1 });

        const timeout = setTimeout(async () => {
          console.log("Timed out, killing process");
          await page.close();
        }, 180000);

        try {
          await page.goto(`data:text/html;charset=UTF-8,${html}`);

          await page.evaluate(
            (audioAnalysis) => window.setAudioAnalysis(audioAnalysis),
            audioAnalysis
          );
          await page.evaluate((preset) => window.loadPreset(preset), preset);
          await page.evaluate(() => window.renderFrames());

          const resultHandle = await page.waitForFunction(
            () => window.getResults(),
            {
              polling: 2000,
            }
          );
          const presetStats = await resultHandle.jsonValue();

          const totalStats = {
            calcFPS: 0,
            updateAudioLevels: 0,
            runFrameEquations: 0,
            runPixelEquations: 0,
            getBlurValues: 0,
            warpShader: 0,
            renderBlurTexture: 0,
            drawMotionVectors: 0,
            drawCustomShape: 0,
            drawCustomWaveform: 0,
            drawBasicWaveform: 0,
            drawBorderAndCenter: 0,
            renderToScreen: 0,
          };
          for (let i = 0; i < presetStats.length; i++) {
            const stats = presetStats[i];

            totalStats.calcFPS += stats.calcFPS - stats.startTime;
            totalStats.updateAudioLevels +=
              stats.updateAudioLevels - stats.calcFPS;
            totalStats.runFrameEquations +=
              stats.runFrameEquations - stats.updateAudioLevels;
            totalStats.runPixelEquations +=
              stats.runPixelEquations - stats.runFrameEquations;
            totalStats.getBlurValues +=
              stats.getBlurValues - stats.runPixelEquations;
            totalStats.warpShader += stats.warpShader - stats.getBlurValues;
            totalStats.renderBlurTexture +=
              stats.renderBlurTexture - stats.warpShader;
            totalStats.drawMotionVectors +=
              stats.drawMotionVectors - stats.renderBlurTexture;
            totalStats.drawCustomShape +=
              stats.drawCustomShape - stats.drawMotionVectors;
            totalStats.drawCustomWaveform +=
              stats.drawCustomWaveform - stats.drawCustomShape;
            totalStats.drawBasicWaveform +=
              stats.drawBasicWaveform - stats.drawCustomWaveform;
            totalStats.drawBorderAndCenter +=
              stats.drawBorderAndCenter - stats.drawBasicWaveform;
            totalStats.renderToScreen +=
              stats.renderToScreen - stats.drawBorderAndCenter;
          }

          let totalStatsTime = 0;
          totalStatsTime += totalStats.calcFPS;
          totalStatsTime += totalStats.updateAudioLevels;
          totalStatsTime += totalStats.runFrameEquations;
          totalStatsTime += totalStats.runPixelEquations;
          totalStatsTime += totalStats.getBlurValues;
          totalStatsTime += totalStats.warpShader;
          totalStatsTime += totalStats.renderBlurTexture;
          totalStatsTime += totalStats.drawMotionVectors;
          totalStatsTime += totalStats.drawCustomShape;
          totalStatsTime += totalStats.drawCustomWaveform;
          totalStatsTime += totalStats.drawBasicWaveform;
          totalStatsTime += totalStats.drawBorderAndCenter;
          totalStatsTime += totalStats.renderToScreen;

          totalStats.time = totalStatsTime;

          if (useMoreWASM) {
            presetData.moreWasmTrials.push(totalStats);
          } else if (useWASM) {
            presetData.wasmTrials.push(totalStats);
          } else {
            presetData.jsTrials.push(totalStats);
          }
        } catch (e) {
          console.error(e);
        }

        clearTimeout(timeout);

        // this helps clear the memory
        // https://github.com/puppeteer/puppeteer/issues/1490#issuecomment-366217195
        await page.goto("about:blank");
        await page.close();
      }
    }

    if (
      presetData.moreWasmTrials.length !== trials ||
      presetData.wasmTrials.length !== trials ||
      presetData.jsTrials.length !== trials
    ) {
      console.error("Trial counts did not add up for ", presetName);
      // just ignore this preset for now and keep going
      continue;
      // await browser.close();
      // process.exit(1);
    }

    for (const [trialType, avgType] of [
      ["moreWasmTrials", "moreWasmAvg"],
      ["wasmTrials", "wasmAvg"],
      ["jsTrials", "jsAvg"],
    ]) {
      const data = presetData[trialType];
      const averages = {
        calcFPS: average(data.map((d) => d.calcFPS)),
        updateAudioLevels: average(data.map((d) => d.updateAudioLevels)),
        runFrameEquations: average(data.map((d) => d.runFrameEquations)),
        runPixelEquations: average(data.map((d) => d.runPixelEquations)),
        getBlurValues: average(data.map((d) => d.getBlurValues)),
        warpShader: average(data.map((d) => d.warpShader)),
        renderBlurTexture: average(data.map((d) => d.renderBlurTexture)),
        drawMotionVectors: average(data.map((d) => d.drawMotionVectors)),
        drawCustomShape: average(data.map((d) => d.drawCustomShape)),
        drawCustomWaveform: average(data.map((d) => d.drawCustomWaveform)),
        drawBasicWaveform: average(data.map((d) => d.drawBasicWaveform)),
        drawBorderAndCenter: average(data.map((d) => d.drawBorderAndCenter)),
        renderToScreen: average(data.map((d) => d.renderToScreen)),
        time: average(data.map((d) => d.time)),
      };

      presetData[avgType] = averages;
    }

    outputJSON[presetName] = presetData;

    let outputFile;
    if (args[1]) {
      outputFile = args[1];
    } else {
      outputFile = "./presetData.json";
    }

    fs.writeFile(outputFile, JSON.stringify(outputJSON), (err, data) => {
      if (err) {
        return console.log("error writing preset data", err);
      }
    });
  }

  await browser.close();
})();
