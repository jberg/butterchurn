import Utils from '../utils';

export default class PresetEquationRunnerWASM {
  constructor (preset, globalVars, opts) {
    this.preset = preset;

    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.qs = Utils.range(1, 33).map((x) => `q${x}`);
    this.ts = Utils.range(1, 9).map((x) => `t${x}`);
    this.regs = Utils.range(100).map((x) => {
      if (x < 10) {
        return `reg0${x}`;
      }
      return `reg${x}`;
    });

    this.frameKeys = [
      'decay',
      'wave_a',
      'wave_r',
      'wave_g',
      'wave_b',
      'wave_x',
      'wave_y',
      'wave_scale',
      'wave_smoothing',
      'wave_mode',
      'old_wave_mode',
      'wave_mystery',
      'ob_size',
      'ob_r',
      'ob_g',
      'ob_b',
      'ob_a',
      'ib_size',
      'ib_r',
      'ib_g',
      'ib_b',
      'ib_a',
      'mv_x',
      'mv_y',
      'mv_dx',
      'mv_dy',
      'mv_l',
      'mv_r',
      'mv_g',
      'mv_b',
      'mv_a',
      'echo_zoom',
      'echo_alpha',
      'echo_orient',
      'wave_dots',
      'wave_thick',
      'additivewave',
      'wave_brighten',
      'modwavealphabyvolume',
      'modwavealphastart',
      'modwavealphaend',
      'darken_center',
      'gammaadj',
      'warp',
      'warpanimspeed',
      'warpscale',
      'zoom',
      'zoomexp',
      'rot',
      'cx',
      'cy',
      'dx',
      'dy',
      'sx',
      'sy',
      'fshader',
      'wrap',
      'invert',
      'brighten',
      'darken',
      'solarize',
      'b1n',
      'b2n',
      'b3n',
      'b1x',
      'b2x',
      'b3x',
      'b1ed',
      // globals
      'frame',
      'time',
      'fps',
      'bass',
      'bass_att',
      'mid',
      'mid_att',
      'treb',
      'treb_att',
      'meshx',
      'meshy',
      'aspectx',
      'aspecty',
      'pixelsx',
      'pixelsy',
      ...this.qs,
    ];

    this.vertexKeys = [
      'warp',
      'zoom',
      'zoomexp',
      'cx',
      'cy',
      'sx',
      'sy',
      'dx',
      'dy',
      'rot'
    ];

    this.shapeFrameKeys = [
      'sides',
      'x',
      'y',
      'rad',
      'ang',
      'r',
      'g',
      'b',
      'a',
      'r2',
      'g2',
      'b2',
      'a2',
      'border_r',
      'border_g',
      'border_b',
      'border_a',
      'thickoutline',
      'textured',
      'tex_zoom',
      'tex_ang',
      'additive'
    ];

    this.waveFrameKeys = [
      'sep',
      'scaling',
      'spectrum',
      'smoothing',
      'usedots',
      'thick',
      'additive',
      'r',
      'g',
      'b',
      'a'
    ];

    this.wavePointKeys = [
      'x',
      'y',
      'r',
      'g',
      'b',
      'a',
      'usedots',
      'thick',
      'additive',
    ];

    this.initializeEquations(globalVars);
  }

