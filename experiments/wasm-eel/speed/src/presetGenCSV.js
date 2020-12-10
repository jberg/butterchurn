const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("not enough arguments: yarn run time-presets input-json");
  process.exit(1);
}

const presetDataAll = JSON.parse(fs.readFileSync(args[0]).toString());
const presetList = Object.keys(presetDataAll);

let outputCSV = "presetName, hasPixelEqs";
outputCSV += ", totalJS, totalWASM, totalMoreWASM";
outputCSV += ", pixelJS, pixelWASM, pixelMoreWASM";
outputCSV += ", frameJS, frameWASM, frameMoreWASM";
outputCSV += ", shapeJS, shapeWASM, shapeMoreWASM";
outputCSV += ", waveJS, waveWASM, waveMoreWASM\n";

for (let i = 0; i < presetList.length; i++) {
  const presetName = presetList[i];
  const presetData = presetDataAll[presetName];

  outputCSV += `${presetName.replace(/,/g, "")}, ${presetData.hasPixelEqs}`;

  outputCSV += `, ${presetData.jsAvg.time.toFixed(2)}`;
  outputCSV += `, ${presetData.wasmAvg.time.toFixed(2)}`;
  outputCSV += `, ${presetData.moreWasmAvg.time.toFixed(2)}`;

  outputCSV += `, ${presetData.jsAvg.runPixelEquations.toFixed(2)}`;
  outputCSV += `, ${presetData.wasmAvg.runPixelEquations.toFixed(2)}`;
  outputCSV += `, ${presetData.moreWasmAvg.runPixelEquations.toFixed(2)}`;

  outputCSV += `, ${presetData.jsAvg.runFrameEquations.toFixed(2)}`;
  outputCSV += `, ${presetData.wasmAvg.runFrameEquations.toFixed(2)}`;
  outputCSV += `, ${presetData.moreWasmAvg.runFrameEquations.toFixed(2)}`;

  outputCSV += `, ${presetData.jsAvg.drawCustomShape.toFixed(2)}`;
  outputCSV += `, ${presetData.wasmAvg.drawCustomShape.toFixed(2)}`;
  outputCSV += `, ${presetData.moreWasmAvg.drawCustomShape.toFixed(2)}`;

  outputCSV += `, ${presetData.jsAvg.drawCustomWaveform.toFixed(2)}`;
  outputCSV += `, ${presetData.wasmAvg.drawCustomWaveform.toFixed(2)}`;
  outputCSV += `, ${presetData.moreWasmAvg.drawCustomWaveform.toFixed(2)}`;

  outputCSV += "\n";
}

fs.writeFile(args[0].replace(/.json$/, ".csv"), outputCSV, (err, data) => {
  if (err) {
    return console.log("error writing preset data", err);
  }
});
