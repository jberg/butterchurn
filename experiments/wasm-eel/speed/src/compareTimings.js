const fs = require("fs");
const path = require("path");

const presetDataAll = JSON.parse(
  fs.readFileSync("presetDataDetailedAll.json").toString()
);
const presetList = Object.keys(presetDataAll);

let statDiffs = {
  calcFPS: [],
  updateAudioLevels: [],
  runFrameEquations: [],
  runPixelEquations: [],
  getBlurValues: [],
  warpShader: [],
  renderBlurTexture: [],
  drawMotionVectors: [],
  drawCustomShape: [],
  drawCustomWaveform: [],
  drawBasicWaveform: [],
  drawBorderAndCenter: [],
  renderToScreen: [],
};

const stats = Object.keys(statDiffs);

for (let i = 0; i < presetList.length; i++) {
  const presetName = presetList[i];
  const presetData = presetDataAll[presetName];

  // if (!presetData.hasPixelEqs) {
  //   continue;
  // }

  for (const stat in statDiffs) {
    const jsStat = presetData.jsAvg[stat];
    const wasmStat = presetData.wasmAvg[stat];
    const statDiff = Math.abs(jsStat - wasmStat);
    const statAvg = (jsStat + wasmStat) / 2;
    statDiffs[stat].push(statDiff / statAvg);
  }
}

function average(nums) {
  return nums.reduce((a, b) => a + b) / nums.length;
}

for (const stat in statDiffs) {
  statDiffs[stat] = average(statDiffs[stat]);
}

statDiffs = Object.fromEntries(
  Object.entries(statDiffs).sort(([, a], [, b]) => b - a)
);

console.log(statDiffs);
