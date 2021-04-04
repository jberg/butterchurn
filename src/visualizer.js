import { loadModule } from "eel-wasm";
import ascLoader from "@assemblyscript/loader";
import AudioProcessor from "./audio/audioProcessor";
import Renderer from "./rendering/renderer";
import Utils from "./utils";
import loadPresetFunctionsBuffer from "./assemblyscript/presetFunctions.ts";

export default class Visualizer {
  constructor(audioContext, canvas, opts) {
    this.opts = opts;
    this.audio = new AudioProcessor(audioContext);

    const vizWidth = opts.width || 1200;
    const vizHeight = opts.height || 900;
    if (window.OffscreenCanvas) {
      this.internalCanvas = new OffscreenCanvas(vizWidth, vizHeight);
    } else {
      this.internalCanvas = document.createElement("canvas");
      this.internalCanvas.width = vizWidth;
      this.internalCanvas.height = vizHeight;
    }

    this.gl = this.internalCanvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
    });

    this.outputGl = canvas.getContext('2d');

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
      bmotionvectorson: 1,
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

    this.qs = Utils.range(1, 33).map((x) => `q${x}`);
    this.ts = Utils.range(1, 9).map((x) => `t${x}`);

    this.globalPerFrameVars = [
      "old_wave_mode",
      // globals
      "frame",
      "time",
      "fps",
      "bass",
      "bass_att",
      "mid",
      "mid_att",
      "treb",
      "treb_att",
      "meshx",
      "meshy",
      "aspectx",
      "aspecty",
      "pixelsx",
      "pixelsy",
      "rand_start",
      "rand_preset",
    ];

    this.globalPerPixelVars = [
      // globals
      "frame",
      "time",
      "fps",
      "bass",
      "bass_att",
      "mid",
      "mid_att",
      "treb",
      "treb_att",
      "meshx",
      "meshy",
      "aspectx",
      "aspecty",
      "pixelsx",
      "pixelsy",
      "rand_start",
      "rand_preset",
      // for pixel eqs
      "x",
      "y",
      "rad",
      "ang",
    ];

    this.globalShapeVars = [
      // globals
      "frame",
      "time",
      "fps",
      "bass",
      "bass_att",
      "mid",
      "mid_att",
      "treb",
      "treb_att",
      "meshx",
      "meshy",
      "aspectx",
      "aspecty",
      "pixelsx",
      "pixelsy",
      "rand_start",
      "rand_preset",
      // for shape eqs
      "instance",
    ];

    this.shapeBaseVars = [
      "x",
      "y",
      "rad",
      "ang",
      "r",
      "g",
      "b",
      "a",
      "r2",
      "g2",
      "b2",
      "a2",
      "border_r",
      "border_g",
      "border_b",
      "border_a",
      "thickoutline",
      "textured",
      "tex_zoom",
      "tex_ang",
      "additive",
    ];

    this.globalWaveVars = [
      // globals
      "frame",
      "time",
      "fps",
      "bass",
      "bass_att",
      "mid",
      "mid_att",
      "treb",
      "treb_att",
      "meshx",
      "meshy",
      "aspectx",
      "aspecty",
      "pixelsx",
      "pixelsy",
      "rand_start",
      "rand_preset",
      // for wave eqs
      "x",
      "y",
      "sample",
      "value1",
      "value2",
    ];

    this.renderer = new Renderer(this.gl, this.audio, opts);
  }

  loseGLContext() {
    this.gl.getExtension("WEBGL_lose_context").loseContext();
    this.outputGl = null;
  }

  connectAudio(audioNode) {
    this.audioNode = audioNode;
    this.audio.connectAudio(audioNode);
  }

  disconnectAudio(audioNode) {
    this.audio.disconnectAudio(audioNode);
  }

  // Override defaults, but only include variables in default map
  static overrideDefaultVars(baseValsDefaults, baseVals) {
    const combinedVals = {};

    Object.keys(baseValsDefaults).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(baseVals, key)) {
        combinedVals[key] = baseVals[key];
      } else {
        combinedVals[key] = baseValsDefaults[key];
      }
    });

    return combinedVals;
  }

  createQVars() {
    const wasmVars = {};

    this.qs.forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        0
      );
    });

    return wasmVars;
  }

  createTVars() {
    const wasmVars = {};

    this.ts.forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        0
      );
    });

    return wasmVars;
  }

  createPerFramePool(baseVals) {
    const wasmVars = {};

    Object.keys(this.baseValsDefaults).forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        baseVals[key]
      );
    });

    this.globalPerFrameVars.forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        0
      );
    });

    return wasmVars;
  }

  createPerPixelPool(baseVals) {
    const wasmVars = {};

    Object.keys(this.baseValsDefaults).forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        baseVals[key]
      );
    });

    this.globalPerPixelVars.forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        0
      );
    });

    return wasmVars;
  }

  createCustomShapePerFramePool(baseVals) {
    const wasmVars = {};

    Object.keys(this.shapeBaseValsDefaults).forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        baseVals[key]
      );
    });

    this.globalShapeVars.forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        0
      );
    });

    return wasmVars;
  }

  createCustomWavePerFramePool(baseVals) {
    const wasmVars = {};

    Object.keys(this.waveBaseValsDefaults).forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        baseVals[key]
      );
    });

    this.globalWaveVars.forEach((key) => {
      wasmVars[key] = new WebAssembly.Global(
        { value: "f64", mutable: true },
        0
      );
    });

    return wasmVars;
  }

  static makeShapeResetPool(pool, variables, idx) {
    return variables.reduce((acc, variable) => {
      return { ...acc, [`${variable}_${idx}`]: pool[variable] };
    }, {});
  }

  static base64ToArrayBuffer(base64) {
    var binaryString = window.atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async loadPreset(presetMap, blendTime = 0) {
    const preset = JSON.parse(JSON.stringify(presetMap));
    preset.baseVals = Visualizer.overrideDefaultVars(
      this.baseValsDefaults,
      preset.baseVals
    );
    for (let i = 0; i < preset.shapes.length; i++) {
      preset.shapes[i].baseVals = Visualizer.overrideDefaultVars(
        this.shapeBaseValsDefaults,
        preset.shapes[i].baseVals
      );
    }

    for (let i = 0; i < preset.waves.length; i++) {
      preset.waves[i].baseVals = Visualizer.overrideDefaultVars(
        this.waveBaseValsDefaults,
        preset.waves[i].baseVals
      );
    }

    const forceJS = preset.useJS && !this.opts.onlyUseWASM;

    if (
      Object.prototype.hasOwnProperty.call(preset, "init_eqs_eel") &&
      !forceJS
    ) {
      preset.useWASM = true;
      await this.loadWASMPreset(preset, blendTime);
    } else if (!this.opts.onlyUseWASM) {
      if (Object.prototype.hasOwnProperty.call(preset, "init_eqs_str")) {
        this.loadJSPreset(preset, blendTime);
      } else {
        console.warn(
          "Tried to load a JS preset that doesn't have converted strings"
        );
      }
    } else {
      console.warn(
        "Tried to load a preset that doesn't support WASM with onlyUseWASM on"
      );
    }
  }

  async loadWASMPreset(preset, blendTime) {
    const qWasmVars = this.createQVars();
    const tWasmVars = this.createTVars();

    const wasmVarPools = {
      perFrame: { ...qWasmVars, ...this.createPerFramePool(preset.baseVals) },
      perVertex: {
        ...qWasmVars,
        ...this.createPerPixelPool(preset.baseVals),
      },
    };

    const wasmFunctions = {
      presetInit: { pool: "perFrame", code: preset.init_eqs_eel },
      perFrame: { pool: "perFrame", code: preset.frame_eqs_eel },
    };

    if (preset.pixel_eqs_eel !== "") {
      wasmFunctions.perPixel = {
        pool: "perVertex",
        code: preset.pixel_eqs_eel,
      };
    }

    for (let i = 0; i < preset.shapes.length; i++) {
      wasmVarPools[`shapePerFrame${i}`] = {
        ...qWasmVars,
        ...tWasmVars,
        ...this.createCustomShapePerFramePool(preset.shapes[i].baseVals),
      };

      if (preset.shapes[i].baseVals.enabled !== 0) {
        wasmFunctions[`shapes_${i}_init_eqs`] = {
          pool: `shapePerFrame${i}`,
          code: preset.shapes[i].init_eqs_eel,
        };
        wasmFunctions[`shapes_${i}_frame_eqs`] = {
          pool: `shapePerFrame${i}`,
          code: preset.shapes[i].frame_eqs_eel,
        };
      }
    }

    for (let i = 0; i < preset.waves.length; i++) {
      if (preset.waves[i].baseVals.enabled !== 0) {
        wasmVarPools[`wavePerFrame${i}`] = {
          ...qWasmVars,
          ...tWasmVars,
          ...this.createCustomWavePerFramePool(preset.waves[i].baseVals),
        };
        wasmFunctions[`waves_${i}_init_eqs`] = {
          pool: `wavePerFrame${i}`,
          code: preset.waves[i].init_eqs_eel,
        };
        wasmFunctions[`waves_${i}_frame_eqs`] = {
          pool: `wavePerFrame${i}`,
          code: preset.waves[i].frame_eqs_eel,
        };

        if (
          preset.waves[i].point_eqs_eel &&
          preset.waves[i].point_eqs_eel !== ""
        ) {
          wasmFunctions[`waves_${i}_point_eqs`] = {
            pool: `wavePerFrame${i}`,
            code: preset.waves[i].point_eqs_eel,
          };
        }
      }
    }

    const mod = await loadModule({
      pools: wasmVarPools,
      functions: wasmFunctions,
      eelVersion: preset.version || 2,
    });

    // eel-wasm returns null if the function was empty
    const handleEmptyFunction = (f) => {
      return f ? f : () => {};
    };

    const presetFunctionsMod = await ascLoader.instantiate(
      Visualizer.base64ToArrayBuffer(loadPresetFunctionsBuffer()),
      {
        pixelEqs: {
          perPixelEqs: handleEmptyFunction(mod.exports.perPixel),
        },
        // For resetting pixel eq vars
        pixelVarPool: {
          warp: wasmVarPools.perVertex.warp,
          zoom: wasmVarPools.perVertex.zoom,
          zoomexp: wasmVarPools.perVertex.zoomexp,
          cx: wasmVarPools.perVertex.cx,
          cy: wasmVarPools.perVertex.cy,
          sx: wasmVarPools.perVertex.sx,
          sy: wasmVarPools.perVertex.sy,
          dx: wasmVarPools.perVertex.dx,
          dy: wasmVarPools.perVertex.dy,
          rot: wasmVarPools.perVertex.rot,
          x: wasmVarPools.perVertex.x,
          y: wasmVarPools.perVertex.y,
          ang: wasmVarPools.perVertex.ang,
          rad: wasmVarPools.perVertex.rad,
        },
        // For resetting qs/ts
        qVarPool: qWasmVars,
        tVarPool: tWasmVars,
        // For resetting shape vars
        shapePool0: Visualizer.makeShapeResetPool(
          wasmVarPools["shapePerFrame0"],
          this.shapeBaseVars,
          0
        ),
        shapePool1: Visualizer.makeShapeResetPool(
          wasmVarPools["shapePerFrame1"],
          this.shapeBaseVars,
          1
        ),
        shapePool2: Visualizer.makeShapeResetPool(
          wasmVarPools["shapePerFrame2"],
          this.shapeBaseVars,
          2
        ),
        shapePool3: Visualizer.makeShapeResetPool(
          wasmVarPools["shapePerFrame3"],
          this.shapeBaseVars,
          3
        ),
        console: {
          logi: (value) => {
            // eslint-disable-next-line no-console
            console.log("logi: " + value);
          },
          logf: (value) => {
            // eslint-disable-next-line no-console
            console.log("logf: " + value);
          },
        },
        env: {
          abort: () => {
            // No idea why we need this.
          },
        },
      }
    );

    preset.globalPools = wasmVarPools;
    preset.init_eqs = handleEmptyFunction(mod.exports.presetInit);
    preset.frame_eqs = handleEmptyFunction(mod.exports.perFrame);
    preset.save_qs = presetFunctionsMod.exports.saveQs;
    preset.restore_qs = presetFunctionsMod.exports.restoreQs;
    preset.save_ts = presetFunctionsMod.exports.saveTs;
    preset.restore_ts = presetFunctionsMod.exports.restoreTs;
    if (mod.exports.perPixel) {
      preset.pixel_eqs = mod.exports.perPixel;
    }
    preset.pixel_eqs_initialize_array = (meshWidth, meshHeight) => {
      const arrPtr = presetFunctionsMod.exports.createFloat32Array(
        (meshWidth + 1) * (meshHeight + 1) * 2
      );
      preset.pixel_eqs_array = arrPtr;
    };
    preset.pixel_eqs_get_array = () => {
      return presetFunctionsMod.exports.__getFloat32ArrayView(
        preset.pixel_eqs_array
      );
    };
    preset.pixel_eqs_wasm = (...args) =>
      presetFunctionsMod.exports.runPixelEquations(
        preset.pixel_eqs_array,
        ...args
      );

    for (let i = 0; i < preset.shapes.length; i++) {
      if (preset.shapes[i].baseVals.enabled !== 0) {
        preset.shapes[i].init_eqs = handleEmptyFunction(
          mod.exports[`shapes_${i}_init_eqs`]
        );
        // Not wrapped because we check if null in customShapes
        preset.shapes[i].frame_eqs = mod.exports[`shapes_${i}_frame_eqs`];

        preset.shapes[i].frame_eqs_save = () =>
          presetFunctionsMod.exports[`shape${i}_save`]();
        preset.shapes[i].frame_eqs_restore = () =>
          presetFunctionsMod.exports[`shape${i}_restore`]();
      }
    }

    for (let i = 0; i < preset.waves.length; i++) {
      if (preset.waves[i].baseVals.enabled !== 0) {
        const wave = {
          init_eqs: handleEmptyFunction(mod.exports[`waves_${i}_init_eqs`]),
          frame_eqs: handleEmptyFunction(mod.exports[`waves_${i}_frame_eqs`]),
        };

        if (
          preset.waves[i].point_eqs_eel &&
          preset.waves[i].point_eqs_eel !== ""
        ) {
          // Not wrapped because we check if null in customWaves
          wave.point_eqs = mod.exports[`waves_${i}_point_eqs`];
        } else {
          wave.point_eqs = "";
        }

        preset.waves[i] = Object.assign({}, preset.waves[i], wave);
      }
    }

    this.renderer.loadPreset(preset, blendTime);
  }

  loadJSPreset(preset, blendTime) {
    // If init_eqs is already a function, it means we've already prepared the preset to run
    if (typeof preset.init_eqs !== "function") {
      /* eslint-disable no-param-reassign, no-new-func */
      preset.init_eqs = new Function("a", `${preset.init_eqs_str} return a;`);
      preset.frame_eqs = new Function("a", `${preset.frame_eqs_str} return a;`);
      if (preset.pixel_eqs_str && preset.pixel_eqs_str !== "") {
        preset.pixel_eqs = new Function(
          "a",
          `${preset.pixel_eqs_str} return a;`
        );
      } else {
        preset.pixel_eqs = "";
      }

      for (let i = 0; i < preset.shapes.length; i++) {
        if (preset.shapes[i].baseVals.enabled !== 0) {
          preset.shapes[i] = Object.assign({}, preset.shapes[i], {
            init_eqs: new Function(
              "a",
              `${preset.shapes[i].init_eqs_str} return a;`
            ),
            frame_eqs: new Function(
              "a",
              `${preset.shapes[i].frame_eqs_str} return a;`
            ),
          });
        }
      }

      for (let i = 0; i < preset.waves.length; i++) {
        if (preset.waves[i].baseVals.enabled !== 0) {
          const wave = {
            init_eqs: new Function(
              "a",
              `${preset.waves[i].init_eqs_str} return a;`
            ),
            frame_eqs: new Function(
              "a",
              `${preset.waves[i].frame_eqs_str} return a;`
            ),
          };

          if (
            preset.waves[i].point_eqs_str &&
            preset.waves[i].point_eqs_str !== ""
          ) {
            wave.point_eqs = new Function(
              "a",
              `${preset.waves[i].point_eqs_str} return a;`
            );
          } else {
            wave.point_eqs = "";
          }

          preset.waves[i] = Object.assign({}, preset.waves[i], wave);
        }
      }
      /* eslint-enable no-param-reassign, no-new-func */
    }
    this.renderer.loadPreset(preset, blendTime);
  }

  loadExtraImages(imageData) {
    this.renderer.loadExtraImages(imageData);
  }

  setRendererSize(width, height, opts = {}) {
    this.internalCanvas.width = width;
    this.internalCanvas.height = height;
    this.renderer.setRendererSize(width, height, opts);
  }

  setInternalMeshSize(width, height) {
    this.renderer.setInternalMeshSize(width, height);
  }

  setOutputAA(useAA) {
    this.renderer.setOutputAA(useAA);
  }

  setCanvas(canvas) {
    this.outputGl = canvas.getContext('2d');
  }

  render(opts) {
    const renderOutput = this.renderer.render(opts);

    if (this.outputGl) {
      this.outputGl.drawImage(this.internalCanvas, 0, 0);
    }

    return renderOutput;
  }

  launchSongTitleAnim(text) {
    this.renderer.launchSongTitleAnim(text);
  }

  toDataURL() {
    return this.renderer.toDataURL();
  }

  warpBufferToDataURL() {
    return this.renderer.warpBufferToDataURL();
  }
}
