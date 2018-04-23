export default class WaveUtils {
  /* eslint-disable no-param-reassign */
  static smoothWave (positions, positionsSmoothed, nVertsIn, zCoord = false) {
    const c1 = -0.15;
    const c2 = 1.15;
    const c3 = 1.15;
    const c4 = -0.15;
    const invSum = 1.0 / (c1 + c2 + c3 + c4);

    let j = 0;

    let iBelow = 0;
    let iAbove;
    let iAbove2 = 1;
    for (let i = 0; i < (nVertsIn - 1); i++) {
      iAbove = iAbove2;
      iAbove2 = Math.min(nVertsIn - 1, i + 2);

      for (let k = 0; k < 3; k++) {
        positionsSmoothed[(j * 3) + k] = positions[(i * 3) + k];
      }

      if (zCoord) {
        for (let k = 0; k < 3; k++) {
          positionsSmoothed[((j + 1) * 3) + k] =
            ((c1 * positions[(iBelow * 3) + k]) +
             (c2 * positions[(i * 3) + k]) +
             (c3 * positions[(iAbove * 3) + k]) +
             (c4 * positions[(iAbove2 * 3) + k])) * invSum;
        }
      } else {
        for (let k = 0; k < 2; k++) {
          positionsSmoothed[((j + 1) * 3) + k] =
            ((c1 * positions[(iBelow * 3) + k]) +
             (c2 * positions[(i * 3) + k]) +
             (c3 * positions[(iAbove * 3) + k]) +
             (c4 * positions[(iAbove2 * 3) + k])) * invSum;
        }
        positionsSmoothed[((j + 1) * 3) + 2] = 0;
      }

      iBelow = i;
      j += 2;
    }

    for (let k = 0; k < 3; k++) {
      positionsSmoothed[(j * 3) + k] = positions[((nVertsIn - 1) * 3) + k];
    }
  }

  static smoothWaveAndColor (positions, colors, positionsSmoothed, colorsSmoothed,
                             nVertsIn, zCoord = false) {
    const c1 = -0.15;
    const c2 = 1.15;
    const c3 = 1.15;
    const c4 = -0.15;
    const invSum = 1.0 / (c1 + c2 + c3 + c4);

    let j = 0;

    let iBelow = 0;
    let iAbove;
    let iAbove2 = 1;
    for (let i = 0; i < (nVertsIn - 1); i++) {
      iAbove = iAbove2;
      iAbove2 = Math.min(nVertsIn - 1, i + 2);

      for (let k = 0; k < 3; k++) {
        positionsSmoothed[(j * 3) + k] = positions[(i * 3) + k];
      }

      if (zCoord) {
        for (let k = 0; k < 3; k++) {
          positionsSmoothed[((j + 1) * 3) + k] =
            ((c1 * positions[(iBelow * 3) + k]) +
             (c2 * positions[(i * 3) + k]) +
             (c3 * positions[(iAbove * 3) + k]) +
             (c4 * positions[(iAbove2 * 3) + k])) * invSum;
        }
      } else {
        for (let k = 0; k < 2; k++) {
          positionsSmoothed[((j + 1) * 3) + k] =
            ((c1 * positions[(iBelow * 3) + k]) +
             (c2 * positions[(i * 3) + k]) +
             (c3 * positions[(iAbove * 3) + k]) +
             (c4 * positions[(iAbove2 * 3) + k])) * invSum;
        }
        positionsSmoothed[((j + 1) * 3) + 2] = 0;
      }

      for (let k = 0; k < 4; k++) {
        colorsSmoothed[(j * 4) + k] = colors[(i * 4) + k];
        colorsSmoothed[((j + 1) * 4) + k] = colors[(i * 4) + k];
      }

      iBelow = i;
      j += 2;
    }

    for (let k = 0; k < 3; k++) {
      positionsSmoothed[(j * 3) + k] = positions[((nVertsIn - 1) * 3) + k];
    }

    for (let k = 0; k < 4; k++) {
      colorsSmoothed[(j * 4) + k] = colors[((nVertsIn - 1) * 4) + k];
    }
  }

  /* eslint-enable no-param-reassign */
}
