export default class BlendPattern {
  constructor (opts) {
    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;

    this.vertInfoA = new Float32Array((this.mesh_width + 1) * (this.mesh_height + 1));
    this.vertInfoC = new Float32Array((this.mesh_width + 1) * (this.mesh_height + 1));

    this.createBlendPattern();
  }

  static resizeMatrixValues (oldMat, oldWidth, oldHeight, newWidth, newHeight) {
    const newMat = new Float32Array((newWidth + 1) * (newHeight + 1));
    let nVert = 0;
    for (let j = 0; j < (newHeight + 1); j++) {
      for (let i = 0; i < (newWidth + 1); i++) {
        let x = i / newHeight;
        let y = j / newWidth;

        x *= (oldWidth + 1);
        y *= (oldHeight + 1);
        x = Math.clamp(x, 0, oldWidth - 1);
        y = Math.clamp(y, 0, oldHeight - 1);
        const nx = Math.floor(x);
        const ny = Math.floor(y);
        const dx = x - nx;
        const dy = y - ny;
        const val00 = oldMat[(ny * (oldWidth + 1)) + nx];
        const val01 = oldMat[(ny * (oldWidth + 1)) + (nx + 1)];
        const val10 = oldMat[((ny + 1) * (oldWidth + 1)) + nx];
        const val11 = oldMat[((ny + 1) * (oldWidth + 1)) + (nx + 1)];
        newMat[nVert] = (val00 * (1 - dx) * (1 - dy)) +
                        (val01 * dx * (1 - dy)) +
                        (val10 * (1 - dx) * dy) +
                        (val11 * dx * (dy));

        nVert += 1;
      }
    }

    return newMat;
  }

  updateGlobals (opts) {
    const oldMeshWidth = this.mesh_width;
    const oldMeshHeight = this.mesh_height;

    this.mesh_width = opts.mesh_width;
    this.mesh_height = opts.mesh_height;
    this.aspectx = opts.aspectx;
    this.aspecty = opts.aspecty;

    if (this.mesh_width !== oldMeshWidth || this.mesh_height !== oldMeshHeight) {
      this.vertInfoA = BlendPattern.resizeMatrixValues(this.vertInfoA,
                                                       oldMeshWidth, oldMeshHeight,
                                                       this.mesh_width, this.mesh_height);
      this.vertInfoC = BlendPattern.resizeMatrixValues(this.vertInfoC,
                                                       oldMeshWidth, oldMeshHeight,
                                                       this.mesh_width, this.mesh_height);
    }
  }

  genPlasma (x0, x1, y0, y1, dt) {
    const midx = Math.floor((x0 + x1) / 2);
    const midy = Math.floor((y0 + y1) / 2);
    let t00 = this.vertInfoC[(y0 * (this.mesh_width + 1)) + x0];
    let t01 = this.vertInfoC[(y0 * (this.mesh_width + 1)) + x1];
    let t10 = this.vertInfoC[(y1 * (this.mesh_width + 1)) + x0];
    let t11 = this.vertInfoC[(y1 * (this.mesh_width + 1)) + x1];

    if ((y1 - y0) >= 2) {
      if (x0 === 0) {
        this.vertInfoC[(midy * (this.mesh_width + 1)) + x0] =
          (0.5 * (t00 + t10)) + (((Math.random() * 2) - 1) * dt * this.aspecty);
      }
      this.vertInfoC[(midy * (this.mesh_width + 1)) + x1] =
        (0.5 * (t01 + t11)) + (((Math.random() * 2) - 1) * dt * this.aspecty);
    }
    if ((x1 - x0) >= 2) {
      if (y0 === 0) {
        this.vertInfoC[(y0 * (this.mesh_width + 1)) + midx] =
          (0.5 * (t00 + t01)) + (((Math.random() * 2) - 1) * dt * this.aspectx);
      }
      this.vertInfoC[(y1 * (this.mesh_width + 1)) + midx] =
        (0.5 * (t10 + t11)) + (((Math.random() * 2) - 1) * dt * this.aspectx);
    }

    if ((y1 - y0) >= 2 && (x1 - x0) >= 2) {
      t00 = this.vertInfoC[(midy * (this.mesh_width + 1)) + x0];
      t01 = this.vertInfoC[(midy * (this.mesh_width + 1)) + x1];
      t10 = this.vertInfoC[(y0 * (this.mesh_width + 1)) + midx];
      t11 = this.vertInfoC[(y1 * (this.mesh_width + 1)) + midx];
      this.vertInfoC[(midy * (this.mesh_width + 1)) + midx] =
        (0.25 * (t10 + t11 + t00 + t01)) + (((Math.random() * 2) - 1) * dt);

      this.genPlasma(x0, midx, y0, midy, dt * 0.5);
      this.genPlasma(midx, x1, y0, midy, dt * 0.5);
      this.genPlasma(x0, midx, midy, y1, dt * 0.5);
      this.genPlasma(midx, x1, midy, y1, dt * 0.5);
    }
  }

