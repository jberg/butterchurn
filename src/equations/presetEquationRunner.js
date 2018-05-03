import _ from 'lodash';
import Utils from '../utils';

export default class PresetEquationRunner {
  constructor (preset, opts) {
    this.preset = preset;

    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.qs = _.map(_.range(1, 33), (x) => `q${x}`);
    this.ts = _.map(_.range(1, 9), (x) => `t${x}`);
    this.regs = _.map(_.range(0, 100), (x) => {
      if (x < 10) {
        return `reg0${x}`;
      }
      return `reg${x}`;
    });
    this.megabuf = new Array(1048576).fill(0);
    this.gmegabuf = new Array(1048576).fill(0);

    this.frameNum = 0;
    this.time = 0;

    this.initializeEquations();
  }

  initializeEquations () {
    this.runVertEQs = (this.preset.pixel_eqs !== '');

    this.mdVSQInit = null;
    this.mdVSFrame = null;
    this.mdVSUserKeys = null;
    this.mdVSFrameMap = null;

    this.mdVSShapes = null;
    this.mdVSUserKeysShapes = null;
    this.mdVSFrameMapShapes = null;

    this.mdVSWaves = null;
    this.mdVSUserKeysWaves = null;
    this.mdVSFrameMapWaves = null;

    this.mdVSQAfterFrame = null;

    this.mdVS = _.clone(this.preset.baseVals);

    const mdVSBase = {
      bass: 1,
      bass_att: 1,
      mid: 1,
      mid_att: 1,
      treb: 1,
      treb_att: 1,
      megabuf: this.megabuf,
      gmegabuf: this.gmegabuf,
    };
    this.mdVSBaseKeys = _.keys(mdVSBase);

    this.mdVS = _.extend(this.mdVS, mdVSBase);

    // hacks to make sure we have all the variables we should
    if (!Object.prototype.hasOwnProperty.call(this.mdVS, 'tex_filt')) this.mdVS.tex_filt = 1;
    if (!Object.prototype.hasOwnProperty.call(this.mdVS, 'fshader')) this.mdVS.fshader = 0.0;
    if (!Object.prototype.hasOwnProperty.call(this.mdVS, 'additivewave')) {
      this.mdVS.additivewave = 0;
    }

    this.mdVS.rand_start = new Float32Array([
      Math.random(), Math.random(), Math.random(), Math.random()
    ]);
    this.mdVS.frame = this.frameNum;
    this.mdVS.fps = 45;
    this.mdVS.time = this.time;
    this.mdVS.rand_preset = new Float32Array([
      Math.random(), Math.random(), Math.random(), Math.random()
    ]);
    this.mdVS.meshx = this.mesh_width;
    this.mdVS.meshy = this.mesh_height;
    this.mdVS.aspectx = this.invAspectx;
    this.mdVS.aspecty = this.invAspecty;
    this.mdVS.pixelsx = this.texsizeX;
    this.mdVS.pixelsy = this.texsizeY;

    const nonUserKeys = _.concat(this.qs, this.ts, this.regs,
                                 _.keys(this.mdVS), ['megabuf', 'gmegabuf']);

    const origBaseVals = _.omit(Utils.cloneVars(this.mdVS),
                                _.concat(this.qs, this.regs, ['megabuf', 'gmegabuf']));
    this.mdVS = this.preset.init_eqs(Utils.cloneVars(this.mdVS));

    // Only qs can be written during init
    this.mdVS = _.extend(this.mdVS, origBaseVals);

    // qs need to be initialized to there init values every frame
    this.mdVSQInit = _.pick(this.mdVS, this.qs);

    this.mdVSFrame = this.preset.frame_eqs(Utils.cloneVars(this.mdVS));

    // user vars need to be copied between frames
    this.mdVSUserKeys = _.keys(_.omit(this.mdVS, nonUserKeys));

    // Determine vars to carry over between frames
    this.mdVSFrameMap = _.pick(this.mdVS, this.mdVSUserKeys);

    // qs for shapes
    this.mdVSQAfterFrame = _.pick(this.mdVSFrame, this.qs);

    const baseVars = _.pick(this.mdVSFrame, this.mdVSBaseKeys);

    this.mdVSShapes = [];
    this.mdVSTShapeInits = [];
    this.mdVSUserKeysShapes = [];
    this.mdVSFrameMapShapes = [];
    if (this.preset.shapes && this.preset.shapes.length > 0) {
      for (let i = 0; i < this.preset.shapes.length; i++) {
        const shape = this.preset.shapes[i];
        const baseVals = shape.baseVals;
        if (baseVals.enabled > 0) {
          let mdVSShape = _.extend(_.clone(baseVals), baseVars);
          mdVSShape.frame = this.frameNum;
          mdVSShape.fps = 45;
          mdVSShape.time = this.time;

          mdVSShape = _.extend(mdVSShape, this.mdVSQAfterFrame);

          const nonUserShapeKeys = _.concat(this.qs, this.ts, _.keys(mdVSShape), ['num_inst']);

          if (shape.init_eqs) {
            mdVSShape = shape.init_eqs(mdVSShape);

            // Only qs and ts can be written during init
            mdVSShape = _.extend(mdVSShape, baseVals);
          }
          this.mdVSShapes.push(mdVSShape);
          this.mdVSTShapeInits.push(_.pick(mdVSShape, this.ts));

          this.mdVSUserKeysShapes.push(_.keys(_.omit(mdVSShape, nonUserShapeKeys)));
          this.mdVSFrameMapShapes.push(_.pick(mdVSShape, this.mdVSUserKeysShapes[i]));
        } else {
          this.mdVSShapes.push({});
          this.mdVSTShapeInits.push({});

          this.mdVSUserKeysShapes.push([]);
          this.mdVSFrameMapShapes.push({});
        }
      }
    }

    this.mdVSWaves = [];
    this.mdVSTWaveInits = [];
    this.mdVSUserKeysWaves = [];
    this.mdVSFrameMapWaves = [];
    if (this.preset.waves && this.preset.waves.length > 0) {
      for (let i = 0; i < this.preset.waves.length; i++) {
        const wave = this.preset.waves[i];
        const baseVals = wave.baseVals;
        if (baseVals.enabled > 0) {
          let mdVSWave = _.extend(_.clone(baseVals), baseVars);
          mdVSWave.frame = this.frameNum;
          mdVSWave.fps = 45;
          mdVSWave.time = this.time;

          mdVSWave = _.extend(mdVSWave, this.mdVSQAfterFrame);

          const nonUserWaveKeys = _.concat(this.qs, this.ts, _.keys(mdVSWave));

          if (wave.init_eqs) {
            mdVSWave = wave.init_eqs(mdVSWave);

            // Only qs and ts can be written during init
            mdVSWave = _.extend(mdVSWave, baseVals);
          }
          this.mdVSWaves.push(mdVSWave);
          this.mdVSTWaveInits.push(_.pick(mdVSWave, this.ts));

          this.mdVSUserKeysWaves.push(_.keys(_.omit(mdVSWave, nonUserWaveKeys)));
          this.mdVSFrameMapWaves.push(_.pick(mdVSWave, this.mdVSUserKeysWaves[i]));
        } else {
          this.mdVSWaves.push({});
          this.mdVSTWaveInits.push({});

          this.mdVSUserKeysWaves.push([]);
          this.mdVSFrameMapWaves.push({});
        }
      }
    }
  }

  updatePreset (preset) {
    this.preset = preset;
    this.initializeEquations();
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
    this.frameNum = globalVars.frame;
    this.time = globalVars.time;
    this.fps = globalVars.fps;

    this.mdVS = _.extend(Utils.cloneVars(this.mdVS), globalVars);
    this.mdVSFrame = Utils.cloneVars(this.mdVS);
    this.mdVSFrame.time = this.time;
    this.mdVSFrame.x = 0;
    this.mdVSFrame.y = 0;
    this.mdVSFrame.rad = 0;
    this.mdVSFrame.ang = 0;

    // set qs and user vars
    this.mdVSFrame = _.extend(this.mdVSFrame, this.mdVSQInit);
    this.mdVSFrame = _.extend(this.mdVSFrame, this.mdVSFrameMap);

    // run eqs
    this.mdVSFrame = this.preset.frame_eqs(this.mdVSFrame);

    // save qs and user vars
    this.mdVSFrameMap = _.pick(this.mdVSFrame, this.mdVSUserKeys);
    this.mdVSQAfterFrame = _.pick(this.mdVSFrame, this.qs);
  }
}
