import ShaderUtils from '../shaders/shaderUtils';

export default class MotionVectors {
  constructor (gl, opts) {
    this.gl = gl;

    this.maxX = 64;
    this.maxY = 48;
    this.positions = new Float32Array(this.maxX * this.maxY * 2 * 3);

    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;

    this.positionVertexBuf = this.gl.createBuffer();

    this.floatPrecision = ShaderUtils.getFragmentFloatPrecision(this.gl);
    this.createShader();
  }

  updateGlobals (opts) {
    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
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

  getMotionDir (warpUVs, fx, fy) {
    const y0 = Math.floor(fy * this.mesh_height);
    const dy = (fy * this.mesh_height) - y0;

    const x0 = Math.floor(fx * this.mesh_width);
    const dx = (fx * this.mesh_width) - x0;

    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const gridX1 = this.mesh_width + 1;

    let fx2;
    let fy2;
    fx2 = warpUVs[(((y0 * gridX1) + x0) * 2) + 0] * (1 - dx) * (1 - dy);
    fy2 = warpUVs[(((y0 * gridX1) + x0) * 2) + 1] * (1 - dx) * (1 - dy);
    fx2 += warpUVs[(((y0 * gridX1) + x1) * 2) + 0] * dx * (1 - dy);
    fy2 += warpUVs[(((y0 * gridX1) + x1) * 2) + 1] * dx * (1 - dy);
    fx2 += warpUVs[(((y1 * gridX1) + x0) * 2) + 0] * (1 - dx) * dy;
    fy2 += warpUVs[(((y1 * gridX1) + x0) * 2) + 1] * (1 - dx) * dy;
    fx2 += warpUVs[(((y1 * gridX1) + x1) * 2) + 0] * dx * dy;
    fy2 += warpUVs[(((y1 * gridX1) + x1) * 2) + 1] * dx * dy;

    return [fx2, 1.0 - fy2];
  }

  generateMotionVectors (mdVSFrame, warpUVs) {
    const mvA = mdVSFrame.mv_a;
    let nX = Math.floor(mdVSFrame.mv_x);
    let nY = Math.floor(mdVSFrame.mv_y);

    if (mvA > 0.001 && nX > 0 && nY > 0) {
      let dx = mdVSFrame.mv_x - nX;
      let dy = mdVSFrame.mv_y - nY;

      if (nX > this.maxX) {
        nX = this.maxX;
        dx = 0;
      }

      if (nY > this.maxY) {
        nY = this.maxY;
        dy = 0;
      }

      const dx2 = mdVSFrame.mv_dx;
      const dy2 = mdVSFrame.mv_dy;

      const lenMult = mdVSFrame.mv_l;
      const minLen = 1.0 / this.texsizeX;

      this.numVecVerts = 0;
      for (let j = 0; j < nY; j++) {
        let fy = (j + 0.25) / ((nY + dy + 0.25) - 1.0);
        fy -= dy2;

        if (fy > 0.0001 && fy < 0.9999) {
          for (let i = 0; i < nX; i++) {
            let fx = (i + 0.25) / ((nX + dx + 0.25) - 1.0);
            fx += dx2;

            if (fx > 0.0001 && fx < 0.9999) {
              const fx2arr = this.getMotionDir(warpUVs, fx, fy);
              let fx2 = fx2arr[0];
              let fy2 = fx2arr[1];

              let dxi = (fx2 - fx);
              let dyi = (fy2 - fy);
              dxi *= lenMult;
              dyi *= lenMult;

              let fdist = Math.sqrt((dxi * dxi) + (dyi * dyi));

              if (fdist < minLen && fdist > 0.00000001) {
                fdist = minLen / fdist;
                dxi *= fdist;
                dyi *= fdist;
              } else {
                dxi = minLen;
                dxi = minLen;
              }

              fx2 = fx + dxi;
              fy2 = fy + dyi;

              const vx1 = ((2.0 * fx) - 1.0);
              const vy1 = ((2.0 * fy) - 1.0);
              const vx2 = ((2.0 * fx2) - 1.0);
              const vy2 = ((2.0 * fy2) - 1.0);

              this.positions[(this.numVecVerts * 3) + 0] = vx1;
              this.positions[(this.numVecVerts * 3) + 1] = vy1;
              this.positions[(this.numVecVerts * 3) + 2] = 0;

              this.positions[((this.numVecVerts + 1) * 3) + 0] = vx2;
              this.positions[((this.numVecVerts + 1) * 3) + 1] = vy2;
              this.positions[((this.numVecVerts + 1) * 3) + 2] = 0;

              this.numVecVerts += 2;
            }
          }
        }
      }

      if (this.numVecVerts > 0) {
        this.color = [mdVSFrame.mv_r, mdVSFrame.mv_g, mdVSFrame.mv_b, mvA];

        return true;
      }
    }

    return false;
  }

  drawMotionVectors (mdVSFrame, warpUVs) {
    if (this.generateMotionVectors(mdVSFrame, warpUVs)) {
      this.gl.useProgram(this.shaderProgram);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVertexBuf);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions, this.gl.STATIC_DRAW);

      this.gl.vertexAttribPointer(this.aPosLoc, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.aPosLoc);

      this.gl.uniform4fv(this.colorLoc, this.color);

      this.gl.lineWidth(1);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      this.gl.drawArrays(this.gl.LINES, 0, this.numVecVerts);
    }
  }
}
