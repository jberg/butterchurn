import _ from 'lodash';

export default class Utils {
  static atan2 (x, y) {
    let a = Math.atan2(x, y);
    if (a < 0) {
      a += (2 * Math.PI);
    }
    return a;
  }

  static cloneVars (vars) {
    return _.clone(vars);
  }
}
