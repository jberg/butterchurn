import AudioProcessor from './audio/audioProcessor';
import Renderer from './rendering/renderer';

export default class Visualizer {
  constructor (audioContext, canvas, opts) {
    this.audio = new AudioProcessor(audioContext);

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
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
    this.renderer.loadPreset(preset, blendTime);
  }

  setRendererSize (width, height) {
    this.renderer.setRendererSize(width, height);
  }

  setRendererAndTextureSize (width, height, textureWidth, textureHeight) {
    this.renderer.setRendererAndTextureSize(width, height, textureWidth, textureHeight);
  }

  render () {
    this.renderer.render();
  }
}
