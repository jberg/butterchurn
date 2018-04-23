import ShaderUtils from '../shaders/shaderUtils';

export default class Border {
  constructor (gl, opts = {}) {
    this.gl = gl;

    this.positions = new Float32Array(72);

    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.floatPrecision = ShaderUtils.getFragmentFloatPrecision(this.gl);
    this.createShader();

    this.vertexBuf = this.gl.createBuffer();
  }

  updateGlobals (opts) {
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
                                      void main(void) {
                                        gl_Position = vec4(aPos, 1.0);
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
  }

  addTriangle (offset, point1, point2, point3) {
    this.positions[offset + 0] = point1[0];
    this.positions[offset + 1] = point1[1];
    this.positions[offset + 2] = point1[2];

    this.positions[offset + 3] = point2[0];
    this.positions[offset + 4] = point2[1];
    this.positions[offset + 5] = point2[2];

    this.positions[offset + 6] = point3[0];
    this.positions[offset + 7] = point3[1];
    this.positions[offset + 8] = point3[2];
  }

  // based on https://github.com/mrdoob/three.js/blob/master/src/geometries/PlaneGeometry.js
  generateBorder (borderColor, borderSize, prevBorderSize) {
    if (borderSize > 0 && borderColor[3] > 0) {
      const width = 2;
      const height = 2;

      const widthHalf = width / 2;
      const heightHalf = height / 2;

      const prevBorderWidth = prevBorderSize / 2;
      const borderWidth = (borderSize / 2) + prevBorderWidth;

      const prevBorderWidthWidth = prevBorderWidth * width;
      const prevBorderWidthHeight = prevBorderWidth * height;
      const borderWidthWidth = borderWidth * width;
      const borderWidthHeight = borderWidth * height;

      // 1st side
      let point1 = [-widthHalf + prevBorderWidthWidth, -heightHalf + borderWidthHeight, 0];
      let point2 = [-widthHalf + prevBorderWidthWidth, heightHalf - borderWidthHeight, 0];
      let point3 = [-widthHalf + borderWidthWidth, heightHalf - borderWidthHeight, 0];
      let point4 = [-widthHalf + borderWidthWidth, -heightHalf + borderWidthHeight, 0];

      this.addTriangle(0, point4, point2, point1);
      this.addTriangle(9, point4, point3, point2);

      // 2nd side
      point1 = [widthHalf - prevBorderWidthWidth, -heightHalf + borderWidthHeight, 0];
      point2 = [widthHalf - prevBorderWidthWidth, heightHalf - borderWidthHeight, 0];
      point3 = [widthHalf - borderWidthWidth, heightHalf - borderWidthHeight, 0];
      point4 = [widthHalf - borderWidthWidth, -heightHalf + borderWidthHeight, 0];

      this.addTriangle(18, point1, point2, point4);
      this.addTriangle(27, point2, point3, point4);

      // Top
      point1 = [-widthHalf + prevBorderWidthWidth, -heightHalf + prevBorderWidthHeight, 0];
      point2 = [-widthHalf + prevBorderWidthWidth, borderWidthHeight - heightHalf, 0];
      point3 = [widthHalf - prevBorderWidthWidth, borderWidthHeight - heightHalf, 0];
      point4 = [widthHalf - prevBorderWidthWidth, -heightHalf + prevBorderWidthHeight, 0];

      this.addTriangle(36, point4, point2, point1);
      this.addTriangle(45, point4, point3, point2);

      // Bottom
      point1 = [-widthHalf + prevBorderWidthWidth, heightHalf - prevBorderWidthHeight, 0];
      point2 = [-widthHalf + prevBorderWidthWidth, heightHalf - borderWidthHeight, 0];
      point3 = [widthHalf - prevBorderWidthWidth, heightHalf - borderWidthHeight, 0];
      point4 = [widthHalf - prevBorderWidthWidth, heightHalf - prevBorderWidthHeight, 0];

      this.addTriangle(54, point1, point2, point4);
      this.addTriangle(63, point2, point3, point4);

      return true;
    }

    return false;
  }

  drawBorder (borderColor, borderSize, prevBorderSize) {
    if (this.generateBorder(borderColor, borderSize, prevBorderSize)) {
      this.gl.useProgram(this.shaderProgram);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuf);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions, this.gl.STATIC_DRAW);

      this.gl.vertexAttribPointer(this.aPosLoc, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.aPosLoc);

      this.gl.uniform4fv(this.colorLoc, borderColor);

      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      this.gl.drawArrays(this.gl.TRIANGLES, 0, this.positions.length / 3);
    }
  }
}
