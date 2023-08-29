import {compileString} from "assemblyscript/dist/asc.js";

export default async function (content, map, meta) {
  var callback = this.async();
  const { binary, stderr } = await compileString(content, {
    optimize: true,
    optimizeLevel: 3,
    runtime: "stub",
    pedantic: true,
    // noUnsafe: true,
  });
  if (stderr.toString()) {
    callback(new EvalError(stderr.toString()));
    return;
  }

  const mod = `
var data = "${Buffer.from(binary).toString("base64")}";

module.exports = () => data;
`;
  callback(null, mod, map, meta);
};
