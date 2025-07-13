/**
 * SeededRandom - Deterministic pseudo-random number generator
 * Using xorshift128+ algorithm
 */
export class SeededRandom {
  constructor(seed = 1) {
    this.state = new Uint32Array(4);
    SeededRandom.initializeState(this.state, seed);
    this.warmUp();
  }

  static initializeState(state, seed) {
    state[0] = seed;
    state[1] = seed ^ 0x9e3779b9;
    state[2] = seed ^ 0x6a09e667;
    state[3] = seed ^ 0xbb67ae85;
  }

  warmUp() {
    for (let i = 0; i < 10; i++) {
      this.next();
    }
  }

  /**
   * Generate next random number in [0, 1)
   */
  next() {
    // xorshift128+ algorithm
    let t = this.state[3];
    let s = this.state[0];
    this.state[3] = this.state[2];
    this.state[2] = this.state[1];
    this.state[1] = s;

    t ^= t << 11;
    t ^= t >>> 8;
    this.state[0] = t ^ s ^ (s >>> 19);

    // Convert to [0, 1) range
    return (this.state[0] >>> 0) / 0x100000000;
  }

  /**
   * Generate random integer in [0, max)
   */
  nextInt(max) {
    return Math.floor(this.next() * max);
  }

  /**
   * Generate random number in [0, max)
   * Mimics butterchurn's rand() behavior
   */
  rand(max) {
    if (max < 1) {
      return this.next();
    }
    return Math.floor(this.next() * Math.floor(max));
  }

  /**
   * Reset generator to initial seed
   */
  reset(seed) {
    SeededRandom.initializeState(this.state, seed);
    this.warmUp();
  }
}

export function createRNGContext(seed = 1) {
  const rng = new SeededRandom(seed);

  return {
    random: () => rng.next(),
    rand: (x) => rng.rand(x),
    randint: (x) => Math.floor(rng.rand(x) + 1),
    getRNG: () => rng,
    reset: (newSeed) => {
      if (newSeed !== undefined) {
        rng.reset(newSeed);
      } else {
        rng.reset(seed);
      }
    }
  };
}

export function createDefaultRNGContext() {
  return {
    random: Math.random,
    rand: (x) => x < 1 ? Math.random() : Math.random() * Math.floor(x),
    randint: (x) => Math.floor((x < 1 ? Math.random() : Math.random() * Math.floor(x)) + 1),
    getRNG: () => null,
    reset: () => {}
  };
}
