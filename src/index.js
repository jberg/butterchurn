import 'ecma-proposal-math-extensions';
import './presetBase';
import Visualizer from './visualizer';

export default class Butterchurn {
  static createVisualizer (context, canvas, opts) {
    return new Visualizer(context, canvas, opts);
  }

  static isVisualizerSupported () {
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
  }
}

export const isVisualizerSupported = Butterchurn.isVisualizerSupported;

module.exports = Butterchurn;
