import _ from 'lodash';
import AudioProcessor from './audio/audioProcessor';
import Renderer from './rendering/renderer';

export default class Visualizer {
  constructor (audioContext, canvas, opts) {
    this.audio = new AudioProcessor(audioContext);

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });

    this.renderer = new Renderer(gl, this.audio, opts);
  }

  connectAudio (audioNode) {
    this.audioNode = audioNode;
    this.audio.connectAudio(audioNode);
  }

  disconnectAudio (audioNode) {
    this.audio.disconnectAudio(audioNode);
  }

  loadPreset (preset, blendTime) {
    if (!_.isFunction(preset.init_eqs)) {
      /* eslint-disable no-param-reassign, no-new-func */
      preset.init_eqs = new Function('m', `${preset.init_eqs_str} return m;`);
      preset.frame_eqs = new Function('m', `${preset.frame_eqs_str} return m;`);
      if (preset.pixel_eqs_str && preset.pixel_eqs_str !== '') {
        preset.pixel_eqs = new Function('m', `${preset.pixel_eqs_str} return m;`);
      } else {
        preset.pixel_eqs = '';
      }

      for (let i = 0; i < preset.shapes.length; i++) {
        preset.shapes[i] = _.assign(preset.shapes[i], {
          init_eqs: new Function('m', `${preset.shapes[i].init_eqs_str} return m;`),
          frame_eqs: new Function('m', `${preset.shapes[i].frame_eqs_str} return m;`),
        });
      }

      for (let i = 0; i < preset.waves.length; i++) {
        const wave = {
          init_eqs: new Function('m', `${preset.waves[i].init_eqs_str} return m;`),
          frame_eqs: new Function('m', `${preset.waves[i].frame_eqs_str} return m;`),
        };

        if (preset.waves[i].point_eqs_str && preset.waves[i].point_eqs_str !== '') {
          wave.point_eqs = new Function('m', `${preset.waves[i].point_eqs_str} return m;`);
        } else {
          wave.point_eqs = '';
        }

        preset.waves[i] = _.assign(preset.waves[i], wave);
      }
      /* eslint-enable no-param-reassign, no-new-func */
    }
    this.renderer.loadPreset(preset, blendTime);
  }

  loadExtraImages (imageData) {
    this.renderer.loadExtraImages(imageData);
  }

  setRendererSize (width, height, opts = {}) {
    this.renderer.setRendererSize(width, height, opts);
  }

  render () {
    this.renderer.render();
  }
}
