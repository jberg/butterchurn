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

    this.initializeEquations(globalVars);
  }

  initializeEquations (globalVars) {
    this.runVertEQs = (this.preset.pixel_eqs !== '');

    this.mdVSQInit = null;
    this.mdVSRegs = null;
    this.mdVSFrame = null;
    this.mdVSUserKeys = null;

    this.mdVSShapes = null;
    this.mdVSUserKeysShapes = null;
    this.mdVSFrameMapShapes = null;

    this.mdVSWaves = null;
    this.mdVSUserKeysWaves = null;
    this.mdVSFrameMapWaves = null;

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

    Utils.setWasm(this.preset.globals, mdVSBase, Object.keys(mdVSBase));

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

    // user vars need to be copied between frames
    // this.mdVSUserKeys = Object.keys(Utils.omit(this.mdVSFrame, nonUserKeys));
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

    const mdVSFrame = Utils.pickWasm(this.preset.globals, Object.keys(this.preset.baseVals));
    mdVSFrame.rand_preset = this.rand_preset;
    mdVSFrame.rand_start = this.rand_start;

    return mdVSFrame;
  }

  runPixelEquations (mdVSVertex) {
    Utils.setWasm(this.preset.globals, mdVSVertex, Object.keys(mdVSVertex));
    this.preset.pixel_eqs();
    return Utils.pickWasm(this.preset.globals, [
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
    ]);
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
    return this.preset.shapes[shapeIdx].frame_eqs(mdVSShape);
  }

  runWaveFrameEquations (waveIdx, mdVSWave) {
    return this.preset.waves[waveIdx].frame_eqs(mdVSWave);
  }

  runWavePointEquations (waveIdx, mdVSWaveFrame) {
    return this.preset.waves[waveIdx].point_eqs(mdVSWaveFrame);
  }
}