  createBlendPattern () {
    const mixType = 1 + Math.floor(Math.random() * 3);
    if (mixType === 0) { // not currently used
      let nVert = 0;
      for (let y = 0; y <= this.mesh_height; y++) {
        for (let x = 0; x <= this.mesh_width; x++) {
          this.vertInfoA[nVert] = 1;
          this.vertInfoC[nVert] = 0;
          nVert += 1;
        }
      }
    } else if (mixType === 1) {
      const ang = Math.random() * 6.28;
      const vx = Math.cos(ang);
      const vy = Math.sin(ang);
      const band = 0.1 + (0.2 * Math.random());
      const invBand = 1.0 / band;

      let nVert = 0;
      for (let y = 0; y <= this.mesh_height; y++) {
        const fy = (y / this.mesh_height) * this.aspecty;
        for (let x = 0; x <= this.mesh_width; x++) {
          const fx = (x / this.mesh_width) * this.aspectx;

          let t = ((fx - 0.5) * vx) + ((fy - 0.5) * vy) + 0.5;
          t = ((t - 0.5) / Math.sqrt(2)) + 0.5;

          this.vertInfoA[nVert] = invBand * (1 + band);
          this.vertInfoC[nVert] = -invBand + (invBand * t);
          nVert += 1;
        }
      }
    } else if (mixType === 2) {
      const band = 0.12 + (0.13 * Math.random());
      const invBand = 1.0 / band;

      this.vertInfoC[0] = Math.random();
      this.vertInfoC[this.mesh_width] = Math.random();
      this.vertInfoC[this.mesh_height * (this.mesh_width + 1)] = Math.random();
      this.vertInfoC[(this.mesh_height * (this.mesh_width + 1)) + this.mesh_width] = Math.random();
      this.genPlasma(0, this.mesh_width, 0, this.mesh_height, 0.25);

      let minc = this.vertInfoC[0];
      let maxc = this.vertInfoC[0];

      let nVert = 0;
      for (let y = 0; y <= this.mesh_height; y++) {
        for (let x = 0; x <= this.mesh_width; x++) {
          if (minc > this.vertInfoC[nVert]) {
            minc = this.vertInfoC[nVert];
          }
          if (maxc < this.vertInfoC[nVert]) {
            maxc = this.vertInfoC[nVert];
          }
          nVert += 1;
        }
      }

      const mult = 1.0 / (maxc - minc);
      nVert = 0;
      for (let y = 0; y <= this.mesh_height; y++) {
        for (let x = 0; x <= this.mesh_width; x++) {
          const t = (this.vertInfoC[nVert] - minc) * mult;
          this.vertInfoA[nVert] = invBand * (1 + band);
          this.vertInfoC[nVert] = -invBand + (invBand * t);
          nVert += 1;
        }
      }
    } else if (mixType === 3) {
      const band = 0.02 + (0.14 * Math.random()) + (0.34 * Math.random());
      const invBand = 1.0 / band;
      const dir = ((Math.floor(Math.random() * 2) * 2) - 1);

      let nVert = 0;
      for (let y = 0; y <= this.mesh_height; y++) {
        const dy = ((y / this.mesh_height) - 0.5) * this.aspecty;
        for (let x = 0; x <= this.mesh_width; x++) {
          const dx = ((x / this.mesh_width) - 0.5) * this.aspectx;
          let t = Math.sqrt((dx * dx) + (dy * dy)) * 1.41421;
          if (dir === -1) {
            t = 1 - t;
          }

          this.vertInfoA[nVert] = invBand * (1 + band);
          this.vertInfoC[nVert] = -invBand + (invBand * t);
          nVert += 1;
        }
      }
    }
  }
}
