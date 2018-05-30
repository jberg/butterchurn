import Utils from '../../utils';
import ShaderUtils from '../shaders/shaderUtils';

export default class CustomShape {
  constructor (index, gl, opts) {
    this.index = index;
    this.gl = gl;

    const maxSides = 101;
    this.positions = new Float32Array((maxSides + 2) * 3);
    this.colors = new Float32Array((maxSides + 2) * 4);
    this.uvs = new Float32Array((maxSides + 2) * 2);
    this.borderPositions = new Float32Array((maxSides + 1) * 3);

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
    this.uvVertexBuf = this.gl.createBuffer();
    this.borderPositionVertexBuf = this.gl.createBuffer();

    this.floatPrecision = ShaderUtils.getFragmentFloatPrecision(this.gl);
    this.createShader();
    this.createBorderShader();

    this.mainSampler = this.gl.createSampler();

    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_WRAP_T, gl.REPEAT);
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
                                      in vec3 aPos;
                                      in vec4 aColor;
                                      in vec2 aUv;
                                      out vec4 vColor;
                                      out vec2 vUv;
                                      void main(void) {
                                        vColor = aColor;
                                        vUv = aUv;
                                        gl_Position = vec4(aPos, 1.0);
                                      }`);
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragShader, `#version 300 es
                                      precision ${this.floatPrecision} float;
                                      precision highp int;
                                      precision mediump sampler2D;
                                      uniform sampler2D uTexture;
                                      uniform float uTextured;
                                      in vec4 vColor;
                                      in vec2 vUv;
                                      out vec4 fragColor;
                                      void main(void) {
                                        if (uTextured != 0.0) {
                                          fragColor = texture(uTexture, vUv) * vColor;
                                        } else {
                                          fragColor = vColor;
                                        }
                                      }`);
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.shaderProgram, vertShader);
    this.gl.attachShader(this.shaderProgram, fragShader);
    this.gl.linkProgram(this.shaderProgram);

    this.aPosLocation = this.gl.getAttribLocation(this.shaderProgram, 'aPos');
    this.aColorLocation = this.gl.getAttribLocation(this.shaderProgram, 'aColor');
    this.aUvLocation = this.gl.getAttribLocation(this.shaderProgram, 'aUv');

    this.texturedLoc = this.gl.getUniformLocation(this.shaderProgram, 'uTextured');
    this.textureLoc = this.gl.getUniformLocation(this.shaderProgram, 'uTexture');
  }

  createBorderShader () {
    this.borderShaderProgram = this.gl.createProgram();

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertShader, `#version 300 es
                                      in vec3 aBorderPos;
                                      uniform vec2 thickOffset;
                                      void main(void) {
                                        gl_Position = vec4(aBorderPos +
                                                           vec3(thickOffset, 0.0), 1.0);
                                      }`);
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragShader, `#version 300 es
                                      precision ${this.floatPrecision} float;
                                      precision highp int;
                                      precision mediump sampler2D;
                                      out vec4 fragColor;
                                      uniform vec4 uBorderColor;
                                      void main(void) {
                                        fragColor = uBorderColor;
                                      }`);
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.borderShaderProgram, vertShader);
    this.gl.attachShader(this.borderShaderProgram, fragShader);
    this.gl.linkProgram(this.borderShaderProgram);

    this.aBorderPosLoc = this.gl.getAttribLocation(this.borderShaderProgram, 'aBorderPos');

    this.uBorderColorLoc = this.gl.getUniformLocation(this.borderShaderProgram, 'uBorderColor');
    this.thickOffsetLoc = this.gl.getUniformLocation(this.shaderProgram, 'thickOffset');
  }

  drawCustomShape (blendProgress, globalVars, presetEquationRunner, shapeEqs, prevTexture) {
    if (shapeEqs.baseVals.enabled !== 0) {
      this.setupShapeBuffers(presetEquationRunner.mdVSFrame);

      const mdVSShape = Object.assign({},
                                      presetEquationRunner.mdVSShapes[this.index],
                                      presetEquationRunner.mdVSFrameMapShapes[this.index],
                                      presetEquationRunner.mdVSQAfterFrame,
                                      presetEquationRunner.mdVSTShapeInits[this.index],
                                      globalVars);

      const mdVSShapeBaseVals = Utils.cloneVars(mdVSShape);

      const numInst = Math.clamp(mdVSShape.num_inst, 1, 1024);
      for (let j = 0; j < numInst; j++) {
        mdVSShape.instance = j;
        mdVSShape.x = mdVSShapeBaseVals.x;
        mdVSShape.y = mdVSShapeBaseVals.y;
        mdVSShape.rad = mdVSShapeBaseVals.rad;
        mdVSShape.ang = mdVSShapeBaseVals.ang;
        mdVSShape.r = mdVSShapeBaseVals.r;
        mdVSShape.g = mdVSShapeBaseVals.g;
        mdVSShape.b = mdVSShapeBaseVals.b;
        mdVSShape.a = mdVSShapeBaseVals.a;
        mdVSShape.r2 = mdVSShapeBaseVals.r2;
        mdVSShape.g2 = mdVSShapeBaseVals.g2;
        mdVSShape.b2 = mdVSShapeBaseVals.b2;
        mdVSShape.a2 = mdVSShapeBaseVals.a2;
        mdVSShape.border_r = mdVSShapeBaseVals.border_r;
        mdVSShape.border_g = mdVSShapeBaseVals.border_g;
        mdVSShape.border_b = mdVSShapeBaseVals.border_b;
        mdVSShape.border_a = mdVSShapeBaseVals.border_a;
        mdVSShape.thickoutline = mdVSShapeBaseVals.thickoutline;
        mdVSShape.textured = mdVSShapeBaseVals.textured;
        mdVSShape.tex_zoom = mdVSShapeBaseVals.tex_zoom;
        mdVSShape.tex_ang = mdVSShapeBaseVals.tex_ang;
        mdVSShape.additive = mdVSShapeBaseVals.additive;

        const mdVSShapeFrame = shapeEqs.frame_eqs(mdVSShape);

        let sides = mdVSShapeFrame.sides;
        sides = Math.clamp(sides, 3, 100);
        sides = Math.floor(sides);

        const rad = mdVSShapeFrame.rad;
        const ang = mdVSShapeFrame.ang;

        const x = (mdVSShapeFrame.x * 2) - 1;
        const y = (mdVSShapeFrame.y * -2) + 1;

        const r = mdVSShapeFrame.r;
        const g = mdVSShapeFrame.g;
        const b = mdVSShapeFrame.b;
        const a = mdVSShapeFrame.a;
        const r2 = mdVSShapeFrame.r2;
        const g2 = mdVSShapeFrame.g2;
        const b2 = mdVSShapeFrame.b2;
        const a2 = mdVSShapeFrame.a2;

        const borderR = mdVSShapeFrame.border_r;
        const borderG = mdVSShapeFrame.border_g;
        const borderB = mdVSShapeFrame.border_b;
        const borderA = mdVSShapeFrame.border_a;
        this.borderColor = [borderR, borderG, borderB, borderA * blendProgress];

        const thickoutline = mdVSShapeFrame.thickoutline;

        const textured = mdVSShapeFrame.textured;
        const texZoom = mdVSShapeFrame.tex_zoom;
        const texAng = mdVSShapeFrame.tex_ang;

        const additive = mdVSShapeFrame.additive;

        const hasBorder = this.borderColor[3] > 0;
        const isTextured = Math.abs(textured) >= 1;
        const isBorderThick = Math.abs(thickoutline) >= 1;
        const isAdditive = Math.abs(additive) >= 1;

        this.positions[0] = x;
        this.positions[1] = y;
        this.positions[2] = 0;

        this.colors[0] = r;
        this.colors[1] = g;
        this.colors[2] = b;
        this.colors[3] = a * blendProgress;

        if (isTextured) {
          this.uvs[0] = 0.5;
          this.uvs[1] = 0.5;
        }

        const quarterPi = Math.PI * 0.25;
        for (let k = 1; k <= (sides + 1); k++) {
          const p = ((k - 1) / sides);
          const pTwoPi = p * 2 * Math.PI;

          const angSum = pTwoPi + ang + quarterPi;
          this.positions[(k * 3) + 0] = x + (rad * Math.cos(angSum) * this.aspecty);
          this.positions[(k * 3) + 1] = y + (rad * Math.sin(angSum));
          this.positions[(k * 3) + 2] = 0;

          this.colors[(k * 4) + 0] = r2;
          this.colors[(k * 4) + 1] = g2;
          this.colors[(k * 4) + 2] = b2;
          this.colors[(k * 4) + 3] = a2 * blendProgress;

          if (isTextured) {
            const texAngSum = pTwoPi + texAng + quarterPi;
            this.uvs[(k * 2) + 0] = 0.5 + (((0.5 * Math.cos(texAngSum)) / texZoom) *
                                           this.aspecty);
            this.uvs[(k * 2) + 1] = 0.5 + ((0.5 * Math.sin(texAngSum)) / texZoom);
          }

          if (hasBorder) {
            this.borderPositions[((k - 1) * 3) + 0] = this.positions[(k * 3) + 0];
            this.borderPositions[((k - 1) * 3) + 1] = this.positions[(k * 3) + 1];
            this.borderPositions[((k - 1) * 3) + 2] = this.positions[(k * 3) + 2];
          }
        }

        this.mdVSShapeFrame = mdVSShapeFrame;

        this.drawCustomShapeInstance(prevTexture, sides, isTextured, hasBorder, isBorderThick,
                                     isAdditive);
      }

      const mdVSUserKeysShape = presetEquationRunner.mdVSUserKeysShapes[this.index];
      const mdVSNewFrameMapShape = Utils.pick(this.mdVSShapeFrame, mdVSUserKeysShape);

      // eslint-disable-next-line no-param-reassign
      presetEquationRunner.mdVSFrameMapShapes[this.index] = mdVSNewFrameMapShape;
    }
  }

  setupShapeBuffers (mdVSFrame) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions, this.gl.DYNAMIC_DRAW);

    this.gl.vertexAttribPointer(this.aPosLocation, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aPosLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors, this.gl.DYNAMIC_DRAW);

    this.gl.vertexAttribPointer(this.aColorLocation, 4, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aColorLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.uvs, this.gl.DYNAMIC_DRAW);

    this.gl.vertexAttribPointer(this.aUvLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aUvLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.borderPositionVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.borderPositions, this.gl.DYNAMIC_DRAW);

    this.gl.vertexAttribPointer(this.aBorderPosLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aBorderPosLoc);

    const wrapping = (mdVSFrame.wrap !== 0) ? this.gl.REPEAT : this.gl.CLAMP_TO_EDGE;
    this.gl.samplerParameteri(this.mainSampler, this.gl.TEXTURE_WRAP_S, wrapping);
    this.gl.samplerParameteri(this.mainSampler, this.gl.TEXTURE_WRAP_T, wrapping);
  }

  drawCustomShapeInstance (prevTexture, sides, isTextured, hasBorder, isBorderThick, isAdditive) {
    this.gl.useProgram(this.shaderProgram);

    const updatedPositions = new Float32Array(this.positions.buffer, 0, (sides + 2) * 3);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVertexBuf);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, updatedPositions);

    this.gl.vertexAttribPointer(this.aPosLocation, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aPosLocation);

    const updatedColors = new Float32Array(this.colors.buffer, 0, (sides + 2) * 4);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorVertexBuf);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, updatedColors);

    this.gl.vertexAttribPointer(this.aColorLocation, 4, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aColorLocation);

    if (isTextured) {
      const updatedUvs = new Float32Array(this.uvs.buffer, 0, (sides + 2) * 2);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvVertexBuf);
      this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, updatedUvs);

      this.gl.vertexAttribPointer(this.aUvLocation, 2, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.aUvLocation);
    }

    this.gl.uniform1f(this.texturedLoc, isTextured ? 1 : 0);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, prevTexture);
    this.gl.bindSampler(0, this.mainSampler);
    this.gl.uniform1i(this.textureLoc, 0);

    if (isAdditive) {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
    } else {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, sides + 2);

    if (hasBorder) {
      this.gl.useProgram(this.borderShaderProgram);

      const updatedBorderPos = new Float32Array(this.borderPositions.buffer, 0, (sides + 1) * 3);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.borderPositionVertexBuf);
      this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, updatedBorderPos);

      this.gl.vertexAttribPointer(this.aBorderPosLoc, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.aBorderPosLoc);

      this.gl.uniform4fv(this.uBorderColorLoc, this.borderColor);

      // TODO: use drawArraysInstanced
      const instances = isBorderThick ? 4 : 1;
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


        this.gl.drawArrays(this.gl.LINE_STRIP, 0, sides + 1);
      }
    }
  }
}
