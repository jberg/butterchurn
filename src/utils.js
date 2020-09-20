export default class Utils {
  static atan2(x, y) {
    let a = Math.atan2(x, y);
    if (a < 0) {
      a += 2 * Math.PI;
    }
    return a;
  }

  static cloneVars(vars) {
    return Object.assign({}, vars);
  }

  static range(start, end) {
    if (end === undefined) {
      return [...Array(start).keys()];
    }

    return Array.from({ length: end - start }, (_, i) => i + start);
  }

  static pick(obj, keys) {
    const newObj = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      newObj[key] = obj[key] || 0;
    }
    return newObj;
  }

  static omit(obj, keys) {
    const newObj = Object.assign({}, obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      delete newObj[key];
    }
    return newObj;
  }

  static setWasm(wasmGlobals, obj, keys) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      // eslint-disable-next-line no-param-reassign
      wasmGlobals[key].value = obj[key];
    }
  }

  static pickWasm(wasmGlobals, keys) {
    const newObj = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      newObj[key] = wasmGlobals[key].value;
    }
    return newObj;
  }
}
