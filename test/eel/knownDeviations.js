/**
 * Known eel-wasm deviations from the EEL2 conformance corpus, as of eel-wasm
 * 0.0.16 (the version Butterchurn depends on). The conformance test fails
 * when a case appears here that passes, or passes that is missing here.
 *
 * Each id is `section/case` from the `eel-conformance` corpus. See
 * https://github.com/zz-plant/stims/tree/main/packages/eel-conformance for the
 * case definitions and the runner contract.
 */

/** Missing EEL2 builtins: eel-wasm rejects these programs at compile time. */
const MISSING_BUILTINS = [
  'operators-arithmetic/mod-fn-is-float', // fmod() (float remainder) is not defined
  'functions-math/invsqrt', // invsqrt() is not defined
  'functions-math/invsqrt-nonpositive', // invsqrt() is not defined
  'functions-utility/frac-is-floor-based', // frac() is not defined
  'functions-utility/clamp', // clamp() is not defined
  'functions-utility/clamp-default-bounds', // clamp() is not defined
  'functions-utility/clamp-inverted-bounds', // clamp() is not defined
  'functions-utility/min-max-variadic', // min()/max() reject a third argument
  'functions-utility/mix-and-lerp', // mix()/lerp() are not defined
  'functions-utility/step-edge-first', // step() is not defined
  'functions-utility/smoothstep-midpoint', // smoothstep() is not defined
  'functions-utility/smoothstep-degenerate-edges', // smoothstep() is not defined
  'random/randint-floors-the-draw', // randint() is not defined
];

/** Grammar and arity deviations. */
const GRAMMAR = [
  // while() takes exactly one argument, so MilkDrop's while(cond, body) form
  // cannot be expressed at all
  'control-flow/while-runs-until-condition-is-zero',
  'control-flow/while-condition-is-exact-zero', // provisional case, same cause
  'random/rand-defaults-to-one', // rand() with no argument is rejected at compile time
];

/** Semantic deviations: the program runs but produces a different value. */
const SEMANTICS = [
  'operators-arithmetic/pow-overflow-clamps', // pow overflow stores Infinity instead of 0
  'operators-logical/equality-operator-is-exact', // == compares with the 1e-5 close factor instead of exact equality
  'functions-math/sqrt-negative-is-zero', // sqrt() computes sqrt(|x|) instead of guarding to 0
  'functions-math/log-zero-is-zero', // log(0) yields -Infinity instead of 0
  'functions-math/exp-overflow-clamps-at-store', // exp overflow stores Infinity instead of 0
  'functions-utility/int-truncates-toward-zero', // int() floors instead of truncating toward zero
  'functions-utility/floor-int-ceil-differ', // same root cause: int() === floor()
  'variables/pi-and-e-default', // pi and e are not prepopulated; both read as 0
  'buffers/negative-index-write-dropped', // a megabuf write at a negative index lands in a readable slot instead of being dropped
];

/** Open questions the corpus marks provisional; failures here do not count against conformance. */
const PROVISIONAL = [
  // -2 ^ 2 evaluates as -(2 ^ 2) = -4; the corpus pins (-2) ^ 2 = 4
  'operators-arithmetic/precedence-unary-minus-over-pow',
];

/** Every case id the corpus run should NOT pass, with the reason documented above. */
export const knownDeviations = [
  ...MISSING_BUILTINS,
  ...GRAMMAR,
  ...SEMANTICS,
  ...PROVISIONAL,
];
