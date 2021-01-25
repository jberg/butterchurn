const asc = require("assemblyscript/cli/asc");

module.exports = async function (content, map, meta) {
  var callback = this.async();
  await asc.ready;
  const { binary, stderr } = asc.compileString(content, {
    optimize: true,
    optimizeLevel: 3,
    runtime: "none",
    pedantic: true,
    // noUnsafe: true,
  });
  if (stderr.toString()) {
    callback(stderr.toString());
    return;
  }

  const mod = `
var data = "${Buffer.from(binary).toString("base64")}";

module.exports = () => data;
`;
  callback(null, mod, map, meta);
};
