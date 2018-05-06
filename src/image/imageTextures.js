export default class ImageTextures {
  constructor (gl) {
    this.gl = gl;

    this.anisoExt = (
      this.gl.getExtension('EXT_texture_filter_anisotropic') ||
      this.gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      this.gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
    );

    /* eslint-disable max-len */
    this.emptyImage = new Image();
    this.emptyImage.onload = () => {
      this.emptyTex = this.gl.createTexture();
      this.bindTexture(this.emptyTex, this.emptyImage, 1, 1);
    };
    this.emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    /* eslint-enable max-len */
  }

  bindTexture (texture, data, width, height) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0,
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER,
                                              this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    if (this.anisoExt) {
      const max = this.gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      this.gl.texParameterf(this.gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, max);
    }
  }

  getTexture () {
    return this.emptyTex;
  }
}
