const isSupported = () => {
  const canvas = document.createElement('canvas');
  let gl;
  try {
    gl = canvas.getContext('webgl2');
  } catch (x) {
    gl = null;
  }

  const webGL2Supported = !!gl;
  const audioApiSupported = !!(window.AudioContext || window.webkitAudioContext);

  return webGL2Supported && audioApiSupported;
};

export default isSupported;
module.exports = isSupported;
