import ShaderUtils from '../shaderUtils';

export default class BlurHorizontal {
  constructor (gl, blurLevel) {
    this.gl = gl;
    this.blurLevel = blurLevel;

    const w = [4.0, 3.8, 3.5, 2.9, 1.9, 1.2, 0.7, 0.3];
    const w1H = w[0] + w[1];
    const w2H = w[2] + w[3];
    const w3H = w[4] + w[5];
    const w4H = w[6] + w[7];
    const d1H = 0 + ((2 * w[1]) / w1H);
    const d2H = 2 + ((2 * w[3]) / w2H);
    const d3H = 4 + ((2 * w[5]) / w3H);
    const d4H = 6 + ((2 * w[7]) / w4H);

    this.ws = new Float32Array([w1H, w2H, w3H, w4H]);
    this.ds = new Float32Array([d1H, d2H, d3H, d4H]);
    this.wDiv = 0.5 / (w1H + w2H + w3H + w4H);

    this.positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    this.vertexBuf = this.gl.createBuffer();

    this.floatPrecision = ShaderUtils.getFragmentFloatPrecision(this.gl);
    this.createShader();
  }

  createShader () {
    this.shaderProgram = this.gl.createProgram();

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertShader, `#version 300 es
                                      const vec2 halfmad = vec2(0.5);
                                      in vec2 aPos;
                                      out vec2 uv;
                                      void main(void) {
                                        gl_Position = vec4(aPos, 0.0, 1.0);
                                        uv = aPos * halfmad + halfmad;
                                      }`);
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragShader,
      `#version 300 es
       precision ${this.floatPrecision} float;
       precision highp int;
       precision mediump sampler2D;

       in vec2 uv;
       out vec4 fragColor;
       uniform sampler2D uTexture;
       uniform vec4 texsize;
       uniform float scale;
       uniform float bias;
       uniform vec4 ws;
       uniform vec4 ds;
       uniform float wdiv;

       void main(void) {
         float w1 = ws[0];
         float w2 = ws[1];
         float w3 = ws[2];
         float w4 = ws[3];
         float d1 = ds[0];
         float d2 = ds[1];
         float d3 = ds[2];
         float d4 = ds[3];

         vec2 uv2 = uv.xy;

         vec3 blur =
           ( texture(uTexture, uv2 + vec2( d1 * texsize.z,0.0) ).xyz
           + texture(uTexture, uv2 + vec2(-d1 * texsize.z,0.0) ).xyz) * w1 +
           ( texture(uTexture, uv2 + vec2( d2 * texsize.z,0.0) ).xyz
           + texture(uTexture, uv2 + vec2(-d2 * texsize.z,0.0) ).xyz) * w2 +
           ( texture(uTexture, uv2 + vec2( d3 * texsize.z,0.0) ).xyz
           + texture(uTexture, uv2 + vec2(-d3 * texsize.z,0.0) ).xyz) * w3 +
           ( texture(uTexture, uv2 + vec2( d4 * texsize.z,0.0) ).xyz
           + texture(uTexture, uv2 + vec2(-d4 * texsize.z,0.0) ).xyz) * w4;

         blur.xyz *= wdiv;
         blur.xyz = blur.xyz * scale + bias;

         fragColor = vec4(blur, 1.0);
       }`);
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.shaderProgram, vertShader);
    this.gl.attachShader(this.shaderProgram, fragShader);
    this.gl.linkProgram(this.shaderProgram);

    this.positionLocation = this.gl.getAttribLocation(this.shaderProgram, 'aPos');
    this.textureLoc = this.gl.getUniformLocation(this.shaderProgram, 'uTexture');
    this.texsizeLocation = this.gl.getUniformLocation(this.shaderProgram, 'texsize');
    this.scaleLoc = this.gl.getUniformLocation(this.shaderProgram, 'scale');
    this.biasLoc = this.gl.getUniformLocation(this.shaderProgram, 'bias');
    this.wsLoc = this.gl.getUniformLocation(this.shaderProgram, 'ws');
    this.dsLocation = this.gl.getUniformLocation(this.shaderProgram, 'ds');
    this.wdivLoc = this.gl.getUniformLocation(this.shaderProgram, 'wdiv');
  }

  getScaleAndBias (blurMins, blurMaxs) {
    const scale = [1, 1, 1];
    const bias = [0, 0, 0];

    let tempMin;
    let tempMax;
    scale[0] = 1.0 / (blurMaxs[0] - blurMins[0]);
    bias[0] = -blurMins[0] * scale[0];
    tempMin = (blurMins[1] - blurMins[0]) / (blurMaxs[0] - blurMins[0]);
    tempMax = (blurMaxs[1] - blurMins[0]) / (blurMaxs[0] - blurMins[0]);
    scale[1] = 1.0 / (tempMax - tempMin);
    bias[1] = -tempMin * scale[1];
    tempMin = (blurMins[2] - blurMins[1]) / (blurMaxs[1] - blurMins[1]);
    tempMax = (blurMaxs[2] - blurMins[1]) / (blurMaxs[1] - blurMins[1]);
    scale[2] = 1.0 / (tempMax - tempMin);
    bias[2] = -tempMin * scale[2];

    return {
      scale: scale[this.blurLevel],
      bias: bias[this.blurLevel],
    };
  }

  renderQuadTexture (texture, mdVSFrame, blurMins, blurMaxs, srcTexsize) {
    this.gl.useProgram(this.shaderProgram);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.positionLocation);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    this.gl.uniform1i(this.textureLoc, 0);

    const { scale, bias } = this.getScaleAndBias(blurMins, blurMaxs);

    this.gl.uniform4fv(this.texsizeLocation, [
      srcTexsize[0], srcTexsize[1], 1.0 / srcTexsize[0], 1.0 / srcTexsize[1]
    ]);
    this.gl.uniform1f(this.scaleLoc, scale);
    this.gl.uniform1f(this.biasLoc, bias);
    this.gl.uniform4fv(this.wsLoc, this.ws);
    this.gl.uniform4fv(this.dsLocation, this.ds);
    this.gl.uniform1f(this.wdivLoc, this.wDiv);

    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
