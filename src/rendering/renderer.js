import AudioLevels from "../audio/audioLevels";
import blankPreset from "../blankPreset";
import PresetEquationRunner from "../equations/presetEquationRunner";
import PresetEquationRunnerWASM from "../equations/presetEquationRunnerWASM";
import BasicWaveform from "./waves/basicWaveform";
import CustomWaveform from "./waves/customWaveform";
import CustomShape from "./shapes/customShape";
import Border from "./sprites/border";
import DarkenCenter from "./sprites/darkenCenter";
import MotionVectors from "./motionVectors/motionVectors";
import WarpShader from "./shaders/warp";
import CompShader from "./shaders/comp";
import OutputShader from "./shaders/output";
import ResampleShader from "./shaders/resample";
import BlurShader from "./shaders/blur/blur";
import Noise from "../noise/noise";
import ImageTextures from "../image/imageTextures";
import TitleText from "./text/titleText";
import BlendPattern from "./blendPattern";
import Utils from "../utils";

export default class Renderer {
  constructor(gl, audio, opts) {
    this.gl = gl;
    this.audio = audio;

    this.frameNum = 0;
    this.fps = 30;
    this.time = 0;
    this.presetTime = 0;
    this.lastTime = performance.now();
    this.timeHist = [0];
    this.timeHistMax = 120;
    this.blending = false;
    this.blendStartTime = 0;
    this.blendProgress = 0;
    this.blendDuration = 0;

    this.width = opts.width || 1200;
    this.height = opts.height || 900;
    this.mesh_width = opts.meshWidth || 48;
    this.mesh_height = opts.meshHeight || 36;
    this.pixelRatio = opts.pixelRatio || window.devicePixelRatio || 1;
    this.textureRatio = opts.textureRatio || 1;
    this.outputFXAA = opts.outputFXAA || false;
    this.texsizeX = this.width * this.pixelRatio * this.textureRatio;
    this.texsizeY = this.height * this.pixelRatio * this.textureRatio;
    this.aspectx =
      this.texsizeY > this.texsizeX ? this.texsizeX / this.texsizeY : 1;
    this.aspecty =
      this.texsizeX > this.texsizeY ? this.texsizeY / this.texsizeX : 1;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.qs = Utils.range(1, 33).map((x) => `q${x}`);
    this.ts = Utils.range(1, 9).map((x) => `t${x}`);
    this.regs = Utils.range(0, 100).map((x) => {
      if (x < 10) {
        return `reg0${x}`;
      }
      return `reg${x}`;
    });

    this.blurRatios = [
      [0.5, 0.25],
      [0.125, 0.125],
      [0.0625, 0.0625],
    ];

    this.audioLevels = new AudioLevels(this.audio);

    this.prevFrameBuffer = this.gl.createFramebuffer();
    this.targetFrameBuffer = this.gl.createFramebuffer();
    this.prevTexture = this.gl.createTexture();
    this.targetTexture = this.gl.createTexture();

    this.compFrameBuffer = this.gl.createFramebuffer();
    this.compTexture = this.gl.createTexture();

    this.anisoExt =
      this.gl.getExtension("EXT_texture_filter_anisotropic") ||
      this.gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
      this.gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

    this.bindFrameBufferTexture(this.prevFrameBuffer, this.prevTexture);
    this.bindFrameBufferTexture(this.targetFrameBuffer, this.targetTexture);
    this.bindFrameBufferTexture(this.compFrameBuffer, this.compTexture);

    const params = {
      pixelRatio: this.pixelRatio,
      textureRatio: this.textureRatio,
      texsizeX: this.texsizeX,
      texsizeY: this.texsizeY,
      mesh_width: this.mesh_width,
      mesh_height: this.mesh_height,
      aspectx: this.aspectx,
      aspecty: this.aspecty,
    };
    this.noise = new Noise(gl);
    this.image = new ImageTextures(gl);
    this.warpShader = new WarpShader(gl, this.noise, this.image, params);
    this.compShader = new CompShader(gl, this.noise, this.image, params);
    this.outputShader = new OutputShader(gl, params);
    this.prevWarpShader = new WarpShader(gl, this.noise, this.image, params);
    this.prevCompShader = new CompShader(gl, this.noise, this.image, params);
    this.numBlurPasses = 0;
    this.blurShader1 = new BlurShader(0, this.blurRatios, gl, params);
    this.blurShader2 = new BlurShader(1, this.blurRatios, gl, params);
    this.blurShader3 = new BlurShader(2, this.blurRatios, gl, params);
    this.blurTexture1 = this.blurShader1.blurVerticalTexture;
    this.blurTexture2 = this.blurShader2.blurVerticalTexture;
    this.blurTexture3 = this.blurShader3.blurVerticalTexture;
    this.basicWaveform = new BasicWaveform(gl, params);
    this.customWaveforms = Utils.range(4).map(
      (i) => new CustomWaveform(i, gl, params)
    );
    this.customShapes = Utils.range(4).map(
      (i) => new CustomShape(i, gl, params)
    );
    this.prevCustomWaveforms = Utils.range(4).map(
      (i) => new CustomWaveform(i, gl, params)
    );
    this.prevCustomShapes = Utils.range(4).map(
      (i) => new CustomShape(i, gl, params)
    );
    this.darkenCenter = new DarkenCenter(gl, params);
    this.innerBorder = new Border(gl, params);
    this.outerBorder = new Border(gl, params);
    this.motionVectors = new MotionVectors(gl, params);
    this.titleText = new TitleText(gl, params);
    this.blendPattern = new BlendPattern(params);
    this.resampleShader = new ResampleShader(gl);

    this.supertext = {
      startTime: -1,
    };

    this.warpUVs = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 2
    );
    this.warpColor = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 4
    );

    this.gl.clearColor(0, 0, 0, 1);

    this.blankPreset = blankPreset;

    const globalVars = {
      frame: 0,
      time: 0,
      fps: 45,
      bass: 1,
      bass_att: 1,
      mid: 1,
      mid_att: 1,
      treb: 1,
      treb_att: 1,
    };

    this.preset = blankPreset;
    this.prevPreset = this.preset;
    this.presetEquationRunner = new PresetEquationRunner(
      this.preset,
      globalVars,
      params
    );
    this.prevPresetEquationRunner = new PresetEquationRunner(
      this.prevPreset,
      globalVars,
      params
    );

    if (!this.preset.useWASM) {
      this.regVars = this.presetEquationRunner.mdVSRegs;
    }
  }

  static getHighestBlur(t) {
    if (/sampler_blur3/.test(t)) {
      return 3;
    } else if (/sampler_blur2/.test(t)) {
      return 2;
    } else if (/sampler_blur1/.test(t)) {
      return 1;
    }

    return 0;
  }

  loadPreset(preset, blendTime) {
    this.blendPattern.createBlendPattern();
    this.blending = true;
    this.blendStartTime = this.time;
    this.blendDuration = blendTime;
    this.blendProgress = 0;

    this.prevPresetEquationRunner = this.presetEquationRunner;

    this.prevPreset = this.preset;
    this.preset = preset;

    this.presetTime = this.time;

    const globalVars = {
      frame: this.frameNum,
      time: this.time,
      fps: this.fps,
      bass: this.audioLevels.bass,
      bass_att: this.audioLevels.bass_att,
      mid: this.audioLevels.mid,
      mid_att: this.audioLevels.mid_att,
      treb: this.audioLevels.treb,
      treb_att: this.audioLevels.treb_att,
    };
    const params = {
      pixelRatio: this.pixelRatio,
      textureRatio: this.textureRatio,
      texsizeX: this.texsizeX,
      texsizeY: this.texsizeY,
      mesh_width: this.mesh_width,
      mesh_height: this.mesh_height,
      aspectx: this.aspectx,
      aspecty: this.aspecty,
    };

    if (preset.useWASM) {
      this.preset.globalPools.perFrame.old_wave_mode.value = this.prevPreset.baseVals.wave_mode;
      this.preset.baseVals.old_wave_mode = this.prevPreset.baseVals.wave_mode;
      this.presetEquationRunner = new PresetEquationRunnerWASM(
        this.preset,
        globalVars,
        params
      );
      if (this.preset.pixel_eqs_initialize_array) {
        this.preset.pixel_eqs_initialize_array(
          this.mesh_width,
          this.mesh_height
        );
      }
    } else {
      this.preset.baseVals.old_wave_mode = this.prevPreset.baseVals.wave_mode;
      this.presetEquationRunner = new PresetEquationRunner(
        this.preset,
        globalVars,
        params
      );
      this.regVars = this.presetEquationRunner.mdVSRegs;
    }

    const tmpWarpShader = this.prevWarpShader;
    this.prevWarpShader = this.warpShader;
    this.warpShader = tmpWarpShader;

    const tmpCompShader = this.prevCompShader;
    this.prevCompShader = this.compShader;
    this.compShader = tmpCompShader;

    const warpText = this.preset.warp.trim();
    const compText = this.preset.comp.trim();

    this.warpShader.updateShader(warpText);
    this.compShader.updateShader(compText);

    if (warpText.length === 0) {
      this.numBlurPasses = 0;
    } else {
      this.numBlurPasses = Renderer.getHighestBlur(warpText);
    }

    if (compText.length !== 0) {
      this.numBlurPasses = Math.max(
        this.numBlurPasses,
        Renderer.getHighestBlur(compText)
      );
    }
  }

  loadExtraImages(imageData) {
    this.image.loadExtraImages(imageData);
  }

  setRendererSize(width, height, opts) {
    const oldTexsizeX = this.texsizeX;
    const oldTexsizeY = this.texsizeY;

    this.width = width;
    this.height = height;
    this.mesh_width = opts.meshWidth || this.mesh_width;
    this.mesh_height = opts.meshHeight || this.mesh_height;
    this.pixelRatio = opts.pixelRatio || this.pixelRatio;
    this.textureRatio = opts.textureRatio || this.textureRatio;
    this.texsizeX = width * this.pixelRatio * this.textureRatio;
    this.texsizeY = height * this.pixelRatio * this.textureRatio;
    this.aspectx =
      this.texsizeY > this.texsizeX ? this.texsizeX / this.texsizeY : 1;
    this.aspecty =
      this.texsizeX > this.texsizeY ? this.texsizeY / this.texsizeX : 1;

    if (this.texsizeX !== oldTexsizeX || this.texsizeY !== oldTexsizeY) {
      // copy target texture, because we flip prev/target at start of render
      const targetTextureNew = this.gl.createTexture();
      this.bindFrameBufferTexture(this.targetFrameBuffer, targetTextureNew);
      this.bindFrambufferAndSetViewport(
        this.targetFrameBuffer,
        this.texsizeX,
        this.texsizeY
      );

      this.resampleShader.renderQuadTexture(this.targetTexture);

      this.targetTexture = targetTextureNew;

      this.bindFrameBufferTexture(this.prevFrameBuffer, this.prevTexture);
      this.bindFrameBufferTexture(this.compFrameBuffer, this.compTexture);
    }

    this.updateGlobals();

    // rerender current frame at new size
    if (this.frameNum > 0) {
      this.renderToScreen();
    }
  }

  setInternalMeshSize(width, height) {
    this.mesh_width = width;
    this.mesh_height = height;

    this.updateGlobals();
  }

  setOutputAA(useAA) {
    this.outputFXAA = useAA;
  }

  updateGlobals() {
    const params = {
      pixelRatio: this.pixelRatio,
      textureRatio: this.textureRatio,
      texsizeX: this.texsizeX,
      texsizeY: this.texsizeY,
      mesh_width: this.mesh_width,
      mesh_height: this.mesh_height,
      aspectx: this.aspectx,
      aspecty: this.aspecty,
    };
    this.presetEquationRunner.updateGlobals(params);
    this.prevPresetEquationRunner.updateGlobals(params);
    this.warpShader.updateGlobals(params);
    this.prevWarpShader.updateGlobals(params);
    this.compShader.updateGlobals(params);
    this.prevCompShader.updateGlobals(params);
    this.outputShader.updateGlobals(params);
    this.blurShader1.updateGlobals(params);
    this.blurShader2.updateGlobals(params);
    this.blurShader3.updateGlobals(params);
    this.basicWaveform.updateGlobals(params);
    this.customWaveforms.forEach((wave) => wave.updateGlobals(params));
    this.customShapes.forEach((shape) => shape.updateGlobals(params));
    this.prevCustomWaveforms.forEach((wave) => wave.updateGlobals(params));
    this.prevCustomShapes.forEach((shape) => shape.updateGlobals(params));
    this.darkenCenter.updateGlobals(params);
    this.innerBorder.updateGlobals(params);
    this.outerBorder.updateGlobals(params);
    this.motionVectors.updateGlobals(params);
    this.titleText.updateGlobals(params);
    this.blendPattern.updateGlobals(params);

    this.warpUVs = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 2
    );
    this.warpColor = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 4
    );

    if (this.preset.pixel_eqs_initialize_array) {
      this.preset.pixel_eqs_initialize_array(this.mesh_width, this.mesh_height);
    }
  }

  calcTimeAndFPS(elapsedTime) {
    let elapsed;
    if (elapsedTime) {
      elapsed = elapsedTime;
    } else {
      const newTime = performance.now();
      elapsed = (newTime - this.lastTime) / 1000.0;
      if (elapsed > 1.0 || elapsed < 0.0 || this.frame < 2) {
        elapsed = 1.0 / 30.0;
      }
      this.lastTime = newTime;
    }

    this.time += 1.0 / this.fps;

    if (this.blending) {
      this.blendProgress =
        (this.time - this.blendStartTime) / this.blendDuration;
      if (this.blendProgress > 1.0) {
        this.blending = false;
      }
    }

    const newHistTime = this.timeHist[this.timeHist.length - 1] + elapsed;
    this.timeHist.push(newHistTime);
    if (this.timeHist.length > this.timeHistMax) {
      this.timeHist.shift();
    }

    const newFPS = this.timeHist.length / (newHistTime - this.timeHist[0]);
    if (Math.abs(newFPS - this.fps) > 3.0 && this.frame > this.timeHistMax) {
      this.fps = newFPS;
    } else {
      const damping = 0.93;
      this.fps = damping * this.fps + (1.0 - damping) * newFPS;
    }
  }

  runPixelEquations(presetEquationRunner, mdVSFrame, globalVars, blending) {
    const gridX = this.mesh_width;
    const gridZ = this.mesh_height;

    const gridX1 = gridX + 1;
    const gridZ1 = gridZ + 1;

    const warpTimeV = this.time * mdVSFrame.warpanimspeed;
    const warpScaleInv = 1.0 / mdVSFrame.warpscale;

    const warpf0 = 11.68 + 4.0 * Math.cos(warpTimeV * 1.413 + 10);
    const warpf1 = 8.77 + 3.0 * Math.cos(warpTimeV * 1.113 + 7);
    const warpf2 = 10.54 + 3.0 * Math.cos(warpTimeV * 1.233 + 3);
    const warpf3 = 11.49 + 4.0 * Math.cos(warpTimeV * 0.933 + 5);

    const texelOffsetX = 0.0 / this.texsizeX;
    const texelOffsetY = 0.0 / this.texsizeY;

    const aspectx = this.aspectx;
    const aspecty = this.aspecty;

    let offset = 0;
    let offsetColor = 0;
    if (!presetEquationRunner.preset.useWASM) {
      let mdVSVertex = Utils.cloneVars(mdVSFrame);

      let warp = mdVSVertex.warp;
      let zoom = mdVSVertex.zoom;
      let zoomExp = mdVSVertex.zoomexp;
      let cx = mdVSVertex.cx;
      let cy = mdVSVertex.cy;
      let sx = mdVSVertex.sx;
      let sy = mdVSVertex.sy;
      let dx = mdVSVertex.dx;
      let dy = mdVSVertex.dy;
      let rot = mdVSVertex.rot;

      for (let iz = 0; iz < gridZ1; iz++) {
        for (let ix = 0; ix < gridX1; ix++) {
          const x = (ix / gridX) * 2.0 - 1.0;
          const y = (iz / gridZ) * 2.0 - 1.0;
          const rad = Math.sqrt(
            x * x * aspectx * aspectx + y * y * aspecty * aspecty
          );

          if (presetEquationRunner.runVertEQs) {
            let ang;
            if (iz === gridZ / 2 && ix === gridX / 2) {
              ang = 0;
            } else {
              ang = Utils.atan2(y * aspecty, x * aspectx);
            }

            mdVSVertex.x = x * 0.5 * aspectx + 0.5;
            mdVSVertex.y = y * -0.5 * aspecty + 0.5;
            mdVSVertex.rad = rad;
            mdVSVertex.ang = ang;

            mdVSVertex.zoom = mdVSFrame.zoom;
            mdVSVertex.zoomexp = mdVSFrame.zoomexp;
            mdVSVertex.rot = mdVSFrame.rot;
            mdVSVertex.warp = mdVSFrame.warp;
            mdVSVertex.cx = mdVSFrame.cx;
            mdVSVertex.cy = mdVSFrame.cy;
            mdVSVertex.dx = mdVSFrame.dx;
            mdVSVertex.dy = mdVSFrame.dy;
            mdVSVertex.sx = mdVSFrame.sx;
            mdVSVertex.sy = mdVSFrame.sy;

            mdVSVertex = presetEquationRunner.runPixelEquations(mdVSVertex);

            warp = mdVSVertex.warp;
            zoom = mdVSVertex.zoom;
            zoomExp = mdVSVertex.zoomexp;
            cx = mdVSVertex.cx;
            cy = mdVSVertex.cy;
            sx = mdVSVertex.sx;
            sy = mdVSVertex.sy;
            dx = mdVSVertex.dx;
            dy = mdVSVertex.dy;
            rot = mdVSVertex.rot;
          }

          const zoom2V = zoom ** (zoomExp ** (rad * 2.0 - 1.0));
          const zoom2Inv = 1.0 / zoom2V;

          let u = x * 0.5 * aspectx * zoom2Inv + 0.5;
          let v = -y * 0.5 * aspecty * zoom2Inv + 0.5;

          u = (u - cx) / sx + cx;
          v = (v - cy) / sy + cy;

          if (warp !== 0) {
            u +=
              warp *
              0.0035 *
              Math.sin(
                warpTimeV * 0.333 + warpScaleInv * (x * warpf0 - y * warpf3)
              );
            v +=
              warp *
              0.0035 *
              Math.cos(
                warpTimeV * 0.375 - warpScaleInv * (x * warpf2 + y * warpf1)
              );
            u +=
              warp *
              0.0035 *
              Math.cos(
                warpTimeV * 0.753 - warpScaleInv * (x * warpf1 - y * warpf2)
              );
            v +=
              warp *
              0.0035 *
              Math.sin(
                warpTimeV * 0.825 + warpScaleInv * (x * warpf0 + y * warpf3)
              );
          }

          const u2 = u - cx;
          const v2 = v - cy;

          const cosRot = Math.cos(rot);
          const sinRot = Math.sin(rot);
          u = u2 * cosRot - v2 * sinRot + cx;
          v = u2 * sinRot + v2 * cosRot + cy;

          u -= dx;
          v -= dy;

          u = (u - 0.5) / aspectx + 0.5;
          v = (v - 0.5) / aspecty + 0.5;

          u += texelOffsetX;
          v += texelOffsetY;

          if (!blending) {
            this.warpUVs[offset] = u;
            this.warpUVs[offset + 1] = v;

            this.warpColor[offsetColor + 0] = 1;
            this.warpColor[offsetColor + 1] = 1;
            this.warpColor[offsetColor + 2] = 1;
            this.warpColor[offsetColor + 3] = 1;
          } else {
            let mix2 =
              this.blendPattern.vertInfoA[offset / 2] * this.blendProgress +
              this.blendPattern.vertInfoC[offset / 2];
            mix2 = Math.clamp(mix2, 0, 1);

            this.warpUVs[offset] = this.warpUVs[offset] * mix2 + u * (1 - mix2);
            this.warpUVs[offset + 1] =
              this.warpUVs[offset + 1] * mix2 + v * (1 - mix2);

            this.warpColor[offsetColor + 0] = 1;
            this.warpColor[offsetColor + 1] = 1;
            this.warpColor[offsetColor + 2] = 1;
            this.warpColor[offsetColor + 3] = mix2;
          }

          offset += 2;
          offsetColor += 4;
        }
      }

      this.mdVSVertex = mdVSVertex;
    } else {
      const varPool = presetEquationRunner.preset.globalPools.perVertex;

      Utils.setWasm(varPool, globalVars, presetEquationRunner.globalKeys);
      Utils.setWasm(
        varPool,
        presetEquationRunner.mdVSQAfterFrame,
        presetEquationRunner.qs
      );

      varPool.zoom.value = mdVSFrame.zoom;
      varPool.zoomexp.value = mdVSFrame.zoomexp;
      varPool.rot.value = mdVSFrame.rot;
      varPool.warp.value = mdVSFrame.warp;
      varPool.cx.value = mdVSFrame.cx;
      varPool.cy.value = mdVSFrame.cy;
      varPool.dx.value = mdVSFrame.dx;
      varPool.dy.value = mdVSFrame.dy;
      varPool.sx.value = mdVSFrame.sx;
      varPool.sy.value = mdVSFrame.sy;

      presetEquationRunner.preset.pixel_eqs_wasm(
        presetEquationRunner.runVertEQs,
        this.mesh_width,
        this.mesh_height,
        this.time,
        mdVSFrame.warpanimspeed,
        mdVSFrame.warpscale,
        this.aspectx,
        this.aspecty
      );

      if (!blending) {
        this.warpUVs = presetEquationRunner.preset.pixel_eqs_get_array();
        this.warpColor.fill(1);
      } else {
        const newWarpUVs = presetEquationRunner.preset.pixel_eqs_get_array();

        let offset = 0;
        let offsetColor = 0;
        for (let iz = 0; iz < gridZ1; iz++) {
          for (let ix = 0; ix < gridX1; ix++) {
            const u = newWarpUVs[offset];
            const v = newWarpUVs[offset + 1];

            let mix2 =
              this.blendPattern.vertInfoA[offset / 2] * this.blendProgress +
              this.blendPattern.vertInfoC[offset / 2];
            mix2 = Math.clamp(mix2, 0, 1);

            this.warpUVs[offset] = this.warpUVs[offset] * mix2 + u * (1 - mix2);
            this.warpUVs[offset + 1] =
              this.warpUVs[offset + 1] * mix2 + v * (1 - mix2);

            this.warpColor[offsetColor + 0] = 1;
            this.warpColor[offsetColor + 1] = 1;
            this.warpColor[offsetColor + 2] = 1;
            this.warpColor[offsetColor + 3] = mix2;

            offset += 2;
            offsetColor += 4;
          }
        }
      }
    }
  }

  static mixFrameEquations(blendProgress, mdVSFrame, mdVSFramePrev) {
    const mix = 0.5 - 0.5 * Math.cos(blendProgress * Math.PI);
    const mix2 = 1 - mix;
    const snapPoint = 0.5;

    const mixedFrame = Utils.cloneVars(mdVSFrame);

    mixedFrame.decay = mix * mdVSFrame.decay + mix2 * mdVSFramePrev.decay;
    mixedFrame.wave_a = mix * mdVSFrame.wave_a + mix2 * mdVSFramePrev.wave_a;
    mixedFrame.wave_r = mix * mdVSFrame.wave_r + mix2 * mdVSFramePrev.wave_r;
    mixedFrame.wave_g = mix * mdVSFrame.wave_g + mix2 * mdVSFramePrev.wave_g;
    mixedFrame.wave_b = mix * mdVSFrame.wave_b + mix2 * mdVSFramePrev.wave_b;
    mixedFrame.wave_x = mix * mdVSFrame.wave_x + mix2 * mdVSFramePrev.wave_x;
    mixedFrame.wave_y = mix * mdVSFrame.wave_y + mix2 * mdVSFramePrev.wave_y;
    mixedFrame.wave_mystery =
      mix * mdVSFrame.wave_mystery + mix2 * mdVSFramePrev.wave_mystery;
    mixedFrame.ob_size = mix * mdVSFrame.ob_size + mix2 * mdVSFramePrev.ob_size;
    mixedFrame.ob_r = mix * mdVSFrame.ob_r + mix2 * mdVSFramePrev.ob_r;
    mixedFrame.ob_g = mix * mdVSFrame.ob_g + mix2 * mdVSFramePrev.ob_g;
    mixedFrame.ob_b = mix * mdVSFrame.ob_b + mix2 * mdVSFramePrev.ob_b;
    mixedFrame.ob_a = mix * mdVSFrame.ob_a + mix2 * mdVSFramePrev.ob_a;
    mixedFrame.ib_size = mix * mdVSFrame.ib_size + mix2 * mdVSFramePrev.ib_size;
    mixedFrame.ib_r = mix * mdVSFrame.ib_r + mix2 * mdVSFramePrev.ib_r;
    mixedFrame.ib_g = mix * mdVSFrame.ib_g + mix2 * mdVSFramePrev.ib_g;
    mixedFrame.ib_b = mix * mdVSFrame.ib_b + mix2 * mdVSFramePrev.ib_b;
    mixedFrame.ib_a = mix * mdVSFrame.ib_a + mix2 * mdVSFramePrev.ib_a;
    mixedFrame.mv_x = mix * mdVSFrame.mv_x + mix2 * mdVSFramePrev.mv_x;
    mixedFrame.mv_y = mix * mdVSFrame.mv_y + mix2 * mdVSFramePrev.mv_y;
    mixedFrame.mv_dx = mix * mdVSFrame.mv_dx + mix2 * mdVSFramePrev.mv_dx;
    mixedFrame.mv_dy = mix * mdVSFrame.mv_dy + mix2 * mdVSFramePrev.mv_dy;
    mixedFrame.mv_l = mix * mdVSFrame.mv_l + mix2 * mdVSFramePrev.mv_l;
    mixedFrame.mv_r = mix * mdVSFrame.mv_r + mix2 * mdVSFramePrev.mv_r;
    mixedFrame.mv_g = mix * mdVSFrame.mv_g + mix2 * mdVSFramePrev.mv_g;
    mixedFrame.mv_b = mix * mdVSFrame.mv_b + mix2 * mdVSFramePrev.mv_b;
    mixedFrame.mv_a = mix * mdVSFrame.mv_a + mix2 * mdVSFramePrev.mv_a;
    mixedFrame.echo_zoom =
      mix * mdVSFrame.echo_zoom + mix2 * mdVSFramePrev.echo_zoom;
    mixedFrame.echo_alpha =
      mix * mdVSFrame.echo_alpha + mix2 * mdVSFramePrev.echo_alpha;
    mixedFrame.echo_orient =
      mix * mdVSFrame.echo_orient + mix2 * mdVSFramePrev.echo_orient;
    mixedFrame.wave_dots =
      mix < snapPoint ? mdVSFramePrev.wave_dots : mdVSFrame.wave_dots;
    mixedFrame.wave_thick =
      mix < snapPoint ? mdVSFramePrev.wave_thick : mdVSFrame.wave_thick;
    mixedFrame.additivewave =
      mix < snapPoint ? mdVSFramePrev.additivewave : mdVSFrame.additivewave;
    mixedFrame.wave_brighten =
      mix < snapPoint ? mdVSFramePrev.wave_brighten : mdVSFrame.wave_brighten;
    mixedFrame.darken_center =
      mix < snapPoint ? mdVSFramePrev.darken_center : mdVSFrame.darken_center;
    mixedFrame.gammaadj =
      mix < snapPoint ? mdVSFramePrev.gammaadj : mdVSFrame.gammaadj;
    mixedFrame.wrap = mix < snapPoint ? mdVSFramePrev.wrap : mdVSFrame.wrap;
    mixedFrame.invert =
      mix < snapPoint ? mdVSFramePrev.invert : mdVSFrame.invert;
    mixedFrame.brighten =
      mix < snapPoint ? mdVSFramePrev.brighten : mdVSFrame.brighten;
    mixedFrame.darken =
      mix < snapPoint ? mdVSFramePrev.darken : mdVSFrame.darken;
    mixedFrame.solarize =
      mix < snapPoint ? mdVSFramePrev.brighten : mdVSFrame.solarize;
    mixedFrame.b1n = mix * mdVSFrame.b1n + mix2 * mdVSFramePrev.b1n;
    mixedFrame.b2n = mix * mdVSFrame.b2n + mix2 * mdVSFramePrev.b2n;
    mixedFrame.b3n = mix * mdVSFrame.b3n + mix2 * mdVSFramePrev.b3n;
    mixedFrame.b1x = mix * mdVSFrame.b1x + mix2 * mdVSFramePrev.b1x;
    mixedFrame.b2x = mix * mdVSFrame.b2x + mix2 * mdVSFramePrev.b2x;
    mixedFrame.b3x = mix * mdVSFrame.b3x + mix2 * mdVSFramePrev.b3x;
    mixedFrame.b1ed = mix * mdVSFrame.b1ed + mix2 * mdVSFramePrev.b1ed;

    return mixedFrame;
  }

  static getBlurValues(mdVSFrame) {
    let blurMin1 = mdVSFrame.b1n;
    let blurMin2 = mdVSFrame.b2n;
    let blurMin3 = mdVSFrame.b3n;
    let blurMax1 = mdVSFrame.b1x;
    let blurMax2 = mdVSFrame.b2x;
    let blurMax3 = mdVSFrame.b3x;

    const fMinDist = 0.1;
    if (blurMax1 - blurMin1 < fMinDist) {
      const avg = (blurMin1 + blurMax1) * 0.5;
      blurMin1 = avg - fMinDist * 0.5;
      blurMax1 = avg - fMinDist * 0.5;
    }
    blurMax2 = Math.min(blurMax1, blurMax2);
    blurMin2 = Math.max(blurMin1, blurMin2);
    if (blurMax2 - blurMin2 < fMinDist) {
      const avg = (blurMin2 + blurMax2) * 0.5;
      blurMin2 = avg - fMinDist * 0.5;
      blurMax2 = avg - fMinDist * 0.5;
    }
    blurMax3 = Math.min(blurMax2, blurMax3);
    blurMin3 = Math.max(blurMin2, blurMin3);
    if (blurMax3 - blurMin3 < fMinDist) {
      const avg = (blurMin3 + blurMax3) * 0.5;
      blurMin3 = avg - fMinDist * 0.5;
      blurMax3 = avg - fMinDist * 0.5;
    }

    return {
      blurMins: [blurMin1, blurMin2, blurMin3],
      blurMaxs: [blurMax1, blurMax2, blurMax3],
    };
  }

  bindFrambufferAndSetViewport(fb, width, height) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
    this.gl.viewport(0, 0, width, height);
  }

  bindFrameBufferTexture(targetFrameBuffer, targetTexture) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, targetTexture);

    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.texsizeX,
      this.texsizeY,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array(this.texsizeX * this.texsizeY * 4)
    );

    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR_MIPMAP_LINEAR
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR
    );
    if (this.anisoExt) {
      const max = this.gl.getParameter(
        this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT
      );
      this.gl.texParameterf(
        this.gl.TEXTURE_2D,
        this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT,
        max
      );
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, targetFrameBuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      targetTexture,
      0
    );
  }

  render({ audioLevels, elapsedTime } = {}) {
    this.calcTimeAndFPS(elapsedTime);
    this.frameNum += 1;

    if (audioLevels) {
      this.audio.updateAudio(
        audioLevels.timeByteArray,
        audioLevels.timeByteArrayL,
        audioLevels.timeByteArrayR
      );
    } else {
      this.audio.sampleAudio();
    }
    this.audioLevels.updateAudioLevels(this.fps, this.frameNum);

    const globalVars = {
      frame: this.frameNum,
      time: this.time,
      fps: this.fps,
      bass: this.audioLevels.bass,
      bass_att: this.audioLevels.bass_att,
      mid: this.audioLevels.mid,
      mid_att: this.audioLevels.mid_att,
      treb: this.audioLevels.treb,
      treb_att: this.audioLevels.treb_att,
      meshx: this.mesh_width,
      meshy: this.mesh_height,
      aspectx: this.invAspectx,
      aspecty: this.invAspecty,
      pixelsx: this.texsizeX,
      pixelsy: this.texsizeY,
    };

    const prevGlobalVars = Object.assign({}, globalVars);
    if (!this.prevPreset.useWASM) {
      prevGlobalVars.gmegabuf = this.prevPresetEquationRunner.gmegabuf;
    }

    if (!this.preset.useWASM) {
      globalVars.gmegabuf = this.presetEquationRunner.gmegabuf;
      Object.assign(globalVars, this.regVars);
    }

    const mdVSFrame = this.presetEquationRunner.runFrameEquations(globalVars);

    this.runPixelEquations(
      this.presetEquationRunner,
      mdVSFrame,
      globalVars,
      false
    );

    if (!this.preset.useWASM) {
      Object.assign(this.regVars, Utils.pick(this.mdVSVertex, this.regs));
      Object.assign(globalVars, this.regVars);
    }

    let mdVSFrameMixed;
    if (this.blending) {
      this.prevMDVSFrame = this.prevPresetEquationRunner.runFrameEquations(
        prevGlobalVars
      );
      this.runPixelEquations(
        this.prevPresetEquationRunner,
        this.prevMDVSFrame,
        prevGlobalVars,
        true
      );

      mdVSFrameMixed = Renderer.mixFrameEquations(
        this.blendProgress,
        mdVSFrame,
        this.prevMDVSFrame
      );
    } else {
      mdVSFrameMixed = mdVSFrame;
    }

    const swapTexture = this.targetTexture;
    this.targetTexture = this.prevTexture;
    this.prevTexture = swapTexture;

    const swapFrameBuffer = this.targetFrameBuffer;
    this.targetFrameBuffer = this.prevFrameBuffer;
    this.prevFrameBuffer = swapFrameBuffer;

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.prevTexture);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.bindFrambufferAndSetViewport(
      this.targetFrameBuffer,
      this.texsizeX,
      this.texsizeY
    );

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendEquation(this.gl.FUNC_ADD);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    const { blurMins, blurMaxs } = Renderer.getBlurValues(mdVSFrameMixed);

    if (!this.blending) {
      this.warpShader.renderQuadTexture(
        false,
        this.prevTexture,
        this.blurTexture1,
        this.blurTexture2,
        this.blurTexture3,
        blurMins,
        blurMaxs,
        mdVSFrame,
        this.presetEquationRunner.mdVSQAfterFrame,
        this.warpUVs,
        this.warpColor
      );
    } else {
      this.prevWarpShader.renderQuadTexture(
        false,
        this.prevTexture,
        this.blurTexture1,
        this.blurTexture2,
        this.blurTexture3,
        blurMins,
        blurMaxs,
        this.prevMDVSFrame,
        this.prevPresetEquationRunner.mdVSQAfterFrame,
        this.warpUVs,
        this.warpColor
      );

      this.warpShader.renderQuadTexture(
        true,
        this.prevTexture,
        this.blurTexture1,
        this.blurTexture2,
        this.blurTexture3,
        blurMins,
        blurMaxs,
        mdVSFrameMixed,
        this.presetEquationRunner.mdVSQAfterFrame,
        this.warpUVs,
        this.warpColor
      );
    }

    if (this.numBlurPasses > 0) {
      this.blurShader1.renderBlurTexture(
        this.targetTexture,
        mdVSFrame,
        blurMins,
        blurMaxs
      );

      if (this.numBlurPasses > 1) {
        this.blurShader2.renderBlurTexture(
          this.blurTexture1,
          mdVSFrame,
          blurMins,
          blurMaxs
        );

        if (this.numBlurPasses > 2) {
          this.blurShader3.renderBlurTexture(
            this.blurTexture2,
            mdVSFrame,
            blurMins,
            blurMaxs
          );
        }
      }

      // rebind target texture framebuffer
      this.bindFrambufferAndSetViewport(
        this.targetFrameBuffer,
        this.texsizeX,
        this.texsizeY
      );
    }

    this.motionVectors.drawMotionVectors(mdVSFrameMixed, this.warpUVs);

    if (this.preset.shapes && this.preset.shapes.length > 0) {
      this.customShapes.forEach((shape, i) => {
        shape.drawCustomShape(
          this.blending ? this.blendProgress : 1,
          globalVars,
          this.presetEquationRunner,
          this.preset.shapes[i],
          this.prevTexture
        );
      });
    }

    if (this.preset.waves && this.preset.waves.length > 0) {
      this.customWaveforms.forEach((waveform, i) => {
        waveform.drawCustomWaveform(
          this.blending ? this.blendProgress : 1,
          this.audio.timeArrayL,
          this.audio.timeArrayR,
          this.audio.freqArrayL,
          this.audio.freqArrayR,
          globalVars,
          this.presetEquationRunner,
          this.preset.waves[i]
        );
      });
    }

    if (this.blending) {
      if (this.prevPreset.shapes && this.prevPreset.shapes.length > 0) {
        this.prevCustomShapes.forEach((shape, i) => {
          shape.drawCustomShape(
            1.0 - this.blendProgress,
            prevGlobalVars,
            this.prevPresetEquationRunner,
            this.prevPreset.shapes[i],
            this.prevTexture
          );
        });
      }

      if (this.prevPreset.waves && this.prevPreset.waves.length > 0) {
        this.prevCustomWaveforms.forEach((waveform, i) => {
          waveform.drawCustomWaveform(
            1.0 - this.blendProgress,
            this.audio.timeArrayL,
            this.audio.timeArrayR,
            this.audio.freqArrayL,
            this.audio.freqArrayR,
            prevGlobalVars,
            this.prevPresetEquationRunner,
            this.prevPreset.waves[i]
          );
        });
      }
    }

    this.basicWaveform.drawBasicWaveform(
      this.blending,
      this.blendProgress,
      this.audio.timeArrayL,
      this.audio.timeArrayR,
      mdVSFrameMixed
    );

    this.darkenCenter.drawDarkenCenter(mdVSFrameMixed);

    const outerColor = [
      mdVSFrameMixed.ob_r,
      mdVSFrameMixed.ob_g,
      mdVSFrameMixed.ob_b,
      mdVSFrameMixed.ob_a,
    ];
    this.outerBorder.drawBorder(outerColor, mdVSFrameMixed.ob_size, 0);

    const innerColor = [
      mdVSFrameMixed.ib_r,
      mdVSFrameMixed.ib_g,
      mdVSFrameMixed.ib_b,
      mdVSFrameMixed.ib_a,
    ];
    this.innerBorder.drawBorder(
      innerColor,
      mdVSFrameMixed.ib_size,
      mdVSFrameMixed.ob_size
    );

    if (this.supertext.startTime >= 0) {
      const progress =
        (this.time - this.supertext.startTime) / this.supertext.duration;
      if (progress >= 1) {
        this.titleText.renderTitle(progress, true, globalVars);
      }
    }

    // Store variables in case we need to rerender
    this.globalVars = globalVars;
    this.mdVSFrame = mdVSFrame;
    this.mdVSFrameMixed = mdVSFrameMixed;

    this.renderToScreen();
  }

  renderToScreen() {
    if (this.outputFXAA) {
      this.bindFrambufferAndSetViewport(
        this.compFrameBuffer,
        this.texsizeX,
        this.texsizeY
      );
    } else {
      this.bindFrambufferAndSetViewport(null, this.width, this.height);
    }

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendEquation(this.gl.FUNC_ADD);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    const { blurMins, blurMaxs } = Renderer.getBlurValues(this.mdVSFrameMixed);

    if (!this.blending) {
      this.compShader.renderQuadTexture(
        false,
        this.targetTexture,
        this.blurTexture1,
        this.blurTexture2,
        this.blurTexture3,
        blurMins,
        blurMaxs,
        this.mdVSFrame,
        this.presetEquationRunner.mdVSQAfterFrame,
        this.warpColor
      );
    } else {
      this.prevCompShader.renderQuadTexture(
        false,
        this.targetTexture,
        this.blurTexture1,
        this.blurTexture2,
        this.blurTexture3,
        blurMins,
        blurMaxs,
        this.prevMDVSFrame,
        this.prevPresetEquationRunner.mdVSQAfterFrame,
        this.warpColor
      );

      this.compShader.renderQuadTexture(
        true,
        this.targetTexture,
        this.blurTexture1,
        this.blurTexture2,
        this.blurTexture3,
        blurMins,
        blurMaxs,
        this.mdVSFrameMixed,
        this.presetEquationRunner.mdVSQAfterFrame,
        this.warpColor
      );
    }

    if (this.supertext.startTime >= 0) {
      const progress =
        (this.time - this.supertext.startTime) / this.supertext.duration;
      this.titleText.renderTitle(progress, false, this.globalVars);

      if (progress >= 1) {
        this.supertext.startTime = -1;
      }
    }

    if (this.outputFXAA) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.compTexture);
      this.gl.generateMipmap(this.gl.TEXTURE_2D);

      this.bindFrambufferAndSetViewport(null, this.width, this.height);
      this.outputShader.renderQuadTexture(this.compTexture);
    }
  }

  launchSongTitleAnim(text) {
    this.supertext = {
      startTime: this.time,
      duration: 1.7,
    };
    this.titleText.generateTitleTexture(text);
  }

  toDataURL() {
    const data = new Uint8Array(this.texsizeX * this.texsizeY * 4);

    const compFrameBuffer = this.gl.createFramebuffer();
    const compTexture = this.gl.createTexture();

    this.bindFrameBufferTexture(compFrameBuffer, compTexture);

    const { blurMins, blurMaxs } = Renderer.getBlurValues(this.mdVSFrameMixed);
    this.compShader.renderQuadTexture(
      false,
      this.targetTexture,
      this.blurTexture1,
      this.blurTexture2,
      this.blurTexture3,
      blurMins,
      blurMaxs,
      this.mdVSFrame,
      this.presetEquationRunner.mdVSQAfterFrame,
      this.warpColor
    );

    this.gl.readPixels(
      0,
      0,
      this.texsizeX,
      this.texsizeY,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      data
    );

    // flip data
    Array.from({ length: this.texsizeY }, (val, i) =>
      data.slice(i * this.texsizeX * 4, (i + 1) * this.texsizeX * 4)
    ).forEach((val, i) =>
      data.set(val, (this.texsizeY - i - 1) * this.texsizeX * 4)
    );

    const canvas = document.createElement("canvas");
    canvas.width = this.texsizeX;
    canvas.height = this.texsizeY;

    const context = canvas.getContext("2d");
    const imageData = context.createImageData(this.texsizeX, this.texsizeY);
    imageData.data.set(data);
    context.putImageData(imageData, 0, 0);

    this.gl.deleteTexture(compTexture);
    this.gl.deleteFramebuffer(compFrameBuffer);

    return canvas.toDataURL();
  }

  warpBufferToDataURL() {
    const data = new Uint8Array(this.texsizeX * this.texsizeY * 4);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.targetFrameBuffer);
    this.gl.readPixels(
      0,
      0,
      this.texsizeX,
      this.texsizeY,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      data
    );

    const canvas = document.createElement("canvas");
    canvas.width = this.texsizeX;
    canvas.height = this.texsizeY;

    const context = canvas.getContext("2d");
    const imageData = context.createImageData(this.texsizeX, this.texsizeY);
    imageData.data.set(data);
    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL();
  }
}
