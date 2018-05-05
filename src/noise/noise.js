export default class Noise {
  constructor (gl) {
    this.gl = gl;

    this.anisoExt = (
      this.gl.getExtension('EXT_texture_filter_anisotropic') ||
      this.gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      this.gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
    );

    this.noiseTexLQ = this.gl.createTexture();
    this.noiseTexLQLite = this.gl.createTexture();
    this.noiseTexMQ = this.gl.createTexture();
    this.noiseTexHQ = this.gl.createTexture();

    this.noiseTexVolLQ = this.gl.createTexture();
    this.noiseTexVolHQ = this.gl.createTexture();

    this.nTexArrLQ = Noise.createNoiseTex(256, 1);
    this.nTexArrLQLite = Noise.createNoiseTex(32, 1);
    this.nTexArrMQ = Noise.createNoiseTex(256, 4);
    this.nTexArrHQ = Noise.createNoiseTex(256, 8);

    this.nTexArrVolLQ = Noise.createNoiseVolTex(32, 1);
    this.nTexArrVolHQ = Noise.createNoiseVolTex(32, 4);

    this.bindTexture(this.noiseTexLQ, this.nTexArrLQ, 256, 256);
    this.bindTexture(this.noiseTexLQLite, this.nTexArrLQLite, 32, 32);
    this.bindTexture(this.noiseTexMQ, this.nTexArrMQ, 256, 256);
    this.bindTexture(this.noiseTexHQ, this.nTexArrHQ, 256, 256);

    this.bindTexture3D(this.noiseTexVolLQ, this.nTexArrVolLQ, 32, 32, 32);
    this.bindTexture3D(this.noiseTexVolHQ, this.nTexArrVolHQ, 32, 32, 32);

    this.noiseTexPointLQ = this.gl.createSampler();
    gl.samplerParameteri(this.noiseTexPointLQ, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.samplerParameteri(this.noiseTexPointLQ, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.samplerParameteri(this.noiseTexPointLQ, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.samplerParameteri(this.noiseTexPointLQ, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }

  bindTexture (texture, data, width, height) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0,
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER,
                                              this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    if (this.anisoExt) {
      const max = this.gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      this.gl.texParameterf(this.gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, max);
    }
  }

  bindTexture3D (texture, data, width, height, depth) {
    this.gl.bindTexture(this.gl.TEXTURE_3D, texture);

    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texImage3D(this.gl.TEXTURE_3D, 0, this.gl.RGBA, width, height, depth, 0,
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

    this.gl.generateMipmap(this.gl.TEXTURE_3D);

    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER,
                                              this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    if (this.anisoExt) {
      const max = this.gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      this.gl.texParameterf(this.gl.TEXTURE_3D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, max);
    }
  }

  static fCubicInterpolate (y0, y1, y2, y3, t) {
    const t2 = t * t;
    const t3 = t * t2;
    const a0 = (y3 - y2 - y0) + y1;
    const a1 = y0 - y1 - a0;
    const a2 = y2 - y0;
    const a3 = y1;

    return ((a0 * t3) + (a1 * t2) + (a2 * t) + a3);
  }

  static dwCubicInterpolate (y0, y1, y2, y3, t) {
    const ret = [];
    for (let i = 0; i < 4; i++) {
      let f = Noise.fCubicInterpolate(y0[i] / 255.0, y1[i] / 255.0,
                                      y2[i] / 255.0, y3[i] / 255.0, t);
      f = Math.clamp(f, 0, 1);
      ret[i] = f * 255;
    }

    return ret;
  }

  static createNoiseVolTex (noiseSize, zoom) {
    const nsize = noiseSize * noiseSize * noiseSize;
    const texArr = new Uint8Array(nsize * 4);
    const texRange = (zoom > 1) ? 216 : 256;
    const halfTexRange = texRange * 0.5;
    for (let i = 0; i < nsize; i++) {
      texArr[(i * 4) + 0] = Math.floor((Math.random() * texRange) + halfTexRange);
      texArr[(i * 4) + 1] = Math.floor((Math.random() * texRange) + halfTexRange);
      texArr[(i * 4) + 2] = Math.floor((Math.random() * texRange) + halfTexRange);
      texArr[(i * 4) + 3] = Math.floor((Math.random() * texRange) + halfTexRange);
    }

    const wordsPerSlice = noiseSize * noiseSize;
    const wordsPerLine = noiseSize;
    if (zoom > 1) {
      for (let z = 0; z < noiseSize; z += zoom) {
        for (let y = 0; y < noiseSize; y += zoom) {
          for (let x = 0; x < noiseSize; x++) {
            if (x % zoom !== 0) {
              const baseX = (Math.floor(x / zoom) * zoom) + noiseSize;
              const baseY = (z * wordsPerSlice) + (y * wordsPerLine);

              const y0 = [];
              const y1 = [];
              const y2 = [];
              const y3 = [];
              for (let i = 0; i < 4; i++) {
                y0[i] = texArr[(baseY * 4) + (((baseX - zoom) % noiseSize) * 4) + i];
                y1[i] = texArr[(baseY * 4) + ((baseX % noiseSize) * 4) + i];
                y2[i] = texArr[(baseY * 4) + (((baseX + zoom) % noiseSize) * 4) + i];
                y3[i] = texArr[(baseY * 4) + (((baseX + (zoom * 2)) % noiseSize) * 4) + i];
              }

              const t = (x % zoom) / zoom;
              const result = Noise.dwCubicInterpolate(y0, y1, y2, y3, t);

              for (let i = 0; i < 4; i++) {
                const offset = (x * 4) + i;
                texArr[(z * wordsPerSlice * 4) + (y * wordsPerLine * 4) + offset] = result[i];
              }
            }
          }
        }
      }

      for (let z = 0; z < noiseSize; z += zoom) {
        for (let x = 0; x < noiseSize; x++) {
          for (let y = 0; y < noiseSize; y++) {
            if (y % zoom !== 0) {
              const baseY = (Math.floor(y / zoom) * zoom) + noiseSize;
              const baseZ = z * wordsPerSlice;

              const y0 = [];
              const y1 = [];
              const y2 = [];
              const y3 = [];
              for (let i = 0; i < 4; i++) {
                const offset = (x * 4) + (baseZ * 4) + i;
                y0[i] = texArr[(((baseY - zoom) % noiseSize) * wordsPerLine * 4) + offset];
                y1[i] = texArr[((baseY % noiseSize) * wordsPerLine * 4) + offset];
                y2[i] = texArr[(((baseY + zoom) % noiseSize) * wordsPerLine * 4) + offset];
                y3[i] = texArr[(((baseY + (zoom * 2)) % noiseSize) * wordsPerLine * 4) + offset];
              }

              const t = (y % zoom) / zoom;
              const result = Noise.dwCubicInterpolate(y0, y1, y2, y3, t);

              for (let i = 0; i < 4; i++) {
                const offset = (x * 4) + (baseZ * 4) + i;
                texArr[(y * wordsPerLine * 4) + offset] = result[i];
              }
            }
          }
        }
      }

      for (let x = 0; x < noiseSize; x++) {
        for (let y = 0; y < noiseSize; y++) {
          for (let z = 0; z < noiseSize; z++) {
            if (z % zoom !== 0) {
              const baseY = y * wordsPerLine;
              const baseZ = (Math.floor(z / zoom) * zoom) + noiseSize;

              const y0 = [];
              const y1 = [];
              const y2 = [];
              const y3 = [];
              for (let i = 0; i < 4; i++) {
                const offset = (x * 4) + (baseY * 4) + i;
                y0[i] = texArr[(((baseZ - zoom) % noiseSize) * wordsPerSlice * 4) + offset];
                y1[i] = texArr[((baseZ % noiseSize) * wordsPerSlice * 4) + offset];
                y2[i] = texArr[(((baseZ + zoom) % noiseSize) * wordsPerSlice * 4) + offset];
                y3[i] = texArr[(((baseZ + (zoom * 2)) % noiseSize) * wordsPerSlice * 4) + offset];
              }

              const t = (y % zoom) / zoom;
              const result = Noise.dwCubicInterpolate(y0, y1, y2, y3, t);

              for (let i = 0; i < 4; i++) {
                const offset = (x * 4) + (baseY * 4) + i;
                texArr[(z * wordsPerSlice * 4) + offset] = result[i];
              }
            }
          }
        }
      }
    }

    return texArr;
  }

  static createNoiseTex (noiseSize, zoom) {
    const nsize = noiseSize * noiseSize;
    const texArr = new Uint8Array(nsize * 4);
    const texRange = (zoom > 1) ? 216 : 256;
    const halfTexRange = texRange * 0.5;
    for (let i = 0; i < nsize; i++) {
      texArr[(i * 4) + 0] = Math.floor((Math.random() * texRange) + halfTexRange);
      texArr[(i * 4) + 1] = Math.floor((Math.random() * texRange) + halfTexRange);
      texArr[(i * 4) + 2] = Math.floor((Math.random() * texRange) + halfTexRange);
      texArr[(i * 4) + 3] = Math.floor((Math.random() * texRange) + halfTexRange);
    }

    if (zoom > 1) {
      for (let y = 0; y < noiseSize; y += zoom) {
        for (let x = 0; x < noiseSize; x++) {
          if (x % zoom !== 0) {
            const baseX = (Math.floor(x / zoom) * zoom) + noiseSize;
            const baseY = y * noiseSize;

            const y0 = [];
            const y1 = [];
            const y2 = [];
            const y3 = [];
            for (let z = 0; z < 4; z++) {
              y0[z] = texArr[(baseY * 4) + (((baseX - zoom) % noiseSize) * 4) + z];
              y1[z] = texArr[(baseY * 4) + ((baseX % noiseSize) * 4) + z];
              y2[z] = texArr[(baseY * 4) + (((baseX + zoom) % noiseSize) * 4) + z];
              y3[z] = texArr[(baseY * 4) + (((baseX + (zoom * 2)) % noiseSize) * 4) + z];
            }

            const t = (x % zoom) / zoom;
            const result = Noise.dwCubicInterpolate(y0, y1, y2, y3, t);

            for (let z = 0; z < 4; z++) {
              texArr[(y * noiseSize * 4) + (x * 4) + z] = result[z];
            }
          }
        }
      }

      for (let x = 0; x < noiseSize; x++) {
        for (let y = 0; y < noiseSize; y++) {
          if (y % zoom !== 0) {
            const baseY = (Math.floor(y / zoom) * zoom) + noiseSize;

            const y0 = [];
            const y1 = [];
            const y2 = [];
            const y3 = [];
            for (let z = 0; z < 4; z++) {
              y0[z] = texArr[(((baseY - zoom) % noiseSize) * noiseSize * 4) + (x * 4) + z];
              y1[z] = texArr[((baseY % noiseSize) * noiseSize * 4) + (x * 4) + z];
              y2[z] = texArr[(((baseY + zoom) % noiseSize) * noiseSize * 4) + (x * 4) + z];
              y3[z] = texArr[(((baseY + (zoom * 2)) % noiseSize) * noiseSize * 4) + (x * 4) + z];
            }

            const t = (y % zoom) / zoom;
            const result = Noise.dwCubicInterpolate(y0, y1, y2, y3, t);

            for (let z = 0; z < 4; z++) {
              texArr[(y * noiseSize * 4) + (x * 4) + z] = result[z];
            }
          }
        }
      }
    }

    return texArr;
  }
}
