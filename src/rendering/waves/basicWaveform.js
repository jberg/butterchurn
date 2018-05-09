import ShaderUtils from '../shaders/shaderUtils';
import WaveUtils from './waveUtils';

export default class BasicWaveform {
  constructor (gl, opts = {}) {
    this.gl = gl;

    const numAudioSamples = 512;
    this.positions = new Float32Array(numAudioSamples * 3);
    this.positions2 = new Float32Array(numAudioSamples * 3);
    this.oldPositions = new Float32Array(numAudioSamples * 3);
    this.oldPositions2 = new Float32Array(numAudioSamples * 3);
    this.smoothedPositions = new Float32Array(((numAudioSamples * 2) - 1) * 3);
    this.smoothedPositions2 = new Float32Array(((numAudioSamples * 2) - 1) * 3);
    this.color = [0, 0, 0, 1];

    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.floatPrecision = ShaderUtils.getFragmentFloatPrecision(this.gl);
    this.createShader();

    this.vertexBuf = this.gl.createBuffer();
  }

  updateGlobals (opts) {
    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;
  }

  createShader () {
    this.shaderProgram = this.gl.createProgram();

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertShader, `#version 300 es
                                      in vec3 aPos;
                                      uniform vec2 thickOffset;
                                      void main(void) {
                                        gl_Position = vec4(aPos + vec3(thickOffset, 0.0), 1.0);
                                      }`);
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragShader, `#version 300 es
                                      precision ${this.floatPrecision} float;
                                      precision highp int;
                                      precision mediump sampler2D;
                                      out vec4 fragColor;
                                      uniform vec4 u_color;
                                      void main(void) {
                                        fragColor = u_color;
                                      }`);
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.shaderProgram, vertShader);
    this.gl.attachShader(this.shaderProgram, fragShader);
    this.gl.linkProgram(this.shaderProgram);

    this.aPosLoc = this.gl.getAttribLocation(this.shaderProgram, 'aPos');

    this.colorLoc = this.gl.getUniformLocation(this.shaderProgram, 'u_color');
    this.thickOffsetLoc = this.gl.getUniformLocation(this.shaderProgram, 'thickOffset');
  }

  static processWaveform (timeArray, mdVSFrame) {
    const waveform = [];

    const scale = mdVSFrame.wave_scale / 128.0;
    const smooth = mdVSFrame.wave_smoothing;
    const smooth2 = scale * (1.0 - smooth);

    waveform.push(timeArray[0] * scale);
    for (let i = 1; i < timeArray.length; i++) {
      waveform.push((timeArray[i] * smooth2) + (waveform[i - 1] * smooth));
    }

    return waveform;
  }

  generateWaveform (blending, blendProgress, timeArrayL, timeArrayR, mdVSFrame) {
    let alpha = mdVSFrame.wave_a;
    const vol = (mdVSFrame.bass + mdVSFrame.mid + mdVSFrame.treb) / 3.0;

    if (vol > -0.01 && alpha > 0.001 && timeArrayL.length > 0) {
      const waveL = BasicWaveform.processWaveform(timeArrayL, mdVSFrame);
      const waveR = BasicWaveform.processWaveform(timeArrayR, mdVSFrame);

      const newWaveMode = Math.floor(mdVSFrame.wave_mode) % 8;
      const oldWaveMode = Math.floor(mdVSFrame.old_wave_mode) % 8;

      const wavePosX = (mdVSFrame.wave_x * 2.0) - 1.0;
      const wavePosY = (mdVSFrame.wave_y * 2.0) - 1.0;

      this.numVert = 0;
      this.oldNumVert = 0;

      const its = (blending && newWaveMode !== oldWaveMode) ? 2 : 1;
      for (let it = 0; it < its; it++) {
        const waveMode = (it === 0) ? newWaveMode : oldWaveMode;

        let fWaveParam2 = mdVSFrame.wave_mystery;
        if ((waveMode === 0 || waveMode === 1 || waveMode === 4) &&
            (fWaveParam2 < -1 || fWaveParam2 > 1)) {
          fWaveParam2 = (fWaveParam2 * 0.5) + 0.5;
          fWaveParam2 -= Math.floor(fWaveParam2);
          fWaveParam2 = Math.abs(fWaveParam2);
          fWaveParam2 = (fWaveParam2 * 2) - 1;
        }

        let numVert;
        let positions;
        let positions2;
        if (it === 0) {
          positions = this.positions;
          positions2 = this.positions2;
        } else {
          positions = this.oldPositions;
          positions2 = this.oldPositions2;
        }

        alpha = mdVSFrame.wave_a;
        if (waveMode === 0) {
          if (mdVSFrame.modwavealphabyvolume > 0) {
            const alphaDiff = (mdVSFrame.modwavealphaend - mdVSFrame.modwavealphastart);
            alpha *= (vol - mdVSFrame.modwavealphastart) / alphaDiff;
          }
          alpha = Math.clamp(alpha, 0, 1);

          numVert = Math.floor(waveL.length / 2) + 1;
          const numVertInv = 1.0 / (numVert - 1);
          const sampleOffset = Math.floor((waveL.length - numVert) / 2);
          for (let i = 0; i < (numVert - 1); i++) {
            let rad = 0.5 + (0.4 * waveR[i + sampleOffset]) + fWaveParam2;
            const ang = (i * numVertInv * 2 * Math.PI) + (mdVSFrame.time * 0.2);

            if (i < (numVert / 10)) {
              let mix = i / (numVert * 0.1);
              mix = 0.5 - (0.5 * Math.cos(mix * Math.PI));
              const rad2 = 0.5 + (0.4 * waveR[i + numVert + sampleOffset]) + fWaveParam2;
              rad = ((1.0 - mix) * rad2) + (rad * mix);
            }

            positions[(i * 3) + 0] = (rad * Math.cos(ang) * this.aspecty) + wavePosX;
            positions[(i * 3) + 1] = (rad * Math.sin(ang) * this.aspectx) + wavePosY;
            positions[(i * 3) + 2] = 0;
          }

          // connect the loop
          positions[((numVert - 1) * 3) + 0] = positions[0];
          positions[((numVert - 1) * 3) + 1] = positions[1];
          positions[((numVert - 1) * 3) + 2] = 0;
        } else if (waveMode === 1) {
          alpha *= 1.25;
          if (mdVSFrame.modwavealphabyvolume > 0) {
            const alphaDiff = (mdVSFrame.modwavealphaend - mdVSFrame.modwavealphastart);
            alpha *= (vol - mdVSFrame.modwavealphastart) / alphaDiff;
          }
          alpha = Math.clamp(alpha, 0, 1);

          numVert = Math.floor(waveL.length / 2);
          for (let i = 0; i < numVert; i++) {
            const rad = 0.53 + (0.43 * waveR[i]) + fWaveParam2;
            const ang = (waveL[i + 32] * 0.5 * Math.PI) + (mdVSFrame.time * 2.3);

            positions[(i * 3) + 0] = (rad * Math.cos(ang) * this.aspecty) + wavePosX;
            positions[(i * 3) + 1] = (rad * Math.sin(ang) * this.aspectx) + wavePosY;
            positions[(i * 3) + 2] = 0;
          }
        } else if (waveMode === 2) {
          if (this.texsizeX < 1024) {
            alpha *= 0.09;
          } else if (this.texsizeX >= 1024 && this.texsizeX < 2048) {
            alpha *= 0.11;
          } else {
            alpha *= 0.13;
          }

          if (mdVSFrame.modwavealphabyvolume > 0) {
            const alphaDiff = (mdVSFrame.modwavealphaend - mdVSFrame.modwavealphastart);
            alpha *= (vol - mdVSFrame.modwavealphastart) / alphaDiff;
          }
          alpha = Math.clamp(alpha, 0, 1);

          numVert = waveL.length;
          for (let i = 0; i < waveL.length; i++) {
            positions[(i * 3) + 0] = (waveR[i] * this.aspecty) + wavePosX;
            positions[(i * 3) + 1] = (waveL[(i + 32) % waveL.length] * this.aspectx) + wavePosY;
            positions[(i * 3) + 2] = 0;
          }
        } else if (waveMode === 3) {
          if (this.texsizeX < 1024) {
            alpha *= 0.15;
          } else if (this.texsizeX >= 1024 && this.texsizeX < 2048) {
            alpha *= 0.22;
          } else {
            alpha *= 0.33;
          }

          alpha *= 1.3;
          alpha *= mdVSFrame.treb * mdVSFrame.treb; // should be treb_imm

          if (mdVSFrame.modwavealphabyvolume > 0) {
            const alphaDiff = (mdVSFrame.modwavealphaend - mdVSFrame.modwavealphastart);
            alpha *= (vol - mdVSFrame.modwavealphastart) / alphaDiff;
          }
          alpha = Math.clamp(alpha, 0, 1);

          numVert = waveL.length;
          for (let i = 0; i < waveL.length; i++) {
            positions[(i * 3) + 0] = (waveR[i] * this.aspecty) + wavePosX;
            positions[(i * 3) + 1] = (waveL[(i + 32) % waveL.length] * this.aspectx) + wavePosY;
            positions[(i * 3) + 2] = 0;
          }
        } else if (waveMode === 4) {
          if (mdVSFrame.modwavealphabyvolume > 0) {
            const alphaDiff = (mdVSFrame.modwavealphaend - mdVSFrame.modwavealphastart);
            alpha *= (vol - mdVSFrame.modwavealphastart) / alphaDiff;
          }
          alpha = Math.clamp(alpha, 0, 1);

          numVert = waveL.length;
          if (numVert > (this.texsizeX / 3)) {
            numVert = Math.floor(this.texsizeX / 3);
          }
          const numVertInv = 1.0 / numVert;
          const sampleOffset = Math.floor((waveL.length - numVert) / 2);

          const w1 = 0.45 + (0.5 * ((fWaveParam2 * 0.5) + 0.5));
          const w2 = 1.0 - w1;
          for (let i = 0; i < numVert; i++) {
            let x = (2.0 * i * numVertInv) + (wavePosX - 1) +
                    (waveR[(i + 25 + sampleOffset) % waveL.length] * 0.44);
            let y = (waveL[i + sampleOffset] * 0.47) + wavePosY;

            // momentum
            if (i > 1) {
              x = (x * w2) + (w1 * ((positions[((i - 1) * 3) + 0] * 2.0) -
                                     positions[((i - 2) * 3) + 0]));
              y = (y * w2) + (w1 * ((positions[((i - 1) * 3) + 1] * 2.0) -
                                     positions[((i - 2) * 3) + 1]));
            }

            positions[(i * 3) + 0] = x;
            positions[(i * 3) + 1] = y;
            positions[(i * 3) + 2] = 0;
          }
        } else if (waveMode === 5) {
          if (this.texsizeX < 1024) {
            alpha *= 0.09;
          } else if (this.texsizeX >= 1024 && this.texsizeX < 2048) {
            alpha *= 0.11;
          } else {
            alpha *= 0.13;
          }

          if (mdVSFrame.modwavealphabyvolume > 0) {
            const alphaDiff = (mdVSFrame.modwavealphaend - mdVSFrame.modwavealphastart);
            alpha *= (vol - mdVSFrame.modwavealphastart) / alphaDiff;
          }
          alpha = Math.clamp(alpha, 0, 1);

          const cosRot = Math.cos(mdVSFrame.time * 0.3);
          const sinRot = Math.sin(mdVSFrame.time * 0.3);

          numVert = waveL.length;
          for (let i = 0; i < waveL.length; i++) {
            const ioff = (i + 32) % waveL.length;
            const x0 = (waveR[i] * waveL[ioff]) + (waveL[i] * waveR[ioff]);
            const y0 = (waveR[i] * waveR[i]) - (waveL[ioff] * waveL[ioff]);

            positions[(i * 3) + 0] = ((x0 * cosRot) - (y0 * sinRot)) * (this.aspecty + wavePosX);
            positions[(i * 3) + 1] = ((x0 * sinRot) + (y0 * cosRot)) * (this.aspectx + wavePosY);
            positions[(i * 3) + 2] = 0;
          }
        } else if (waveMode === 6 || waveMode === 7) {
          if (mdVSFrame.modwavealphabyvolume > 0) {
            const alphaDiff = (mdVSFrame.modwavealphaend - mdVSFrame.modwavealphastart);
            alpha *= (vol - mdVSFrame.modwavealphastart) / alphaDiff;
          }
          alpha = Math.clamp(alpha, 0, 1);

          numVert = Math.floor(waveL.length / 2);
          if (numVert > (this.texsizeX / 3)) {
            numVert = Math.floor(this.texsizeX / 3);
          }
          const sampleOffset = Math.floor((waveL.length - numVert) / 2);

          const ang = Math.PI * 0.5 * fWaveParam2;
          let dx = Math.cos(ang);
          let dy = Math.sin(ang);

          const edgex = [
            (wavePosX * Math.cos(ang + (Math.PI * 0.5))) - (dx * 3.0),
            (wavePosX * Math.cos(ang + (Math.PI * 0.5))) + (dx * 3.0)
          ];
          const edgey = [
            (wavePosX * Math.sin(ang + (Math.PI * 0.5))) - (dy * 3.0),
            (wavePosX * Math.sin(ang + (Math.PI * 0.5))) + (dy * 3.0)
          ];

          for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 4; j++) {
              let t;
              let bClip = false;

              switch (j) {
              case 0:
                if (edgex[i] > 1.1) {
                  t = (1.1 - edgex[1 - i]) / (edgex[i] - edgex[1 - i]);
                  bClip = true;
                }
                break;
              case 1:
                if (edgex[i] < -1.1) {
                  t = (-1.1 - edgex[1 - i]) / (edgex[i] - edgex[1 - i]);
                  bClip = true;
                }
                break;
              case 2:
                if (edgey[i] > 1.1) {
                  t = (1.1 - edgey[1 - i]) / (edgey[i] - edgey[1 - i]);
                  bClip = true;
                }
                break;
              case 3:
                if (edgey[i] < -1.1) {
                  t = (-1.1 - edgey[1 - i]) / (edgey[i] - edgey[1 - i]);
                  bClip = true;
                }
                break;
              default:
              }

              if (bClip) {
                const dxi = edgex[i] - edgex[1 - i];
                const dyi = edgey[i] - edgey[1 - i];
                edgex[i] = edgex[1 - i] + (dxi * t);
                edgey[i] = edgey[1 - i] + (dyi * t);
              }
            }
          }

          dx = (edgex[1] - edgex[0]) / numVert;
          dy = (edgey[1] - edgey[0]) / numVert;

          const ang2 = Math.atan2(dy, dx);
          const perpDx = Math.cos(ang2 + (Math.PI * 0.5));
          const perpDy = Math.sin(ang2 + (Math.PI * 0.5));

          if (waveMode === 6) {
            for (let i = 0; i < numVert; i++) {
              const sample = waveL[i + sampleOffset];
              positions[(i * 3) + 0] = edgex[0] + (dx * i) + (perpDx * 0.25 * sample);
              positions[(i * 3) + 1] = edgey[0] + (dy * i) + (perpDy * 0.25 * sample);
              positions[(i * 3) + 2] = 0;
            }
          } else if (waveMode === 7) {
            const sep = ((wavePosY * 0.5) + 0.5) ** 2;
            for (let i = 0; i < numVert; i++) {
              const sample = waveL[i + sampleOffset];
              positions[(i * 3) + 0] = edgex[0] + (dx * i) + (perpDx * ((0.25 * sample) + sep));
              positions[(i * 3) + 1] = edgey[0] + (dy * i) + (perpDy * ((0.25 * sample) + sep));
              positions[(i * 3) + 2] = 0;
            }

            for (let i = 0; i < numVert; i++) {
              const sample = waveR[i + sampleOffset];
              positions2[(i * 3) + 0] = edgex[0] + (dx * i) + (perpDx * ((0.25 * sample) - sep));
              positions2[(i * 3) + 1] = edgey[0] + (dy * i) + (perpDy * ((0.25 * sample) - sep));
              positions2[(i * 3) + 2] = 0;
            }
          }
        }

        if (it === 0) {
          this.positions = positions;
          this.positions2 = positions2;
          this.numVert = numVert;
          this.alpha = alpha;
        } else {
          this.oldPositions = positions;
          this.oldPositions2 = positions2;
          this.oldNumVert = numVert;
          this.oldAlpha = alpha;
        }
      }

      const mix = 0.5 - (0.5 * Math.cos(blendProgress * 3.1415926535898));
      const mix2 = 1 - mix;

      if (this.oldNumVert > 0) {
        alpha = (mix * this.alpha) + (mix2 * this.oldAlpha);
      }

      let r = Math.clamp(mdVSFrame.wave_r, 0, 1);
      let g = Math.clamp(mdVSFrame.wave_g, 0, 1);
      let b = Math.clamp(mdVSFrame.wave_b, 0, 1);

      if (mdVSFrame.wave_brighten !== 0) {
        const maxc = Math.max(r, g, b);
        if (maxc > 0.01) {
          r /= maxc;
          g /= maxc;
          b /= maxc;
        }
      }

      this.color = [r, g, b, alpha];

      if (this.oldNumVert > 0) {
        if (newWaveMode === 7) {
          const m = (this.oldNumVert - 1) / (this.numVert * 2);
          for (let i = 0; i < this.numVert; i++) {
            const fIdx = i * m;
            const nIdx = Math.floor(fIdx);
            const t = fIdx - nIdx;

            const x = (this.oldPositions[(nIdx * 3) + 0] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 0] * t);
            const y = (this.oldPositions[(nIdx * 3) + 1] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 1] * t);

            this.positions[(i * 3) + 0] = (this.positions[(i * 3) + 0] * mix) + (x * mix2);
            this.positions[(i * 3) + 1] = (this.positions[(i * 3) + 1] * mix) + (y * mix2);
            this.positions[(i * 3) + 2] = 0;
          }

          for (let i = 0; i < this.numVert; i++) {
            const fIdx = (i + this.numVert) * m;
            const nIdx = Math.floor(fIdx);
            const t = fIdx - nIdx;

            const x = (this.oldPositions[(nIdx * 3) + 0] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 0] * t);
            const y = (this.oldPositions[(nIdx * 3) + 1] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 1] * t);

            this.positions2[(i * 3) + 0] = (this.positions2[(i * 3) + 0] * mix) + (x * mix2);
            this.positions2[(i * 3) + 1] = (this.positions2[(i * 3) + 1] * mix) + (y * mix2);
            this.positions2[(i * 3) + 2] = 0;
          }
        } else if (oldWaveMode === 7) {
          const halfNumVert = this.numVert / 2;
          const m = (this.oldNumVert - 1) / halfNumVert;
          for (let i = 0; i < halfNumVert; i++) {
            const fIdx = i * m;
            const nIdx = Math.floor(fIdx);
            const t = fIdx - nIdx;

            const x = (this.oldPositions[(nIdx * 3) + 0] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 0] * t);
            const y = (this.oldPositions[(nIdx * 3) + 1] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 1] * t);

            this.positions[(i * 3) + 0] = (this.positions[(i * 3) + 0] * mix) + (x * mix2);
            this.positions[(i * 3) + 1] = (this.positions[(i * 3) + 1] * mix) + (y * mix2);
            this.positions[(i * 3) + 2] = 0;
          }

          for (let i = 0; i < halfNumVert; i++) {
            const fIdx = i * m;
            const nIdx = Math.floor(fIdx);
            const t = fIdx - nIdx;

            const x = (this.oldPositions2[(nIdx * 3) + 0] * (1 - t)) +
                      (this.oldPositions2[((nIdx + 1) * 3) + 0] * t);
            const y = (this.oldPositions2[(nIdx * 3) + 1] * (1 - t)) +
                      (this.oldPositions2[((nIdx + 1) * 3) + 1] * t);

            this.positions2[(i * 3) + 0] = (this.positions[((i + halfNumVert) * 3) + 0] * mix) +
                                           (x * mix2);
            this.positions2[(i * 3) + 1] = (this.positions[((i + halfNumVert) * 3) + 1] * mix) +
                                           (y * mix2);
            this.positions2[(i * 3) + 2] = 0;
          }
        } else {
          const m = (this.oldNumVert - 1) / this.numVert;
          for (let i = 0; i < this.numVert; i++) {
            const fIdx = i * m;
            const nIdx = Math.floor(fIdx);
            const t = fIdx - nIdx;

            const x = (this.oldPositions[(nIdx * 3) + 0] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 0] * t);
            const y = (this.oldPositions[(nIdx * 3) + 1] * (1 - t)) +
                      (this.oldPositions[((nIdx + 1) * 3) + 1] * t);

            this.positions[(i * 3) + 0] = (this.positions[(i * 3) + 0] * mix) + (x * mix2);
            this.positions[(i * 3) + 1] = (this.positions[(i * 3) + 1] * mix) + (y * mix2);
            this.positions[(i * 3) + 2] = 0;
          }
        }
      }

      for (let i = 0; i < this.numVert; i++) {
        this.positions[(i * 3) + 1] = -this.positions[(i * 3) + 1];
      }

      this.smoothedNumVert = (this.numVert * 2) - 1;
      WaveUtils.smoothWave(this.positions, this.smoothedPositions, this.numVert);

      if (newWaveMode === 7 || oldWaveMode === 7) {
        for (let i = 0; i < this.numVert; i++) {
          this.positions2[(i * 3) + 1] = -this.positions2[(i * 3) + 1];
        }

        WaveUtils.smoothWave(this.positions2, this.smoothedPositions2, this.numVert);
      }

      return true;
    }

    return false;
  }

  drawBasicWaveform (blending, blendProgress, timeArrayL, timeArrayR, mdVSFrame) {
    if (this.generateWaveform(blending, blendProgress, timeArrayL, timeArrayR, mdVSFrame)) {
      this.gl.useProgram(this.shaderProgram);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuf);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.smoothedPositions, this.gl.STATIC_DRAW);

      this.gl.vertexAttribPointer(this.aPosLoc, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.aPosLoc);

      this.gl.uniform4fv(this.colorLoc, this.color);

      let instances = 1;
      if (mdVSFrame.wave_thick !== 0 || mdVSFrame.wave_dots !== 0) {
        instances = 4;
      }

      if (mdVSFrame.additivewave !== 0) {
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
      } else {
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      }

      const drawMode = (mdVSFrame.wave_dots !== 0) ? this.gl.POINTS : this.gl.LINE_STRIP;

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
          this.gl.uniform2fv(this.thickOffsetLoc, [offset / this.texsizeX, offset / this.texsizeY]);
        }

        this.gl.drawArrays(drawMode, 0, this.smoothedNumVert);
      }

      const waveMode = Math.floor(mdVSFrame.wave_mode) % 8;
      if (waveMode === 7) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.smoothedPositions2, this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(this.aPosLoc, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.aPosLoc);

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

          this.gl.drawArrays(drawMode, 0, this.smoothedNumVert);
        }
      }
    }
  }
}
