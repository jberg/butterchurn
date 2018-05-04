import 'ecma-proposal-math-extensions';
import './presetBase';
import Visualizer from './visualizer';

export default class Butterchurn {
  static createVisualizer (context, canvas, opts) {
    return new Visualizer(context, canvas, opts);
  }
}

export function isVisualizerSupported () {
  const canvas = document.createElement('canvas');
  let gl;
  try {
    gl = canvas.getContext('webgl2');
  } catch (x) {
    gl = null;
  }

  return !!gl;
}

module.exports = Butterchurn;
