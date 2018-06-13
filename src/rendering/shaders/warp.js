import ShaderUtils from './shaderUtils';

export default class WarpShader {
  constructor (gl, noise, image, opts = {}) {
    this.gl = gl;
    this.noise = noise;
    this.image = image;

    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.buildPositions();

    this.indexBuf = gl.createBuffer();
    this.positionVertexBuf = this.gl.createBuffer();
    this.warpUvVertexBuf = this.gl.createBuffer();
    this.warpColorVertexBuf = this.gl.createBuffer();

    this.floatPrecision = ShaderUtils.getFragmentFloatPrecision(this.gl);
    this.createShader();

    this.mainSampler = this.gl.createSampler();
    this.mainSamplerFW = this.gl.createSampler();
    this.mainSamplerFC = this.gl.createSampler();
    this.mainSamplerPW = this.gl.createSampler();
    this.mainSamplerPC = this.gl.createSampler();

    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.samplerParameteri(this.mainSamplerFW, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(this.mainSamplerFW, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(this.mainSamplerFW, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.samplerParameteri(this.mainSamplerFW, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.samplerParameteri(this.mainSamplerFC, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(this.mainSamplerFC, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(this.mainSamplerFC, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(this.mainSamplerFC, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.samplerParameteri(this.mainSamplerPW, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.samplerParameteri(this.mainSamplerPW, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.samplerParameteri(this.mainSamplerPW, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.samplerParameteri(this.mainSamplerPW, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.samplerParameteri(this.mainSamplerPC, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.samplerParameteri(this.mainSamplerPC, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.samplerParameteri(this.mainSamplerPC, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(this.mainSamplerPC, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // based on https://github.com/mrdoob/three.js/blob/master/src/geometries/PlaneGeometry.js
  buildPositions () {
    const width = 2;
    const height = 2;

    const widthHalf = width / 2;
    const heightHalf = height / 2;

    const gridX = this.mesh_width;
    const gridY = this.mesh_height;

    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;

    const segmentWidth = (width / gridX);
    const segmentHeight = (height / gridY);

    const vertices = [];
    for (let iy = 0; iy < gridY1; iy++) {
      const y = (iy * segmentHeight) - heightHalf;
      for (let ix = 0; ix < gridX1; ix++) {
        const x = (ix * segmentWidth) - widthHalf;
        vertices.push(x, -y, 0);
      }
    }

    const indices = [];
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = ix + (gridX1 * iy);
        const b = ix + (gridX1 * (iy + 1));
        const c = (ix + 1) + (gridX1 * (iy + 1));
        const d = (ix + 1) + (gridX1 * iy);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    this.vertices = new Float32Array(vertices);
    this.indices = new Uint16Array(indices);
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

    this.buildPositions();
  }

  createShader (shaderText = '') {
    let fragShaderText;
    let fragShaderHeaderText;
    if (shaderText.length === 0) {
      fragShaderText = 'ret = texture(sampler_main, uv).rgb * decay;';
      fragShaderHeaderText = '';
    } else {
      const shaderParts = ShaderUtils.getShaderParts(shaderText);
      fragShaderHeaderText = shaderParts[0];
      fragShaderText = shaderParts[1];
    }

    fragShaderText = fragShaderText.replace(/texture2D/g, 'texture');
    fragShaderText = fragShaderText.replace(/texture3D/g, 'texture');

    this.userTextures = ShaderUtils.getUserSamplers(fragShaderHeaderText);

    this.shaderProgram = this.gl.createProgram();

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertShader, `#version 300 es
                                      precision ${this.floatPrecision} float;
                                      const vec2 halfmad = vec2(0.5);
                                      in vec2 aPos;
                                      in vec2 aWarpUv;
                                      in vec4 aWarpColor;
                                      out vec2 uv;
                                      out vec2 uv_orig;
                                      out vec4 vColor;
                                      void main(void) {
                                        gl_Position = vec4(aPos, 0.0, 1.0);
                                        uv_orig = aPos * halfmad + halfmad;
                                        uv = aWarpUv;
                                        vColor = aWarpColor;
                                      }`);
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragShader, `#version 300 es
                                      precision ${this.floatPrecision} float;
                                      precision highp int;
                                      precision mediump sampler2D;
                                      precision mediump sampler3D;

                                      in vec2 uv;
                                      in vec2 uv_orig;
                                      in vec4 vColor;
                                      out vec4 fragColor;
                                      uniform sampler2D sampler_main;
                                      uniform sampler2D sampler_fw_main;
                                      uniform sampler2D sampler_fc_main;
                                      uniform sampler2D sampler_pw_main;
                                      uniform sampler2D sampler_pc_main;
                                      uniform sampler2D sampler_blur1;
                                      uniform sampler2D sampler_blur2;
                                      uniform sampler2D sampler_blur3;
                                      uniform sampler2D sampler_noise_lq;
                                      uniform sampler2D sampler_noise_lq_lite;
                                      uniform sampler2D sampler_noise_mq;
                                      uniform sampler2D sampler_noise_hq;
                                      uniform sampler2D sampler_pw_noise_lq;
                                      uniform sampler3D sampler_noisevol_lq;
                                      uniform sampler3D sampler_noisevol_hq;
                                      uniform float time;
                                      uniform float decay;
                                      uniform vec2 resolution;
                                      uniform vec4 aspect;
                                      uniform vec4 texsize;
                                      uniform vec4 texsize_noise_lq;
                                      uniform vec4 texsize_noise_mq;
                                      uniform vec4 texsize_noise_hq;
                                      uniform vec4 texsize_noise_lq_lite;
                                      uniform vec4 texsize_noisevol_lq;
                                      uniform vec4 texsize_noisevol_hq;

                                      uniform float bass;
                                      uniform float mid;
                                      uniform float treb;
                                      uniform float vol;
                                      uniform float bass_att;
                                      uniform float mid_att;
                                      uniform float treb_att;
                                      uniform float vol_att;

                                      uniform float frame;
                                      uniform float fps;

                                      uniform vec4 _qa;
                                      uniform vec4 _qb;
                                      uniform vec4 _qc;
                                      uniform vec4 _qd;
                                      uniform vec4 _qe;
                                      uniform vec4 _qf;
                                      uniform vec4 _qg;
                                      uniform vec4 _qh;

                                      #define q1 _qa.x
                                      #define q2 _qa.y
                                      #define q3 _qa.z
                                      #define q4 _qa.w
                                      #define q5 _qb.x
                                      #define q6 _qb.y
                                      #define q7 _qb.z
                                      #define q8 _qb.w
                                      #define q9 _qc.x
                                      #define q10 _qc.y
                                      #define q11 _qc.z
                                      #define q12 _qc.w
                                      #define q13 _qd.x
                                      #define q14 _qd.y
                                      #define q15 _qd.z
                                      #define q16 _qd.w
                                      #define q17 _qe.x
                                      #define q18 _qe.y
                                      #define q19 _qe.z
                                      #define q20 _qe.w
                                      #define q21 _qf.x
                                      #define q22 _qf.y
                                      #define q23 _qf.z
                                      #define q24 _qf.w
                                      #define q25 _qg.x
                                      #define q26 _qg.y
                                      #define q27 _qg.z
                                      #define q28 _qg.w
                                      #define q29 _qh.x
                                      #define q30 _qh.y
                                      #define q31 _qh.z
                                      #define q32 _qh.w

                                      uniform vec4 slow_roam_cos;
                                      uniform vec4 roam_cos;
                                      uniform vec4 slow_roam_sin;
                                      uniform vec4 roam_sin;

                                      uniform float blur1_min;
                                      uniform float blur1_max;
                                      uniform float blur2_min;
                                      uniform float blur2_max;
                                      uniform float blur3_min;
                                      uniform float blur3_max;

                                      uniform float scale1;
                                      uniform float scale2;
                                      uniform float scale3;
                                      uniform float bias1;
                                      uniform float bias2;
                                      uniform float bias3;

                                      uniform vec4 rand_frame;
                                      uniform vec4 rand_preset;

                                      float PI = 3.14159265358979323846264;

                                      ${fragShaderHeaderText}

                                      void main(void) {
                                        vec3 ret;
                                        float rad = length(uv_orig - 0.5);
                                        float ang = atan(uv_orig.x - 0.5, uv_orig.y - 0.5);

                                        ${fragShaderText}

                                        fragColor = vec4(ret, 1.0) * vColor;
                                      }`);
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.shaderProgram, vertShader);
    this.gl.attachShader(this.shaderProgram, fragShader);
    this.gl.linkProgram(this.shaderProgram);

    this.positionLocation = this.gl.getAttribLocation(this.shaderProgram, 'aPos');
    this.warpUvLocation = this.gl.getAttribLocation(this.shaderProgram, 'aWarpUv');
    this.warpColorLocation = this.gl.getAttribLocation(this.shaderProgram, 'aWarpColor');
    this.textureLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_main');
    this.textureFWLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_fw_main');
    this.textureFCLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_fc_main');
    this.texturePWLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_pw_main');
    this.texturePCLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_pc_main');
    this.blurTexture1Loc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_blur1');
    this.blurTexture2Loc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_blur2');
    this.blurTexture3Loc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_blur3');
    this.noiseLQLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_noise_lq');
    this.noiseMQLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_noise_mq');
    this.noiseHQLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_noise_hq');
    this.noiseLQLiteLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_noise_lq_lite');
    this.noisePointLQLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_pw_noise_lq');
    this.noiseVolLQLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_noisevol_lq');
    this.noiseVolHQLoc = this.gl.getUniformLocation(this.shaderProgram, 'sampler_noisevol_hq');
    this.decayLoc = this.gl.getUniformLocation(this.shaderProgram, 'decay');
    this.texsizeLoc = this.gl.getUniformLocation(this.shaderProgram, 'texsize');
    this.texsizeNoiseLQLoc = this.gl.getUniformLocation(this.shaderProgram, 'texsize_noise_lq');
    this.texsizeNoiseMQLoc = this.gl.getUniformLocation(this.shaderProgram, 'texsize_noise_mq');
    this.texsizeNoiseHQLoc = this.gl.getUniformLocation(this.shaderProgram, 'texsize_noise_hq');
    this.texsizeNoiseLQLiteLoc = this.gl.getUniformLocation(this.shaderProgram,
                                                            'texsize_noise_lq_lite');
    this.texsizeNoiseVolLQLoc = this.gl.getUniformLocation(this.shaderProgram,
                                                           'texsize_noisevol_lq');
    this.texsizeNoiseVolHQLoc = this.gl.getUniformLocation(this.shaderProgram,
                                                           'texsize_noisevol_hq');
    this.resolutionLoc = this.gl.getUniformLocation(this.shaderProgram, 'resolution');
    this.aspectLoc = this.gl.getUniformLocation(this.shaderProgram, 'aspect');
    this.bassLoc = this.gl.getUniformLocation(this.shaderProgram, 'bass');
    this.midLoc = this.gl.getUniformLocation(this.shaderProgram, 'mid');
    this.trebLoc = this.gl.getUniformLocation(this.shaderProgram, 'treb');
    this.volLoc = this.gl.getUniformLocation(this.shaderProgram, 'vol');
    this.bassAttLoc = this.gl.getUniformLocation(this.shaderProgram, 'bass_att');
    this.midAttLoc = this.gl.getUniformLocation(this.shaderProgram, 'mid_att');
    this.trebAttLoc = this.gl.getUniformLocation(this.shaderProgram, 'treb_att');
    this.volAttLoc = this.gl.getUniformLocation(this.shaderProgram, 'vol_att');
    this.timeLoc = this.gl.getUniformLocation(this.shaderProgram, 'time');
    this.frameLoc = this.gl.getUniformLocation(this.shaderProgram, 'frame');
    this.fpsLoc = this.gl.getUniformLocation(this.shaderProgram, 'fps');
    this.blur1MinLoc = this.gl.getUniformLocation(this.shaderProgram, 'blur1_min');
    this.blur1MaxLoc = this.gl.getUniformLocation(this.shaderProgram, 'blur1_max');
    this.blur2MinLoc = this.gl.getUniformLocation(this.shaderProgram, 'blur2_min');
    this.blur2MaxLoc = this.gl.getUniformLocation(this.shaderProgram, 'blur2_max');
    this.blur3MinLoc = this.gl.getUniformLocation(this.shaderProgram, 'blur3_min');
    this.blur3MaxLoc = this.gl.getUniformLocation(this.shaderProgram, 'blur3_max');
    this.scale1Loc = this.gl.getUniformLocation(this.shaderProgram, 'scale1');
    this.scale2Loc = this.gl.getUniformLocation(this.shaderProgram, 'scale2');
    this.scale3Loc = this.gl.getUniformLocation(this.shaderProgram, 'scale3');
    this.bias1Loc = this.gl.getUniformLocation(this.shaderProgram, 'bias1');
    this.bias2Loc = this.gl.getUniformLocation(this.shaderProgram, 'bias2');
    this.bias3Loc = this.gl.getUniformLocation(this.shaderProgram, 'bias3');
    this.randPresetLoc = this.gl.getUniformLocation(this.shaderProgram, 'rand_preset');
    this.randFrameLoc = this.gl.getUniformLocation(this.shaderProgram, 'rand_frame');

    this.qaLoc = this.gl.getUniformLocation(this.shaderProgram, '_qa');
    this.qbLoc = this.gl.getUniformLocation(this.shaderProgram, '_qb');
    this.qcLoc = this.gl.getUniformLocation(this.shaderProgram, '_qc');
    this.qdLoc = this.gl.getUniformLocation(this.shaderProgram, '_qd');
    this.qeLoc = this.gl.getUniformLocation(this.shaderProgram, '_qe');
    this.qfLoc = this.gl.getUniformLocation(this.shaderProgram, '_qf');
    this.qgLoc = this.gl.getUniformLocation(this.shaderProgram, '_qg');
    this.qhLoc = this.gl.getUniformLocation(this.shaderProgram, '_qh');

    this.slowRoamCosLoc = this.gl.getUniformLocation(this.shaderProgram, 'slow_roam_cos');
    this.roamCosLoc = this.gl.getUniformLocation(this.shaderProgram, 'roam_cos');
    this.slowRoamSinLoc = this.gl.getUniformLocation(this.shaderProgram, 'slow_roam_sin');
    this.roamSinLoc = this.gl.getUniformLocation(this.shaderProgram, 'roam_sin');

    for (let i = 0; i < this.userTextures.length; i++) {
      const userTexture = this.userTextures[i];
      userTexture.textureLoc =
        this.gl.getUniformLocation(this.shaderProgram, `sampler_${userTexture.sampler}`);
    }
  }

  updateShader (shaderText) {
    this.createShader(shaderText);
  }

  bindBlurVals (blurMins, blurMaxs) {
    const blurMin1 = blurMins[0];
    const blurMin2 = blurMins[1];
    const blurMin3 = blurMins[2];
    const blurMax1 = blurMaxs[0];
    const blurMax2 = blurMaxs[1];
    const blurMax3 = blurMaxs[2];

    const scale1 = blurMax1 - blurMin1;
    const bias1 = blurMin1;

    const scale2 = blurMax2 - blurMin2;
    const bias2 = blurMin2;

    const scale3 = blurMax3 - blurMin3;
    const bias3 = blurMin3;

    this.gl.uniform1f(this.blur1MinLoc, blurMin1);
    this.gl.uniform1f(this.blur1MaxLoc, blurMax1);
    this.gl.uniform1f(this.blur2MinLoc, blurMin2);
    this.gl.uniform1f(this.blur2MaxLoc, blurMax2);
    this.gl.uniform1f(this.blur3MinLoc, blurMin3);
    this.gl.uniform1f(this.blur3MaxLoc, blurMax3);
    this.gl.uniform1f(this.scale1Loc, scale1);
    this.gl.uniform1f(this.scale2Loc, scale2);
    this.gl.uniform1f(this.scale3Loc, scale3);
    this.gl.uniform1f(this.bias1Loc, bias1);
    this.gl.uniform1f(this.bias2Loc, bias2);
    this.gl.uniform1f(this.bias3Loc, bias3);
  }

  renderQuadTexture (blending, texture, blurTexture1, blurTexture2, blurTexture3,
                     blurMins, blurMaxs, mdVSFrame, warpUVs, warpColor) {
    this.gl.useProgram(this.shaderProgram);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuf);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indices, this.gl.STATIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.positionLocation, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.positionLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.warpUvVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, warpUVs, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.warpUvLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.warpUvLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.warpColorVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, warpColor, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.warpColorLocation, 4, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.warpColorLocation);

    const wrapping = (mdVSFrame.wrap !== 0) ? this.gl.REPEAT : this.gl.CLAMP_TO_EDGE;
    this.gl.samplerParameteri(this.mainSampler, this.gl.TEXTURE_WRAP_S, wrapping);
    this.gl.samplerParameteri(this.mainSampler, this.gl.TEXTURE_WRAP_T, wrapping);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.bindSampler(0, this.mainSampler);
    this.gl.uniform1i(this.textureLoc, 0);

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.bindSampler(1, this.mainSamplerFW);
    this.gl.uniform1i(this.textureFWLoc, 1);

    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.bindSampler(2, this.mainSamplerFC);
    this.gl.uniform1i(this.textureFCLoc, 2);

    this.gl.activeTexture(this.gl.TEXTURE3);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.bindSampler(3, this.mainSamplerPW);
    this.gl.uniform1i(this.texturePWLoc, 3);

    this.gl.activeTexture(this.gl.TEXTURE4);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.bindSampler(4, this.mainSamplerPC);
    this.gl.uniform1i(this.texturePCLoc, 4);

    this.gl.activeTexture(this.gl.TEXTURE5);
    this.gl.bindTexture(this.gl.TEXTURE_2D, blurTexture1);
    this.gl.uniform1i(this.blurTexture1Loc, 5);

    this.gl.activeTexture(this.gl.TEXTURE6);
    this.gl.bindTexture(this.gl.TEXTURE_2D, blurTexture2);
    this.gl.uniform1i(this.blurTexture2Loc, 6);

    this.gl.activeTexture(this.gl.TEXTURE7);
    this.gl.bindTexture(this.gl.TEXTURE_2D, blurTexture3);
    this.gl.uniform1i(this.blurTexture3Loc, 7);

    this.gl.activeTexture(this.gl.TEXTURE8);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noise.noiseTexLQ);
    this.gl.uniform1i(this.noiseLQLoc, 8);

    this.gl.activeTexture(this.gl.TEXTURE9);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noise.noiseTexMQ);
    this.gl.uniform1i(this.noiseMQLoc, 9);

    this.gl.activeTexture(this.gl.TEXTURE10);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noise.noiseTexHQ);
    this.gl.uniform1i(this.noiseHQLoc, 10);

    this.gl.activeTexture(this.gl.TEXTURE11);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noise.noiseTexLQLite);
    this.gl.uniform1i(this.noiseLQLiteLoc, 11);

    this.gl.activeTexture(this.gl.TEXTURE12);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noise.noiseTexLQ);
    this.gl.bindSampler(12, this.noise.noiseTexPointLQ);
    this.gl.uniform1i(this.noisePointLQLoc, 12);

    this.gl.activeTexture(this.gl.TEXTURE13);
    this.gl.bindTexture(this.gl.TEXTURE_3D, this.noise.noiseTexVolLQ);
    this.gl.uniform1i(this.noiseVolLQLoc, 13);

    this.gl.activeTexture(this.gl.TEXTURE14);
    this.gl.bindTexture(this.gl.TEXTURE_3D, this.noise.noiseTexVolHQ);
    this.gl.uniform1i(this.noiseVolHQLoc, 14);

    for (let i = 0; i < this.userTextures.length; i++) {
      const userTexture = this.userTextures[i];
      this.gl.activeTexture(this.gl.TEXTURE15 + i);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.image.getTexture(userTexture.sampler));
      this.gl.uniform1i(userTexture.textureLoc, 15 + i);
    }

    this.gl.uniform1f(this.decayLoc, mdVSFrame.decay);
    this.gl.uniform2fv(this.resolutionLoc, [this.texsizeX, this.texsizeY]);
    this.gl.uniform4fv(this.aspectLoc,
                       [this.aspectx, this.aspecty, this.invAspectx, this.invAspecty]);
    this.gl.uniform4fv(this.texsizeLoc, [
      this.texsizeX, this.texsizeY, 1.0 / this.texsizeX, 1.0 / this.texsizeY
    ]);
    this.gl.uniform4fv(this.texsizeNoiseLQLoc, [256, 256, 1 / 256, 1 / 256]);
    this.gl.uniform4fv(this.texsizeNoiseMQLoc, [256, 256, 1 / 256, 1 / 256]);
    this.gl.uniform4fv(this.texsizeNoiseHQLoc, [256, 256, 1 / 256, 1 / 256]);
    this.gl.uniform4fv(this.texsizeNoiseLQLiteLoc, [32, 32, 1 / 32, 1 / 32]);
    this.gl.uniform4fv(this.texsizeNoiseVolLQLoc, [32, 32, 1 / 32, 1 / 32]);
    this.gl.uniform4fv(this.texsizeNoiseVolHQLoc, [32, 32, 1 / 32, 1 / 32]);

    this.gl.uniform1f(this.bassLoc, mdVSFrame.bass);
    this.gl.uniform1f(this.midLoc, mdVSFrame.mid);
    this.gl.uniform1f(this.trebLoc, mdVSFrame.treb);
    this.gl.uniform1f(this.volLoc, (mdVSFrame.bass + mdVSFrame.mid + mdVSFrame.treb) / 3);
    this.gl.uniform1f(this.bassAttLoc, mdVSFrame.bass_att);
    this.gl.uniform1f(this.midAttLoc, mdVSFrame.mid_att);
    this.gl.uniform1f(this.trebAttLoc, mdVSFrame.treb_att);
    this.gl.uniform1f(this.volAttLoc, (mdVSFrame.bass_att + mdVSFrame.mid_att +
                                       mdVSFrame.treb_att) / 3);
    this.gl.uniform1f(this.timeLoc, mdVSFrame.time);
    this.gl.uniform1f(this.frameLoc, mdVSFrame.frame);
    this.gl.uniform1f(this.fpsLoc, mdVSFrame.fps);
    this.gl.uniform4fv(this.randPresetLoc, mdVSFrame.rand_preset);
    this.gl.uniform4fv(this.randFrameLoc, new Float32Array([
      Math.random(), Math.random(), Math.random(), Math.random()
    ]));

    this.gl.uniform4fv(this.qaLoc, new Float32Array([
      mdVSFrame.q1 || 0, mdVSFrame.q2 || 0, mdVSFrame.q3 || 0, mdVSFrame.q4 || 0
    ]));
    this.gl.uniform4fv(this.qbLoc, new Float32Array([
      mdVSFrame.q5 || 0, mdVSFrame.q6 || 0, mdVSFrame.q7 || 0, mdVSFrame.q8 || 0
    ]));
    this.gl.uniform4fv(this.qcLoc, new Float32Array([
      mdVSFrame.q9 || 0, mdVSFrame.q10 || 0, mdVSFrame.q11 || 0, mdVSFrame.q12 || 0
    ]));
    this.gl.uniform4fv(this.qdLoc, new Float32Array([
      mdVSFrame.q13 || 0, mdVSFrame.q14 || 0, mdVSFrame.q15 || 0, mdVSFrame.q16 || 0
    ]));
    this.gl.uniform4fv(this.qeLoc, new Float32Array([
      mdVSFrame.q17 || 0, mdVSFrame.q18 || 0, mdVSFrame.q19 || 0, mdVSFrame.q20 || 0
    ]));
    this.gl.uniform4fv(this.qfLoc, new Float32Array([
      mdVSFrame.q21 || 0, mdVSFrame.q22 || 0, mdVSFrame.q23 || 0, mdVSFrame.q24 || 0
    ]));
    this.gl.uniform4fv(this.qgLoc, new Float32Array([
      mdVSFrame.q25 || 0, mdVSFrame.q26 || 0, mdVSFrame.q27 || 0, mdVSFrame.q28 || 0
    ]));
    this.gl.uniform4fv(this.qhLoc, new Float32Array([
      mdVSFrame.q29 || 0, mdVSFrame.q30 || 0, mdVSFrame.q31 || 0, mdVSFrame.q32 || 0
    ]));
    this.gl.uniform4fv(this.slowRoamCosLoc, [
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 0.005)),
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 0.008)),
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 0.013)),
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 0.022))
    ]);
    this.gl.uniform4fv(this.roamCosLoc, [
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 0.3)),
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 1.3)),
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 5.0)),
      0.5 + (0.5 * Math.cos(mdVSFrame.time * 20.0))
    ]);
    this.gl.uniform4fv(this.slowRoamSinLoc, [
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 0.005)),
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 0.008)),
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 0.013)),
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 0.022))
    ]);
    this.gl.uniform4fv(this.roamSinLoc, [
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 0.3)),
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 1.3)),
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 5.0)),
      0.5 + (0.5 * Math.sin(mdVSFrame.time * 20.0))
    ]);

    this.bindBlurVals(blurMins, blurMaxs);

    if (blending) {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    } else {
      this.gl.disable(this.gl.BLEND);
    }

    this.gl.drawElements(this.gl.TRIANGLES, this.indices.length, this.gl.UNSIGNED_SHORT, 0);

    if (!blending) {
      this.gl.enable(this.gl.BLEND);
    }
  }
}
