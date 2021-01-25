const fs = require("fs");
const path = require("path");

const presetDataAll = JSON.parse(
  fs.readFileSync("presetDataDetailedAll.json").toString()
);
const presetDataDetailedAllWASMTweak = JSON.parse(
  fs.readFileSync("presetDataDetailedAllWASMTweak.json").toString()
);
const presetList = Object.keys(presetDataDetailedAllWASMTweak);

const statDiffs = [];
const winners = [0, 0];

for (let i = 0; i < presetList.length; i++) {
  const presetName = presetList[i];
  const presetData = presetDataAll[presetName];
  const presetDataWithTweak = presetDataDetailedAllWASMTweak[presetName];

  const oldStat = presetData.wasmAvg.runPixelEquations;
  const newStat = presetDataWithTweak.wasmAvg.runPixelEquations;
  const statDiff = Math.abs(oldStat - newStat);
  const statAvg = (oldStat + newStat) / 2;
  statDiffs.push(statDiff / statAvg);

  if (oldStat > newStat) {
    winners[0]++;
  } else {
    winners[1]++;
  }
}

function average(nums) {
  return nums.reduce((a, b) => a + b) / nums.length;
}

console.log(average(statDiffs));
console.log(winners);