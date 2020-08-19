const N = navigator;
const D = document;
const DE = D.documentElement;
const W = window;
const I = (v) => D.getElementById(v);
const IS_BOT = /bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|woorank/i.test(N.userAgent);

const underscoreRE = /_/g;
const timeRE = /\d\d:\d\d:\d\d/;
const trackRE = /^[\s-]*/;
const escapeMap = {'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;','/': '&#x2F;','`': '&#x60;','=': '&#x3D;'};
const escape = (string) => (string && string.replace(/[&<>"'`=\/]/g, s => escapeMap[s]) || '');

var playing = false;
var youtube;
var youtubePlaying = false;
var resizeFuncs = [];
var popStateFuncs = [];

function sl(a,b){localStorage.setItem(a,JSON.stringify(b)); return b;}
function ls(a,b){var x = JSON.parse(localStorage.getItem(a)); return x === null ? sl(a,b) : x;}

function scriptLoad(url){
  return new Promise((resolve, reject) => {
    var script = document.createElement("script");
    script.onerror = (e) => reject(e);
    script.onload = () => resolve(script);
    D.body.appendChild(script);
    script.src = url;
  });
}

function CE(type, classes, id) {
  type = type === undefined ? 'DIV' : type;
  classes = classes === undefined ? '' : escape(classes);
  id = id === undefined ? '' : escape(id);
  var n = D.createElement(type);
  id && n.setAttribute('id', id);
  classes && n.setAttribute('class', classes);
  return n
}

function removeEls(els) {
  els.forEach(el => el.parentNode && el.parentNode.removeChild(el));
}

const clamp = (max, val) => val < 0 ? 0 : val > max ? max : val;

function isMobile() {
  if (navigator.userAgent.match(/Mobi/)) {
    return true;
  }

  if ('screen' in window && window.screen.width < 760) {
    return true;
  }

  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && connection.type === 'cellular') {
    return true;
  }

  return false;
}
var IS_MOBILE = isMobile();
let IS_IOS = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
IS_MOBILE && D.body.classList.add('mobile');

W.AudioContext = (W.AudioContext || W.webkitAudioContext || W.mozAudioContext || W.oAudioContext || W.msAudioContext);
var CAN_WEBAUDIO = !!W.AudioContext && !IS_IOS;
var CAN_MSE = !!W.MediaSource;
var CAN_WEBGL = false;
if (CAN_WEBAUDIO) {
  let test = CE('CANVAS');
  let result = null;
  try {
    result = test.getContext("webgl2");
  } catch (err) {
    console.warn("Could not create a WebGL v2 context", err);
  }
  CAN_WEBGL = !IS_MOBILE && !!result;
}

W.addEventListener("resize", (e) => resizeFuncs.forEach(f => f(e)));

var mouseTimer, touchTimer;
var canHover = false;
var touched = false;
W.addEventListener("mousemove", (e)=> {
  if (!touched) {
    if (!canHover) {
      canHover = true;
      D.body.classList.add("canHover");
    }
    if (mouseTimer) {
      clearTimeout(mouseTimer);
      mouseTimer = 0;
      D.body.classList.remove("mouseHide");
    }
    mouseTimer = setTimeout(()=>{
      canHover = false;
      D.body.classList.remove("canHover");
      D.body.classList.add("mouseHide");
    }, 4000)
  }
});

W.addEventListener("touchstart", (e)=> {
  touched = true;
});
W.addEventListener("touchend", (e)=> {
  touchTimer = setTimeout(()=>{touched = false;}, 100);
});

var beforeunloadFuncs = [];
W.addEventListener('beforeunload', (e) => {
    beforeunloadFuncs.forEach(fn => fn(e));
});

W.addEventListener('beforeinstallprompt', (e) => {
  console.log("PWA Install Prompt Fired");
});
// Can extend on this list
var keyMap = new Map([
    [122, () => {D.body.classList.contains("minimal") ? D.body.classList.remove("minimal") : D.body.classList.add("minimal"); W.dispatchEvent(new Event('resize'))}],
]);
D.addEventListener('keydown', (e) => {
    // console.log(e.keyCode);
    var f = e.ctrlKey && keyMap.get(e.keyCode) || false;
    f && f();
});
var freezeFuncs = [];
D.addEventListener('freeze', (event) => {
  console.log("The Site Was Frozen", event);
  freezeFuncs.forEach(fn => fn(e));
  // The page is now frozen.
});
var resumeFuncs = [];
D.addEventListener('resume', (event) => {
  console.log("The Site Was Resumed", event);
  resumeFuncs.forEach(fn => fn(e));
  // alert("The Page Was Resumed!");
  // The page has been unfrozen.
});
