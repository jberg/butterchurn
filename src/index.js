import 'ecma-proposal-math-extensions';
import './presetBase';
import Visualizer from './visualizer';

export default class Butterchurn {
  static createVisualizer (context, canvas, opts) {
    return new Visualizer(context, canvas, opts);
  }
}

module.exports = Butterchurn;
