export default class ShaderUtils {
  static getShaderParts (t) {
    const sbIndex = t.indexOf('shader_body');
    if (t && sbIndex > -1) {
      const beforeShaderBody = t.substring(0, sbIndex);
      const afterShaderBody = t.substring(sbIndex);
      const firstCurly = afterShaderBody.indexOf('{');
      const lastCurly = afterShaderBody.lastIndexOf('}');
      const shaderBody = afterShaderBody.substring(firstCurly + 1, lastCurly);
      return [beforeShaderBody, shaderBody];
    }

    return ['', t];
  }

  static getFragmentFloatPrecision (gl) {
    if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0) {
      return 'highp';
    } else if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT).precision > 0) {
      return 'mediump';
    }
    return 'lowp';
  }
}
