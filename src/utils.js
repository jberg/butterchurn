export default class Utils {
  static atan2 (x, y) {
    let a = Math.atan2(x, y);
    if (a < 0) {
      a += (2 * Math.PI);
    }
    return a;
  }

  static cloneVars (vars) {
    return Object.assign({}, vars);
  }

  static range (start, end) {
    if (end === undefined) {
      return [...Array(start).keys()];
    }

    return Array.from({ length: (end - start) }, (_, i) => i + start);
  }
}
