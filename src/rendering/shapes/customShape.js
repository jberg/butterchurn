import Utils from "../../utils";
import ShaderUtils from "../shaders/shaderUtils";

export default class CustomShape {
  constructor(index, gl, opts) {
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

    gl.samplerParameteri(
      this.mainSampler,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.samplerParameteri(this.mainSampler, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }

  updateGlobals(opts) {
    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;
  }

  createShader() {
    this.shaderProgram = this.gl.createProgram();

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(
      vertShader,
      `
      #version 300 es
      in vec3 aPos;
      in vec4 aColor;
      in vec2 aUv;
      out vec4 vColor;
      out vec2 vUv;
      void main(void) {
        vColor = aColor;
        vUv = aUv;
        gl_Position = vec4(aPos, 1.0);
      }
      `.trim()
    );
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(
      fragShader,
      `
      #version 300 es
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
      }
      `.trim()
    );
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.shaderProgram, vertShader);
    this.gl.attachShader(this.shaderProgram, fragShader);
    this.gl.linkProgram(this.shaderProgram);

    this.aPosLocation = this.gl.getAttribLocation(this.shaderProgram, "aPos");
    this.aColorLocation = this.gl.getAttribLocation(
      this.shaderProgram,
      "aColor"
    );
    this.aUvLocation = this.gl.getAttribLocation(this.shaderProgram, "aUv");

    this.texturedLoc = this.gl.getUniformLocation(
      this.shaderProgram,
      "uTextured"
    );
    this.textureLoc = this.gl.getUniformLocation(
      this.shaderProgram,
      "uTexture"
    );
  }

  createBorderShader() {
    this.borderShaderProgram = this.gl.createProgram();

    const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(
      vertShader,
      `
      #version 300 es
      in vec3 aBorderPos;
      uniform vec2 thickOffset;
      void main(void) {
        gl_Position = vec4(aBorderPos +
                            vec3(thickOffset, 0.0), 1.0);
      }
      `.trim()
    );
    this.gl.compileShader(vertShader);

    const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(
      fragShader,
      `
      #version 300 es
      precision ${this.floatPrecision} float;
      precision highp int;
      precision mediump sampler2D;
      out vec4 fragColor;
      uniform vec4 uBorderColor;
      void main(void) {
        fragColor = uBorderColor;
      }
      `.trim()
    );
    this.gl.compileShader(fragShader);

    this.gl.attachShader(this.borderShaderProgram, vertShader);
    this.gl.attachShader(this.borderShaderProgram, fragShader);
    this.gl.linkProgram(this.borderShaderProgram);

    this.aBorderPosLoc = this.gl.getAttribLocation(
      this.borderShaderProgram,
      "aBorderPos"
    );

    this.uBorderColorLoc = this.gl.getUniformLocation(
      this.borderShaderProgram,
      "uBorderColor"
    );
    this.thickOffsetLoc = this.gl.getUniformLocation(
      this.shaderProgram,
      "thickOffset"
    );
  }

  drawCustomShape(
    blendProgress,
    globalVars,
    presetEquationRunner,
    shapeEqs,
    prevTexture
  ) {
    if (shapeEqs.baseVals.enabled !== 0) {
      if (!presetEquationRunner.preset.useWASM) {
        this.setupShapeBuffers(presetEquationRunner.mdVSFrame.wrap);

        let mdVSShape = Object.assign(
          {},
          presetEquationRunner.mdVSShapes[this.index],
          presetEquationRunner.mdVSFrameMapShapes[this.index],
          globalVars
        );

        // If we aren't setting these every instance, set them initially
        if (
          presetEquationRunner.preset.shapes[this.index].frame_eqs_str === ""
        ) {
          mdVSShape = Object.assign(
            mdVSShape,
            presetEquationRunner.mdVSQAfterFrame,
            presetEquationRunner.mdVSTShapeInits[this.index]
          );
        }

        const baseVals =
          presetEquationRunner.preset.shapes[this.index].baseVals;

        const numInst = Math.clamp(baseVals.num_inst, 1, 1024);
        for (let j = 0; j < numInst; j++) {
          mdVSShape.instance = j;
          mdVSShape.x = baseVals.x;
          mdVSShape.y = baseVals.y;
          mdVSShape.rad = baseVals.rad;
          mdVSShape.ang = baseVals.ang;
          mdVSShape.r = baseVals.r;
          mdVSShape.g = baseVals.g;
          mdVSShape.b = baseVals.b;
          mdVSShape.a = baseVals.a;
          mdVSShape.r2 = baseVals.r2;
          mdVSShape.g2 = baseVals.g2;
          mdVSShape.b2 = baseVals.b2;
          mdVSShape.a2 = baseVals.a2;
          mdVSShape.border_r = baseVals.border_r;
          mdVSShape.border_g = baseVals.border_g;
          mdVSShape.border_b = baseVals.border_b;
          mdVSShape.border_a = baseVals.border_a;
          mdVSShape.thickoutline = baseVals.thickoutline;
          mdVSShape.textured = baseVals.textured;
          mdVSShape.tex_zoom = baseVals.tex_zoom;
          mdVSShape.tex_ang = baseVals.tex_ang;
          mdVSShape.additive = baseVals.additive;

          let mdVSShapeFrame;
          if (
            presetEquationRunner.preset.shapes[this.index].frame_eqs_str !== ""
          ) {
            mdVSShape = Object.assign(
              mdVSShape,
              presetEquationRunner.mdVSQAfterFrame,
              presetEquationRunner.mdVSTShapeInits[this.index]
            );

            mdVSShapeFrame = presetEquationRunner.runShapeFrameEquations(
              this.index,
              mdVSShape
            );
          } else {
            mdVSShapeFrame = mdVSShape;
          }

          let sides = mdVSShapeFrame.sides;
          sides = Math.clamp(sides, 3, 100);
          sides = Math.floor(sides);

          const rad = mdVSShapeFrame.rad;
          const ang = mdVSShapeFrame.ang;

          const x = mdVSShapeFrame.x * 2 - 1;
          const y = mdVSShapeFrame.y * -2 + 1;

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
          this.borderColor = [
            borderR,
            borderG,
            borderB,
            borderA * blendProgress,
          ];

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
          for (let k = 1; k <= sides + 1; k++) {
            const p = (k - 1) / sides;
            const pTwoPi = p * 2 * Math.PI;

            const angSum = pTwoPi + ang + quarterPi;
            this.positions[k * 3 + 0] =
              x + rad * Math.cos(angSum) * this.aspecty;
            this.positions[k * 3 + 1] = y + rad * Math.sin(angSum);
            this.positions[k * 3 + 2] = 0;

            this.colors[k * 4 + 0] = r2;
            this.colors[k * 4 + 1] = g2;
            this.colors[k * 4 + 2] = b2;
            this.colors[k * 4 + 3] = a2 * blendProgress;

            if (isTextured) {
              const texAngSum = pTwoPi + texAng + quarterPi;
              this.uvs[k * 2 + 0] =
                0.5 + ((0.5 * Math.cos(texAngSum)) / texZoom) * this.aspecty;
              this.uvs[k * 2 + 1] = 0.5 + (0.5 * Math.sin(texAngSum)) / texZoom;
            }

            if (hasBorder) {
              this.borderPositions[(k - 1) * 3 + 0] = this.positions[k * 3 + 0];
              this.borderPositions[(k - 1) * 3 + 1] = this.positions[k * 3 + 1];
              this.borderPositions[(k - 1) * 3 + 2] = this.positions[k * 3 + 2];
            }
          }

          this.mdVSShapeFrame = mdVSShapeFrame;

          this.drawCustomShapeInstance(
            prevTexture,
            sides,
            isTextured,
            hasBorder,
            isBorderThick,
            isAdditive
          );
        }

        const mdVSUserKeysShape =
          presetEquationRunner.mdVSUserKeysShapes[this.index];
        const mdVSNewFrameMapShape = Utils.pick(
          this.mdVSShapeFrame,
          mdVSUserKeysShape
        );

        // eslint-disable-next-line no-param-reassign
        presetEquationRunner.mdVSFrameMapShapes[
          this.index
        ] = mdVSNewFrameMapShape;
      } else {
        // eslint-disable-next-line max-len
        this.setupShapeBuffers(
          presetEquationRunner.preset.globalPools.perFrame.wrap.value
        );

        const baseVals =
          presetEquationRunner.preset.shapes[this.index].baseVals;
        const varPool =
          presetEquationRunner.preset.globalPools[`shapePerFrame${this.index}`];
        Utils.setWasm(varPool, globalVars, presetEquationRunner.globalKeys);

        // If we aren't setting these every instance, set them initially
        if (!presetEquationRunner.preset.shapes[this.index].frame_eqs) {
          presetEquationRunner.preset.restore_qs();
        }

        Utils.setWasm(
          varPool,
          presetEquationRunner.mdVSTShapeInits[this.index],
          presetEquationRunner.ts
        );
        presetEquationRunner.preset.save_ts();

        varPool.x.value = baseVals.x;
        varPool.y.value = baseVals.y;
        varPool.rad.value = baseVals.rad;
        varPool.ang.value = baseVals.ang;
        varPool.r.value = baseVals.r;
        varPool.g.value = baseVals.g;
        varPool.b.value = baseVals.b;
        varPool.a.value = baseVals.a;
        varPool.r2.value = baseVals.r2;
        varPool.g2.value = baseVals.g2;
        varPool.b2.value = baseVals.b2;
        varPool.a2.value = baseVals.a2;
        varPool.border_r.value = baseVals.border_r;
        varPool.border_g.value = baseVals.border_g;
        varPool.border_b.value = baseVals.border_b;
        varPool.border_a.value = baseVals.border_a;
        varPool.thickoutline.value = baseVals.thickoutline;
        varPool.textured.value = baseVals.textured;
        varPool.tex_zoom.value = baseVals.tex_zoom;
        varPool.tex_ang.value = baseVals.tex_ang;
        varPool.additive.value = baseVals.additive;
        presetEquationRunner.preset.shapes[this.index].frame_eqs_save();

        const numInst = Math.clamp(baseVals.num_inst, 1, 1024);
        for (let j = 0; j < numInst; j++) {
          varPool.instance.value = j;

          // this condition should check the JS equations because of comments
          if (presetEquationRunner.preset.shapes[this.index].frame_eqs) {
            presetEquationRunner.preset.shapes[this.index].frame_eqs_restore();
            presetEquationRunner.preset.restore_qs();
            presetEquationRunner.preset.restore_ts();
            presetEquationRunner.preset.shapes[this.index].frame_eqs();
          }

          let sides = varPool.sides.value;
          sides = Math.clamp(sides, 3, 100);
          sides = Math.floor(sides);

          const rad = varPool.rad.value;
          const ang = varPool.ang.value;

          const x = varPool.x.value * 2 - 1;
          const y = varPool.y.value * -2 + 1;

          const r = varPool.r.value;
          const g = varPool.g.value;
          const b = varPool.b.value;
          const a = varPool.a.value;
          const r2 = varPool.r2.value;
          const g2 = varPool.g2.value;
          const b2 = varPool.b2.value;
          const a2 = varPool.a2.value;

          const borderR = varPool.border_r.value;
          const borderG = varPool.border_g.value;
          const borderB = varPool.border_b.value;
          const borderA = varPool.border_a.value;
          this.borderColor = [
            borderR,
            borderG,
            borderB,
            borderA * blendProgress,
          ];

          const thickoutline = varPool.thickoutline.value;

          const textured = varPool.textured.value;
          const texZoom = varPool.tex_zoom.value;
          const texAng = varPool.tex_ang.value;

          const additive = varPool.additive.value;

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
          for (let k = 1; k <= sides + 1; k++) {
            const p = (k - 1) / sides;
            const pTwoPi = p * 2 * Math.PI;

            const angSum = pTwoPi + ang + quarterPi;
            this.positions[k * 3 + 0] =
              x + rad * Math.cos(angSum) * this.aspecty;
            this.positions[k * 3 + 1] = y + rad * Math.sin(angSum);
            this.positions[k * 3 + 2] = 0;

            this.colors[k * 4 + 0] = r2;
            this.colors[k * 4 + 1] = g2;
            this.colors[k * 4 + 2] = b2;
            this.colors[k * 4 + 3] = a2 * blendProgress;

            if (isTextured) {
              const texAngSum = pTwoPi + texAng + quarterPi;
              this.uvs[k * 2 + 0] =
                0.5 + ((0.5 * Math.cos(texAngSum)) / texZoom) * this.aspecty;
              this.uvs[k * 2 + 1] = 0.5 + (0.5 * Math.sin(texAngSum)) / texZoom;
            }

            if (hasBorder) {
              this.borderPositions[(k - 1) * 3 + 0] = this.positions[k * 3 + 0];
              this.borderPositions[(k - 1) * 3 + 1] = this.positions[k * 3 + 1];
              this.borderPositions[(k - 1) * 3 + 2] = this.positions[k * 3 + 2];
            }
          }

          this.drawCustomShapeInstance(
            prevTexture,
            sides,
            isTextured,
            hasBorder,
            isBorderThick,
            isAdditive
          );
        }
      }
    }
  }

  setupShapeBuffers(wrap) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVertexBuf);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.positions,
      this.gl.DYNAMIC_DRAW
    );

    this.gl.vertexAttribPointer(
      this.aPosLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.aPosLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors, this.gl.DYNAMIC_DRAW);

    this.gl.vertexAttribPointer(
      this.aColorLocation,
      4,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.aColorLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvVertexBuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.uvs, this.gl.DYNAMIC_DRAW);

    this.gl.vertexAttribPointer(
      this.aUvLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.aUvLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.borderPositionVertexBuf);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.borderPositions,
      this.gl.DYNAMIC_DRAW
    );

    this.gl.vertexAttribPointer(
      this.aBorderPosLoc,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.aBorderPosLoc);

    const wrapping = wrap !== 0 ? this.gl.REPEAT : this.gl.CLAMP_TO_EDGE;
    this.gl.samplerParameteri(
      this.mainSampler,
      this.gl.TEXTURE_WRAP_S,
      wrapping
    );
    this.gl.samplerParameteri(
      this.mainSampler,
      this.gl.TEXTURE_WRAP_T,
      wrapping
    );
  }

  drawCustomShapeInstance(
    prevTexture,
    sides,
    isTextured,
    hasBorder,
    isBorderThick,
    isAdditive
  ) {
    this.gl.useProgram(this.shaderProgram);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVertexBuf);
    this.gl.bufferSubData(
      this.gl.ARRAY_BUFFER,
      0,
      this.positions,
      0,
      (sides + 2) * 3
    );

    this.gl.vertexAttribPointer(
      this.aPosLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.aPosLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorVertexBuf);
    this.gl.bufferSubData(
      this.gl.ARRAY_BUFFER,
      0,
      this.colors,
      0,
      (sides + 2) * 4
    );

    this.gl.vertexAttribPointer(
      this.aColorLocation,
      4,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.aColorLocation);

    if (isTextured) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvVertexBuf);
      this.gl.bufferSubData(
        this.gl.ARRAY_BUFFER,
        0,
        this.uvs,
        0,
        (sides + 2) * 2
      );

      this.gl.vertexAttribPointer(
        this.aUvLocation,
        2,
        this.gl.FLOAT,
        false,
        0,
        0
      );
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

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.borderPositionVertexBuf);
      this.gl.bufferSubData(
        this.gl.ARRAY_BUFFER,
        0,
        this.borderPositions,
        0,
        (sides + 1) * 3
      );

      this.gl.vertexAttribPointer(
        this.aBorderPosLoc,
        3,
        this.gl.FLOAT,
        false,
        0,
        0
      );
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
          this.gl.uniform2fv(this.thickOffsetLoc, [
            offset / this.texsizeX,
            offset / this.texsizeY,
          ]);
        }

        this.gl.drawArrays(this.gl.LINE_STRIP, 0, sides + 1);
      }
    }
  }
}
