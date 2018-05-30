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

  static pick (obj, keys) {
    const newObj = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      newObj[key] = obj[key];
    }
    return newObj;
  }

  static omit (obj, keys) {
    const newObj = Object.assign({}, obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      delete newObj[key];
    }
    return newObj;
  }
}
