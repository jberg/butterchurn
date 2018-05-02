import _ from 'lodash';
import Utils from '../../utils';
import ShaderUtils from '../shaders/shaderUtils';
import WaveUtils from './waveUtils';

export default class CustomWaveform {
  constructor (index, gl, opts) {
    this.index = index;
    this.gl = gl;

    const maxSamples = 512;
    this.pointsData = [new Float32Array(maxSamples), new Float32Array(maxSamples)];
    this.positions = new Float32Array(maxSamples * 3);
    this.colors = new Float32Array(maxSamples * 4);
    this.smoothedPositions = new Float32Array(((maxSamples * 2) - 1) * 3);
    this.smoothedColors = new Float32Array(((maxSamples * 2) - 1) * 4);

    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.positionVertexBuf = this.gl.createBuffer();
    this.colorVertexBuf = this.gl.createBuffer();

    this.floatPrecision = ShaderUtils.getFragmentFloatPrecision(this.gl);
    this.createShader();
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

  createShader () {
    this.shaderProgram = this.gl.createProgram();

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertShader, `#version 300 es
                                      uniform float uSize;
                                      uniform vec2 thickOffset;
                                      in vec3 aPos;
                                      in vec4 aColor;
                                      out vec4 vColor;
                                      void main(void) {
                                        vColor = aColor;
                                        gl_PointSize = uSize;
                                        gl_Position = vec4(aPos + vec3(thickOffset, 0.0), 1.0);
                                      }`);
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragShader, `#version 300 es
                                      precision ${this.floatPrecision} float;
                                      precision highp int;
                                      precision mediump sampler2D;
                                      in vec4 vColor;
                                      out vec4 fragColor;
                                      void main(void) {
                                        fragColor = vColor;
                                      }`);
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.shaderProgram, vertShader);
    this.gl.attachShader(this.shaderProgram, fragShader);
    this.gl.linkProgram(this.shaderProgram);

    this.aPosLocation = this.gl.getAttribLocation(this.shaderProgram, 'aPos');
    this.aColorLocation = this.gl.getAttribLocation(this.shaderProgram, 'aColor');

    this.sizeLoc = this.gl.getUniformLocation(this.shaderProgram, 'uSize');
    this.thickOffsetLoc = this.gl.getUniformLocation(this.shaderProgram, 'thickOffset');
  }

  static repairPerVertexEQs (m, r) {
    if (!_.isEmpty(r)) {
      _.forEach(r, (value, key) => {
        // eslint-disable-next-line no-param-reassign
        m[key] = value;
      });
    }
    return m;
  }

  generateWaveform (timeArrayL, timeArrayR, freqArrayL, freqArrayR,
                    globalVars, presetEquationRunner, waveEqs, alphaMult) {
    if (waveEqs.baseVals.enabled === 1 && timeArrayL.length > 0) {
      let mdVSWave = Utils.cloneVars(presetEquationRunner.mdVSWaves[this.index]);
      const mdVSTInit = presetEquationRunner.mdVSTWaveInits[this.index];

      const repairKeys = mdVSWave.rkeys || [];
      mdVSWave = _.extend(mdVSWave, presetEquationRunner.mdVSQAfterFrame);
      mdVSWave = _.extend(mdVSWave, mdVSTInit);

      mdVSWave = _.extend(mdVSWave, globalVars);
      mdVSWave.time = presetEquationRunner.time;
      mdVSWave.frame = presetEquationRunner.frameNum;
      mdVSWave.meshx = this.mesh_width;
      mdVSWave.meshy = this.mesh_height;
      mdVSWave.aspectx = this.invAspectx;
      mdVSWave.aspecty = this.invAspecty;
      mdVSWave.pixelsx = this.texsizeX;
      mdVSWave.pixelsy = this.texsizeY;

      mdVSWave = _.extend(mdVSWave, presetEquationRunner.mdVSFrameMapWaves[this.index]);

      let mdVSWaveFrame = waveEqs.frame_eqs(mdVSWave);

      const repairMap = {};
      for (let j = 0; j < repairKeys.length; j++) {
        const k = repairKeys[j];
        // let user keys flow between wave instances
        if (!_.includes(presetEquationRunner.mdVSUserKeysWaves[this.index], k) &&
            !_.includes(presetEquationRunner.qs, k) &&
            !_.includes(presetEquationRunner.ts, k)) {
          repairMap[k] = mdVSWaveFrame[k];
        }
      }

      const maxSamples = 512;
      if (Object.prototype.hasOwnProperty.call(mdVSWaveFrame, 'samples')) {
        this.samples = mdVSWaveFrame.samples;
      } else {
        this.samples = maxSamples;
      }

      if (this.samples > maxSamples) {
        this.samples = maxSamples;
      }
      this.samples = Math.floor(this.samples);

      const sep = Math.floor(mdVSWaveFrame.sep);
      const scaling = mdVSWaveFrame.scaling;
      const spectrum = mdVSWaveFrame.spectrum;
      const smoothing = mdVSWaveFrame.smoothing;
      const usedots = mdVSWaveFrame.usedots;

      const frameR = mdVSWaveFrame.r;
      const frameG = mdVSWaveFrame.g;
      const frameB = mdVSWaveFrame.b;
      const frameA = mdVSWaveFrame.a;

      const waveScale = presetEquationRunner.mdVS.wave_scale;

      this.samples -= sep;

      if (this.samples >= 2 || (usedots && this.samples >= 1)) {
        const scale = ((spectrum > 0.0) ? 0.15 : 0.004) * scaling * waveScale;
        const pointsLeft = (spectrum > 0.0) ? freqArrayL : timeArrayL;
        const pointsRight = (spectrum > 0.0) ? freqArrayR : timeArrayR;

        const j0 = (spectrum > 0.0) ? 0 : Math.floor(((maxSamples - this.samples) / 2) - (sep / 2));
        const j1 = (spectrum > 0.0) ? 0 : Math.floor(((maxSamples - this.samples) / 2) + (sep / 2));
        const t = (spectrum > 0.0) ? ((maxSamples - sep) / this.samples) : 1;
        const mix1 = (smoothing * 0.98) ** 0.5;
        const mix2 = 1 - mix1;

        // Milkdrop smooths waveform forward, backward and then scales
        this.pointsData[0][0] = pointsLeft[j0];
        this.pointsData[1][0] = pointsRight[j1 + 64]; // offset helps with mono inputs
        for (let j = 1; j < this.samples; j++) {
          const left = pointsLeft[Math.floor((j * t) + j0)];
          const right = pointsRight[Math.floor((j * t) + j1 + 64) % pointsRight.length];
          this.pointsData[0][j] = (left * mix2) + (this.pointsData[0][j - 1] * mix1);
          this.pointsData[1][j] = (right * mix2) + (this.pointsData[1][j - 1] * mix1);
        }
        for (let j = this.samples - 2; j >= 0; j--) {
          this.pointsData[0][j] = (this.pointsData[0][j] * mix2) +
                                  (this.pointsData[0][j + 1] * mix1);
          this.pointsData[1][j] = (this.pointsData[1][j] * mix2) +
                                  (this.pointsData[1][j + 1] * mix1);
        }
        for (let j = 0; j < this.samples; j++) {
          this.pointsData[0][j] *= scale;
          this.pointsData[1][j] *= scale;
        }

        for (let j = 0; j < this.samples; j++) {
          mdVSWaveFrame = CustomWaveform.repairPerVertexEQs(mdVSWaveFrame, repairMap);

          const value1 = this.pointsData[0][j];
          const value2 = this.pointsData[1][j];

          mdVSWaveFrame.sample = j / (this.samples - 1);
          mdVSWaveFrame.value1 = value1;
          mdVSWaveFrame.value2 = value2;
          mdVSWaveFrame.x = 0.5 + value1;
          mdVSWaveFrame.y = 0.5 + value2;
          mdVSWaveFrame.r = frameR;
          mdVSWaveFrame.g = frameG;
          mdVSWaveFrame.b = frameB;
          mdVSWaveFrame.a = frameA;

          if (waveEqs.point_eqs !== '') {
            mdVSWaveFrame = waveEqs.point_eqs(mdVSWaveFrame);
          }

          const x = ((mdVSWaveFrame.x * 2) - 1) * this.invAspectx;
          const y = ((mdVSWaveFrame.y * -2) + 1) * this.invAspecty;
          const r = mdVSWaveFrame.r;
          const g = mdVSWaveFrame.g;
          const b = mdVSWaveFrame.b;
          const a = mdVSWaveFrame.a;

          this.positions[(j * 3) + 0] = x;
          this.positions[(j * 3) + 1] = y;
          this.positions[(j * 3) + 2] = 0;

          this.colors[(j * 4) + 0] = r;
          this.colors[(j * 4) + 1] = g;
          this.colors[(j * 4) + 2] = b;
          this.colors[(j * 4) + 3] = a * alphaMult;
        }

        // this needs to be after per point (check fishbrain - witchcraft)
        const mdvsUserKeysWave = presetEquationRunner.mdVSUserKeysWaves[this.index];
        const mdVSNewFrameMapWave = _.pick(mdVSWaveFrame, mdvsUserKeysWave);

        // eslint-disable-next-line no-param-reassign
        presetEquationRunner.mdVSFrameMapWaves[this.index] = mdVSNewFrameMapWave;

        this.mdVSWaveFrame = mdVSWaveFrame;

        if (usedots === 0) {
          WaveUtils.smoothWaveAndColor(this.positions, this.colors,
                                       this.smoothedPositions, this.smoothedColors,
                                       this.samples);
        }

        return true;
      }
    }

    return false;
  }

  drawCustomWaveform (blending, blendProgress, timeArrayL, timeArrayR, freqArrayL, freqArrayR,
                      globalVars, presetEquationRunner, waveEqs,
                      prevPresetEquationRunner, prevWaveEqs) {
    const numReps = blending ? 2 : 1;
    for (let rep = 0; rep < numReps; rep++) {
      let alphaMult = 1;
      if (numReps === 2) {
        if (rep === 0) {
          alphaMult = blendProgress;
        } else {
          alphaMult = 1 - blendProgress;
        }
      }

      const currPresetEquationRunner = (rep === 0) ? presetEquationRunner :
                                                     prevPresetEquationRunner;
      const currWaveEqs = (rep === 0) ? waveEqs : prevWaveEqs;
      if (currWaveEqs && this.generateWaveform(timeArrayL, timeArrayR, freqArrayL, freqArrayR,
                                               globalVars, currPresetEquationRunner, currWaveEqs,
                                               alphaMult)) {
        this.gl.useProgram(this.shaderProgram);

        let positions;
        let colors;
        let numVerts;
        const usedots = this.mdVSWaveFrame.usedots;
        if (usedots === 0) {
          positions = this.smoothedPositions;
          colors = this.smoothedColors;
          numVerts = (this.samples * 2) - 1;
        } else {
          positions = this.positions;
          colors = this.colors;
          numVerts = this.samples;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.aPosLocation, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.aPosLocation);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorVertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.aColorLocation, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.aColorLocation);

        let instances = 1;
        const thick = this.mdVSWaveFrame.thick;
        if (usedots > 0.0) {
          if (thick > 0.0) {
            this.gl.uniform1f(this.sizeLoc, 2 + (this.texsizeX >= 1024 ? 1 : 0));
          } else {
            this.gl.uniform1f(this.sizeLoc, 1 + (this.texsizeX >= 1024 ? 1 : 0));
          }
        } else {
          this.gl.uniform1f(this.sizeLoc, 1);
          if (thick > 0.0) {
            instances = 4;
          }
        }

        if (this.mdVSWaveFrame.additive > 0) {
          this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        } else {
          this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        }

        const drawMode = (usedots > 0) ? this.gl.POINTS : this.gl.LINE_STRIP;

        // TODO: use drawArraysInstanced
        for (let i = 0; i < instances; i++) {
          const offset = 2;
          if (i === 0) {
            this.gl.uniform2fv(this.thickOffsetLoc, [0, 0]);
          } else if (i === 1) {
            this.gl.uniform2fv(this.thickOffsetLoc, [offset / this.texsizeX, 0]);
          } else if (i === 2) {
            this.gl.uniform2fv(this.thickOffsetLoc, [0, offset / this.texsizeY]);
          } else if (i === 3) {
            this.gl.uniform2fv(this.thickOffsetLoc, [
              offset / this.texsizeX, offset / this.texsizeY
            ]);
          }

          this.gl.drawArrays(drawMode, 0, numVerts);
        }
      }
    }
  }
}