  initializeEquations (globalVars) {
    this.runVertEQs = (this.preset.pixel_eqs !== '');

    this.mdVSQInit = null;
    this.mdVSRegs = null;
    this.mdVSFrame = null;
    this.mdVSQAfterFrame = null;

    const mdVSBase = {
      frame: globalVars.frame,
      time: globalVars.time,
      fps: globalVars.fps,
      bass: globalVars.bass,
      bass_att: globalVars.bass_att,
      mid: globalVars.mid,
      mid_att: globalVars.mid_att,
      treb: globalVars.treb,
      treb_att: globalVars.treb_att,
      meshx: this.mesh_width,
      meshy: this.mesh_height,
      aspectx: this.invAspectx,
      aspecty: this.invAspecty,
      pixelsx: this.texsizeX,
      pixelsy: this.texsizeY,
    };

    this.mdVS = Object.assign({}, this.preset.baseVals, mdVSBase);

    Utils.setWasm(this.preset.globals, this.mdVS, Object.keys(this.mdVS));

    this.rand_start = new Float32Array([
      Math.random(), Math.random(), Math.random(), Math.random()
    ]);
    this.rand_preset = new Float32Array([
      Math.random(), Math.random(), Math.random(), Math.random()
    ]);

    // const nonUserKeys = this.qs.concat(this.regs, Object.keys(this.mdVS));

    this.preset.init_eqs();

    // qs need to be initialized to there init values every frame
    this.mdVSQInit = this.getQVars();
    this.mdVSRegs = this.getRegVars();

    this.preset.frame_eqs();

    this.mdVSQAfterFrame = this.getQVars();
    this.mdVSRegs = this.getRegVars();

    this.mdVSTWaveInits = [];
    if (this.preset.waves && this.preset.waves.length > 0) {
      for (let i = 0; i < this.preset.waves.length; i++) {
        const wave = this.preset.waves[i];
        const baseVals = wave.baseVals;
        if (baseVals.enabled !== 0) {
          Utils.setWasm(this.preset.globals, baseVals, Object.keys(baseVals));
          if (wave.init_eqs) {
            wave.init_eqs();

            this.mdVSRegs = this.getRegVars();

            // base vals need to be reset
            Utils.setWasm(this.preset.globals, baseVals, Object.keys(baseVals));
          }
          this.mdVSTWaveInits.push(this.getTVars());
        } else {
          this.mdVSTWaveInits.push({});
        }
      }
    }

    this.mdVSTShapeInits = [];
    if (this.preset.shapes && this.preset.shapes.length > 0) {
      for (let i = 0; i < this.preset.shapes.length; i++) {
        const shape = this.preset.shapes[i];
        const baseVals = shape.baseVals;
        if (baseVals.enabled !== 0) {
          Utils.setWasm(this.preset.globals, baseVals, Object.keys(baseVals));
          if (shape.init_eqs) {
            shape.init_eqs();

            this.mdVSRegs = this.getRegVars();

            // base vals need to be reset
            Utils.setWasm(this.preset.globals, baseVals, Object.keys(baseVals));
          }
          this.mdVSTShapeInits.push(this.getTVars());
        } else {
          this.mdVSTShapeInits.push({});
        }
      }
    }
  }

  updatePreset (preset, globalVars) {
    this.preset = preset;
    this.initializeEquations(globalVars);
  }

  updateGlobals (opts) {
    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;
  }

  runFrameEquations (globalVars) {
    Utils.setWasm(this.preset.globals, globalVars, Object.keys(globalVars));

    this.preset.frame_eqs();

    this.mdVSQAfterFrame = this.getQVars();

    const mdVSFrame = Utils.pickWasm(this.preset.globals, this.frameKeys);
    mdVSFrame.rand_preset = this.rand_preset;
    mdVSFrame.rand_start = this.rand_start;

    return mdVSFrame;
  }

  runPixelEquations (mdVSVertex) {
    Utils.setWasm(this.preset.globals, mdVSVertex, Object.keys(mdVSVertex));
    this.preset.pixel_eqs();
    return Utils.pickWasm(this.preset.globals, this.vertexKeys);
  }

  getQVars () {
    return Utils.pickWasm(this.preset.globals, this.qs);
  }

  getTVars () {
    return Utils.pickWasm(this.preset.globals, this.ts);
  }

  getRegVars () {
    return Utils.pickWasm(this.preset.globals, this.regs);
  }

  runShapeFrameEquations (shapeIdx, mdVSShape) {
    Utils.setWasm(this.preset.globals, mdVSShape, Object.keys(mdVSShape));
    this.preset.shapes[shapeIdx].frame_eqs();
    return Utils.pickWasm(this.preset.globals, this.shapeFrameKeys);
  }

  runWaveFrameEquations (waveIdx, mdVSWave) {
    Utils.setWasm(this.preset.globals, mdVSWave, Object.keys(mdVSWave));
    this.preset.waves[waveIdx].frame_eqs();
    return Utils.pickWasm(this.preset.globals, this.waveFrameKeys);
  }

  runWavePointEquations (waveIdx, mdVSWaveFrame) {
    Utils.setWasm(this.preset.globals, mdVSWaveFrame, Object.keys(mdVSWaveFrame));
    this.preset.waves[waveIdx].point_eqs();
    return Utils.pickWasm(this.preset.globals, this.wavePointKeys);
  }
}
