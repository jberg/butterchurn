import { createRNGContext, createDefaultRNGContext } from './seededRandom';

let globalRNG = null;
let originalRand = null;
let originalRandint = null;
let originalMathRandom = null;

export function initializeRNG(opts = {}) {
  if (opts.deterministic || opts.testMode) {
    globalRNG = createRNGContext(opts.seed || 12345);
  } else {
    globalRNG = createDefaultRNGContext();
  }

  if (opts.deterministic || opts.testMode) {
    if (!originalRand && window.rand) {
      originalRand = window.rand;
      originalRandint = window.randint;
    }

    if (!originalMathRandom) {
      originalMathRandom = Math.random;
    }

    // Override globals with our RNG
    window.rand = (x) => globalRNG.rand(x);
    window.randint = (x) => globalRNG.randint(x);
    Math.random = () => globalRNG.random();
  }

  return globalRNG;
}

export function getRNG() {
  if (!globalRNG) {
    globalRNG = createDefaultRNGContext();
  }
  return globalRNG;
}


export function cleanup() {
  if (originalRand) {
    window.rand = originalRand;
    window.randint = originalRandint;
    originalRand = null;
    originalRandint = null;
  }

  if (originalMathRandom) {
    Math.random = originalMathRandom;
    originalMathRandom = null;
  }

  globalRNG = null;
}