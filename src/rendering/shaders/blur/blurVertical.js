import ShaderUtils from '../shaderUtils';

export default class BlurVertical {
  constructor (gl, blurLevel) {
    this.gl = gl;
    this.blurLevel = blurLevel;

    const w = [4.0, 3.8, 3.5, 2.9, 1.9, 1.2, 0.7, 0.3];
    const w1V = w[0] + w[1] + w[2] + w[3];
    const w2V = w[4] + w[5] + w[6] + w[7];
    const d1V = 0 + (2 * ((w[2] + w[3]) / w1V));
    const d2V = 2 + (2 * ((w[6] + w[7]) / w2V));

    this.wds = new Float32Array([w1V, w2V, d1V, d2V]);
    this.wDiv = 1.0 / ((w1V + w2V) * 2);

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
       uniform float ed1;
       uniform float ed2;
       uniform float ed3;
       uniform vec4 wds;
       uniform float wdiv;

       void main(void) {
         float w1 = wds[0];
         float w2 = wds[1];
         float d1 = wds[2];
         float d2 = wds[3];

         vec2 uv2 = uv.xy;

         vec3 blur =
           ( texture(uTexture, uv2 + vec2(0.0, d1 * texsize.w) ).xyz
           + texture(uTexture, uv2 + vec2(0.0,-d1 * texsize.w) ).xyz) * w1 +
           ( texture(uTexture, uv2 + vec2(0.0, d2 * texsize.w) ).xyz
           + texture(uTexture, uv2 + vec2(0.0,-d2 * texsize.w) ).xyz) * w2;

         blur.xyz *= wdiv;

         float t = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
         t = sqrt(t);
         t = ed1 + ed2 * clamp(t * ed3, 0.0, 1.0);
         blur.xyz *= t;

         fragColor = vec4(blur, 1.0);
       }`);
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.shaderProgram, vertShader);
    this.gl.attachShader(this.shaderProgram, fragShader);
    this.gl.linkProgram(this.shaderProgram);

    this.positionLocation = this.gl.getAttribLocation(this.shaderProgram, 'aPos');
    this.textureLoc = this.gl.getUniformLocation(this.shaderProgram, 'uTexture');
    this.texsizeLocation = this.gl.getUniformLocation(this.shaderProgram, 'texsize');
    this.ed1Loc = this.gl.getUniformLocation(this.shaderProgram, 'ed1');
    this.ed2Loc = this.gl.getUniformLocation(this.shaderProgram, 'ed2');
    this.ed3Loc = this.gl.getUniformLocation(this.shaderProgram, 'ed3');
    this.wdsLocation = this.gl.getUniformLocation(this.shaderProgram, 'wds');
    this.wdivLoc = this.gl.getUniformLocation(this.shaderProgram, 'wdiv');
  }

  renderQuadTexture (texture, mdVSFrame, srcTexsize) {
    this.gl.useProgram(this.shaderProgram);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.positionLocation);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    this.gl.uniform1i(this.textureLoc, 0);

    const b1ed = this.blurLevel === 0 ? mdVSFrame.b1ed : 0.0;

    this.gl.uniform4fv(this.texsizeLocation, [
      srcTexsize[0], srcTexsize[1], 1.0 / srcTexsize[0], 1.0 / srcTexsize[1]
    ]);
    this.gl.uniform1f(this.ed1Loc, (1.0 - b1ed));
    this.gl.uniform1f(this.ed2Loc, b1ed);
    this.gl.uniform1f(this.ed3Loc, 5.0);
    this.gl.uniform4fv(this.wdsLocation, this.wds);
    this.gl.uniform1f(this.wdivLoc, this.wDiv);

    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
