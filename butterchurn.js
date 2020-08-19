var ciFixedWidth=100;
var ciFixedHeight=100;
var cstrFullScreenZIndex="98";
var cstrFixedScreenZIndex="1";
var bSetFullScreen=0;
var timer;
var touchduration = 700; //length of time we want the user to touch before we do something
const getShuffledArr = arr => {
    const newArr = arr.slice()
    for (let i = newArr.length - 1; i > 0; i--) {
        const rand = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[rand]] = [newArr[rand], newArr[i]];
    }
    return newArr
};

class ButterchurnVis {
  constructor(page, context, audioNode) {
    this.page = page;
    this.context = context;
    this.audioNode = audioNode;
    this.initialised = false;
    this.cycle = true;

    // Bound Functions
    this.loop = this.loopFunc.bind(this);
    this.resize = this.resizeFunc.bind(this);
    this.start = this.startFunc.bind(this);
    this.stop = this.stopFunc.bind(this);
  }
  init() {
    this.canvas = this.page.canvas = canvasMilkdrop;
    this.butterchurn = butterchurn.default.createVisualizer(this.context, this.canvas , {
      width: 100,
      height: 100,
      pixelRatio: window.devicePixelRatio || 1,
      textureRatio: 1,
      // meshWidth: 128,
      // meshHeight: 72,
    });

    this.butterchurn.connectAudio(this.audioNode);

    this.loopID = undefined;

    // Preset Details
    this.cycleFunc = undefined;
    this.cycleTimeMS = 20000;
    this.blendTime = 2.7;
    this.presets = {};
    this.presetKeys = [];
    this.presetIndex = 0;
    // Load Presets
    if (W.butterchurnPresets) {
      Object.assign(this.presets, butterchurnPresets.getPresets());
    }
    if (W.butterchurnPresetsExtra) {
      Object.assign(this.presets, butterchurnPresetsExtra.getPresets());
    }
    if (W.butterchurnPresetsExtra2) {
      Object.assign(this.presets, butterchurnPresetsExtra2.getPresets());
    }
    if (W.butterchurnExtraImages) {
      this.butterchurn.loadExtraImages(butterchurnExtraImages.default.getImages());
    }
    this.shufflePresets();

    // Event Handlers
    this.canvas.addEventListener('click', this.forceNextPreset.bind(this));
    this.canvas.addEventListener('contextmenu', this.fullScreenFunc.bind(this), false);
    this.canvas.addEventListener("touchstart", this.touchstartFunc.bind(this), false);
    this.canvas.addEventListener("touchend", this.touchendFunc.bind(this), false);
    resizeFuncs.push(this.resize);
    this.initialised = true;
  }
  fullScreenFunc(event) {
    event.preventDefault();
    event.stopPropagation();
    if(bSetFullScreen==0){
      var scrHeight=screen.availHeight;
      var scrWidth=screen.availWidth;
      this.canvas.height=scrHeight;
      this.canvas.width=scrWidth;
      this.butterchurn.setRendererSize(scrWidth, scrHeight, {});
      this.canvas.style.zindex=cstrFullScreenZIndex;
      bSetFullScreen=1;
    }else{
      this.canvas.height = ciFixedHeight;
      this.canvas.width = ciFixedWidth;
      this.butterchurn.setRendererSize(ciFixedWidth, ciFixedHeight, {});
      this.canvas.style.zindex=cstrFixedScreenZIndex;
      bSetFullScreen=0;
    }
    return false;
  }
  loopFunc() {
    this.loopID = requestAnimationFrame(this.loop);
    this.butterchurn.render();
  }
  startFunc() {
    if (!this.initialised) {
      this.init();
    }
    console.log("Butterchurn Start");
    if (this.loopID) {
      return // Already Running
    }
    this.clearCycle();
    this.butterchurn.startSampler();
    this.loop();
    this.resize();
  }
  stopFunc() {
    if (!this.initialised) {
      return
    }
    console.log("Butterchurn Stop");
    clearInterval(this.cycleFunc);
    this.loopID && cancelAnimationFrame(this.loopID);
    this.loopID = undefined;
    this.butterchurn.stopSampler();
  }
  resizeFunc() {
    if(bSetFullScreen==0){
      this.canvas.height = ciFixedHeight;
      this.canvas.width = ciFixedWidth;
      this.butterchurn.setRendererSize(ciFixedWidth, ciFixedHeight, {});
      this.canvas.style.zindex=cstrFixedScreenZIndex;
    }else{
      var scrHeight=screen.availHeight;
      var scrWidth=screen.availWidth;
      this.canvas.height=scrHeight;
      this.canvas.width=scrWidth;
      this.butterchurn.setRendererSize(scrWidth, scrHeight, {});
      this.canvas.style.zindex=cstrFullScreenZIndex;
    }
  }
  clearCycle() {
    clearInterval(this.cycleFunc);
    if (this.cycle) {
      this.cycleFunc = setInterval(() => this.nextPreset(this.blendTime), this.cycleTimeMS);
    }
  }
  shufflePresets() {
    this.presetKeys = getShuffledArr(Object.keys(this.presets));
    this.presetIndex = Math.floor(Math.random() * this.presetKeys.length);
  }
  nextPreset() {
    this.presetIndex += 1;
    if (this.presetIndex > (this.presetKeys.length -1)) {
      this.shufflePresets();
    }
    this.butterchurn.loadPreset(this.presets[this.presetKeys[this.presetIndex]], this.blendTime);
  }
  prevPreset() {
    if (this.presetIndex == 0) {
      this.presetIndex = this.presetKeys.length - 1;
    } else {
      this.presetIndex -= 1;
    }
    this.butterchurn.loadPreset(this.presets[this.presetKeys[this.presetIndex]], this.blendTime);
  }
  forceNextPreset() {
    this.clearCycle();
    this.nextPreset();
  }
  forcePrevPreset() {
    this.clearCycle();
    this.prevPreset();
  }
  showTitle(title) {
    this.butterchurn.launchSongTitleAnim(title);
  }
  touchstartFunc(e) {
    e.preventDefault();
    if (!timer) {
      timer = setTimeout(onlongtouch, touchduration);
    }
    return false;
  } 
  touchendFunc(e) {
    e.preventDefault();
    if (timer) {
      clearTimeout(timer);
      timer = null;
      forceNextPreset();
    }
    return false;
  }
  onlongtouch() { 
    timer = null;
    funcFullScreen();
  }
}