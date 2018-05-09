import BlurVertical from './blurVertical';
import BlurHorizontal from './blurHorizontal';

export default class BlurShader {
  constructor (blurLevel, blurRatios, gl, opts = {}) {
    this.blurLevel = blurLevel;
    this.blurRatios = blurRatios;
    this.gl = gl;

    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;

    this.anisoExt = (
      this.gl.getExtension('EXT_texture_filter_anisotropic') ||
      this.gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      this.gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
    );

    this.blurHorizontalFrameBuffer = this.gl.createFramebuffer();
    this.blurVerticalFrameBuffer = this.gl.createFramebuffer();

    this.blurHorizontalTexture = this.gl.createTexture();
    this.blurVerticalTexture = this.gl.createTexture();

    this.setupFrameBufferTextures();

    this.blurHorizontal = new BlurHorizontal(gl, this.blurLevel, opts);
    this.blurVertical = new BlurVertical(gl, this.blurLevel, opts);
  }

  updateGlobals (opts) {
    this.texsizeX = opts.texsizeX;
    this.texsizeY = opts.texsizeY;

    this.setupFrameBufferTextures();
  }

  getTextureSize (sizeRatio) {
    let sizeX = Math.max(this.texsizeX * sizeRatio, 16);
    sizeX = Math.floor((sizeX + 3) / 16) * 16;
    let sizeY = Math.max(this.texsizeY * sizeRatio, 16);
    sizeY = Math.floor((sizeY + 3) / 4) * 4;
    return [sizeX, sizeY];
  }

  setupFrameBufferTextures () {
    const srcBlurRatios = this.blurLevel > 0 ? this.blurRatios[this.blurLevel - 1] : [1, 1];
    const dstBlurRatios = this.blurRatios[this.blurLevel];
    const srcTexsizeHorizontal = this.getTextureSize(srcBlurRatios[1]);
    const dstTexsizeHorizontal = this.getTextureSize(dstBlurRatios[0]);
    this.bindFrameBufferTexture(this.blurHorizontalFrameBuffer, this.blurHorizontalTexture,
                                dstTexsizeHorizontal);

    const srcTexsizeVertical = dstTexsizeHorizontal;
    const dstTexsizeVertical = this.getTextureSize(dstBlurRatios[1]);
    this.bindFrameBufferTexture(this.blurVerticalFrameBuffer, this.blurVerticalTexture,
                                dstTexsizeVertical);

    this.horizontalTexsizes = [srcTexsizeHorizontal, dstTexsizeHorizontal];
    this.verticalTexsizes = [srcTexsizeVertical, dstTexsizeVertical];
  }

  bindFrambufferAndSetViewport (fb, texsize) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
    this.gl.viewport(0, 0, texsize[0], texsize[1]);
  }

  bindFrameBufferTexture (targetFrameBuffer, targetTexture, texsize) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, targetTexture);

    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,
                       texsize[0], texsize[1], 0,
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE,
                       new Uint8Array(texsize[0] * texsize[1] * 4));

    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER,
                                              this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    if (this.anisoExt) {
      const max = this.gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      this.gl.texParameterf(this.gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, max);
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, targetFrameBuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
                                 this.gl.TEXTURE_2D, targetTexture, 0);
  }

  renderBlurTexture (prevTexture, mdVSFrame, blurMins, blurMaxs) {
    this.bindFrambufferAndSetViewport(this.blurHorizontalFrameBuffer, this.horizontalTexsizes[1]);
    this.blurHorizontal.renderQuadTexture(prevTexture, mdVSFrame, blurMins, blurMaxs,
                                          this.horizontalTexsizes[0]);

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurHorizontalTexture);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.bindFrambufferAndSetViewport(this.blurVerticalFrameBuffer, this.verticalTexsizes[1]);
    this.blurVertical.renderQuadTexture(this.blurHorizontalTexture, mdVSFrame,
                                        this.verticalTexsizes[0]);

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurVerticalTexture);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
  }
}
