const asc = require("assemblyscript/cli/asc");

module.exports = async function (content, map, meta) {
  var callback = this.async();
  await asc.ready;
  const { binary, stderr } = asc.compileString(content, {
    optimize: true,
    optimizeLevel: 3,
    runtime: "none",
    pedantic: true,
    noUnsafe: true,
  });
  if (stderr.toString()) {
    callback(stderr.toString());
    return;
  }

  const mod = `
// TODO: This might be a rather inefficient way to decode.
function decode(string) {
  return new Uint8Array(atob(string).split("").map(function(c) {
    return c.charCodeAt(0);
  }));
};

var data = "${Buffer.from(binary).toString("base64")}";

// TODO: If needed we could expose compiling and initializing separately.
// Or just expose the data itself and let the consumer compile/instantiate it.
module.exports = function AssemblyScriptModule(options) {
  return WebAssembly.compile(decode(data)).then(function(mod) {
    return WebAssembly.instantiate(mod, options);
  });
};
`;
  callback(null, mod, map, meta);
};
