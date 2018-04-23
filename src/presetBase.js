/* eslint-disable */
window.sqr = function sqr(x) {
  return x * x;
}

window.sqrt = function sqrt(x) {
  return Math.sqrt(Math.abs(x));
}

window.log10 = function log10(val) {
  return Math.log(val) * Math.LOG10E;
}

window.sign = function sign(x) {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

window.rand = function rand(x) {
  return Math.floor(Math.random() * x);
}

window.bnot = function bnot(x) {
  return x == 0 ? 1 : 0;
}

function isFiniteNumber(num) {
  return isFinite(num) && !isNaN(num);
}

window.pow = function pow(x, y) {
  var z = Math.pow(x, y);
  if (!isFiniteNumber(z)) {
    // mostly from complex results
    return 0;
  }
  return z;
}

window.div = function div(x, y) {
  if (y === 0) {
    return 0;
  }
  var z = x / y;
  if (!isFiniteNumber(z)) {
    // probably dont need this after checking for y = 0
    return 0;
  }
  return z;
}

window.mod = function mod(x, y) {
  if (y === 0) {
    return 0;
  }
  var z = Math.floor(x) % Math.floor(y);
  return z;
}

window.bitor = function bitor(x, y) {
  var z = Math.floor(x) | Math.floor(y);
  return z;
}

window.bitand = function bitand(x, y) {
  var z = Math.floor(x) & Math.floor(y);
  return z;
}

window.sigmoid = function sigmoid(x, y) {
  var t = 1 + Math.exp(-x * y);
  return Math.abs(t) > 0.00001 ? 1.0 / t : 0;
}

window.bor = function bor(x, y) {
  return x != 0 || y != 0 ? 1 : 0;
}

window.band = function band(x, y) {
  return x != 0 && y != 0 ? 1 : 0;
}

window.equal = function equal(x, y) {
  return Math.abs(x - y) < 0.00001 ? 1 : 0;
}

window.above = function above(x, y) {
  return x > y ? 1 : 0;
}

window.below = function below(x, y) {
  return x < y ? 1 : 0;
}

window.ifcond = function ifcond(x, y, z) {
  return x != 0 ? y : z;
}
/* eslint-enable */
