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

  generateWaveform (timeArrayL, timeArrayR, freqArrayL, freqArrayR,
                    globalVars, presetEquationRunner, waveEqs, alphaMult) {
    if (waveEqs.baseVals.enabled !== 0 && timeArrayL.length > 0) {
      const mdVSWave = Object.assign({},
                                     presetEquationRunner.mdVSWaves[this.index],
                                     presetEquationRunner.mdVSFrameMapWaves[this.index],
                                     presetEquationRunner.mdVSQAfterFrame,
                                     presetEquationRunner.mdVSTWaveInits[this.index],
                                     globalVars);

      let mdVSWaveFrame = waveEqs.frame_eqs(mdVSWave);

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

      if (this.samples >= 2 || (usedots !== 0 && this.samples >= 1)) {
        const useSpectrum = (spectrum !== 0);
        const scale = (useSpectrum ? 0.15 : 0.004) * scaling * waveScale;
        const pointsLeft = useSpectrum ? freqArrayL : timeArrayL;
        const pointsRight = useSpectrum ? freqArrayR : timeArrayR;

        const j0 = useSpectrum ? 0 : Math.floor(((maxSamples - this.samples) / 2) - (sep / 2));
        const j1 = useSpectrum ? 0 : Math.floor(((maxSamples - this.samples) / 2) + (sep / 2));
        const t = useSpectrum ? ((maxSamples - sep) / this.samples) : 1;
        const mix1 = (smoothing * 0.98) ** 0.5;
        const mix2 = 1 - mix1;

        // Milkdrop smooths waveform forward, backward and then scales
        this.pointsData[0][0] = pointsLeft[j0];
        this.pointsData[1][0] = pointsRight[j1];
        for (let j = 1; j < this.samples; j++) {
          const left = pointsLeft[Math.floor((j * t) + j0)];
          const right = pointsRight[Math.floor((j * t) + j1)];
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
        const mdVSNewFrameMapWave = Utils.pick(mdVSWaveFrame, mdvsUserKeysWave);

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

  drawCustomWaveform (blendProgress, timeArrayL, timeArrayR, freqArrayL, freqArrayR,
                      globalVars, presetEquationRunner, waveEqs) {
    if (waveEqs && this.generateWaveform(timeArrayL, timeArrayR, freqArrayL, freqArrayR,
                                         globalVars, presetEquationRunner, waveEqs,
                                         blendProgress)) {
      this.gl.useProgram(this.shaderProgram);

      const waveUseDots = (this.mdVSWaveFrame.usedots !== 0);
      const waveThick = (this.mdVSWaveFrame.thick !== 0);
      const waveAdditive = (this.mdVSWaveFrame.additive !== 0);

      let positions;
      let colors;
      let numVerts;
      if (!waveUseDots) {
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
      if (waveUseDots) {
        if (waveThick) {
          this.gl.uniform1f(this.sizeLoc, 2 + (this.texsizeX >= 1024 ? 1 : 0));
        } else {
          this.gl.uniform1f(this.sizeLoc, 1 + (this.texsizeX >= 1024 ? 1 : 0));
        }
      } else {
        this.gl.uniform1f(this.sizeLoc, 1);
        if (waveThick) {
          instances = 4;
        }
      }

      if (waveAdditive) {
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
      } else {
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      }

      const drawMode = waveUseDots ? this.gl.POINTS : this.gl.LINE_STRIP;

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
