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

    this.baseValsDefaults = {
      decay: 0.98,
      gammaadj: 2,
      echo_zoom: 2,
      echo_alpha: 0,
      echo_orient: 0,
      red_blue: 0,
      brighten: 0,
      darken: 0,
      wrap: 1,
      darken_center: 0,
      solarize: 0,
      invert: 0,
      fshader: 0,
      b1n: 0,
      b2n: 0,
      b3n: 0,
      b1x: 1,
      b2x: 1,
      b3x: 1,
      b1ed: 0.25,
      wave_mode: 0,
      additivewave: 0,
      wave_dots: 0,
      wave_thick: 0,
      wave_a: 0.8,
      wave_scale: 1,
      wave_smoothing: 0.75,
      wave_mystery: 0,
      modwavealphabyvolume: 0,
      modwavealphastart: 0.75,
      modwavealphaend: 0.95,
      wave_r: 1,
      wave_g: 1,
      wave_b: 1,
      wave_x: 0.5,
      wave_y: 0.5,
      wave_brighten: 1,
      mv_x: 12,
      mv_y: 9,
      mv_dx: 0,
      mv_dy: 0,
      mv_l: 0.9,
      mv_r: 1,
      mv_g: 1,
      mv_b: 1,
      mv_a: 1,
      warpanimspeed: 1,
      warpscale: 1,
      zoomexp: 1,
      zoom: 1,
      rot: 0,
      cx: 0.5,
      cy: 0.5,
      dx: 0,
      dy: 0,
      warp: 1,
      sx: 1,
      sy: 1,
      ob_size: 0.01,
      ob_r: 0,
      ob_g: 0,
      ob_b: 0,
      ob_a: 0,
      ib_size: 0.01,
      ib_r: 0.25,
      ib_g: 0.25,
      ib_b: 0.25,
      ib_a: 0,
    };

    this.shapeBaseValsDefaults = {
      enabled: 0,
      sides: 4,
      additive: 0,
      thickoutline: 0,
      textured: 0,
      num_inst: 1,
      tex_zoom: 1,
      tex_ang: 0,
      x: 0.5,
      y: 0.5,
      rad: 0.1,
      ang: 0,
      r: 1,
      g: 0,
      b: 0,
      a: 1,
      r2: 0,
      g2: 1,
      b2: 0,
      a2: 0,
      border_r: 1,
      border_g: 1,
      border_b: 1,
      border_a: 0.1,
    };

    this.waveBaseValsDefaults = {
      enabled: 0,
      samples: 512,
      sep: 0,
      scaling: 1,
      smoothing: 0.5,
      r: 1,
      g: 1,
      b: 1,
      a: 1,
      spectrum: 0,
      usedots: 0,
      thick: 0,
      additive: 0,
    };

    this.renderer = new Renderer(gl, this.audio, opts);
  }

  connectAudio (audioNode) {
    this.audioNode = audioNode;
    this.audio.connectAudio(audioNode);
  }

  disconnectAudio (audioNode) {
    this.audio.disconnectAudio(audioNode);
  }

  loadPreset (presetMap, blendTime) {
    const preset = Object.assign({}, presetMap);
    preset.baseVals = Object.assign({}, this.baseValsDefaults, preset.baseVals);
    for (let i = 0; i < preset.shapes.length; i++) {
      preset.shapes[i].baseVals = Object.assign({}, this.shapeBaseValsDefaults,
                                                    preset.shapes[i].baseVals);
    }

    for (let i = 0; i < preset.waves.length; i++) {
      preset.waves[i].baseVals = Object.assign({}, this.waveBaseValsDefaults,
                                                   preset.waves[i].baseVals);
    }

    if (typeof preset.init_eqs !== 'function') {
      /* eslint-disable no-param-reassign, no-new-func */
      preset.init_eqs = new Function('a', `${preset.init_eqs_str} return a;`);
      preset.frame_eqs = new Function('a', `${preset.frame_eqs_str} return a;`);
      if (preset.pixel_eqs_str && preset.pixel_eqs_str !== '') {
        preset.pixel_eqs = new Function('a', `${preset.pixel_eqs_str} return a;`);
      } else {
        preset.pixel_eqs = '';
      }

      for (let i = 0; i < preset.shapes.length; i++) {
        if (preset.shapes[i].baseVals.enabled !== 0) {
          preset.shapes[i] = Object.assign({}, preset.shapes[i], {
            init_eqs: new Function('a', `${preset.shapes[i].init_eqs_str} return a;`),
            frame_eqs: new Function('a', `${preset.shapes[i].frame_eqs_str} return a;`),
          });
        }
      }

      for (let i = 0; i < preset.waves.length; i++) {
        if (preset.waves[i].baseVals.enabled !== 0) {
          const wave = {
            init_eqs: new Function('a', `${preset.waves[i].init_eqs_str} return a;`),
            frame_eqs: new Function('a', `${preset.waves[i].frame_eqs_str} return a;`),
          };

          if (preset.waves[i].point_eqs_str && preset.waves[i].point_eqs_str !== '') {
            wave.point_eqs = new Function('a', `${preset.waves[i].point_eqs_str} return a;`);
          } else {
            wave.point_eqs = '';
          }

          preset.waves[i] = Object.assign({}, preset.waves[i], wave);
        }
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

  setInternalMeshSize (width, height) {
    this.renderer.setInternalMeshSize(width, height);
  }

  setOutputAA (useAA) {
    this.renderer.setOutputAA(useAA);
  }

  render () {
    this.renderer.render();
  }
}
