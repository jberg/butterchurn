<!DOCTYPE HTML>
<html>
<head> 
<title>EatMe/JBerg/Butterchurn example</title>
<body> <br> 
see <a href="https://butterchurnviz.com/" target="_blank">https://butterchurnviz.com/</a> for the original project. <br>
see <a href="https://nightride.fm/" target="_blank">nightride.fm</a> for an interlaced version with radiostream. <br> 
see <a href="http://eatme.pro/music" target="_blank">eatme.pro/music</a> for a right-click fullscreen with music. <br>

<audio id="theaudioelement" src="" controls="false" crossorigin="anonymous"></audio> <br>
<a href="javascript:oPlayer.play();">play</a>
<canvas id="canvasMilkdrop" width="100" height"100"></canvas> <br>
butterchurn.js example <br>
 <br>
?audiotoplay=(audio file or stream URL) <br>
 in the document parameters will load an audio file or stream. the user must press play.<br>
 <br>
 <br>
in this example attached: <br>
right click / push longer than 500 msec on mobile <br>
fullscreen/restore <br>
 <br>
left click / tap shorter than 500 msec on mobile <br>
change preset <br>
 <br>
needed: (* indicates changes were made) <br>
* streaming or file source with HTTP Headers set to "Access-Control-Allow-Origin: *" (being a star, shift-8) <br>
on the webserver to contain a HTTP Header that allows you to use the mp3 on * all (or your) pages.  <br>
* butterchurn.js <br>
 - set the location in the script src header below <br>
 - eatme.pro/filedmin/scripts/butterchurn.js as of now contains my editing version, see attached for this working <br>
 - edit butterchurn.js var section at begin of file to set screen size, if not in stylesheet, z-index (layout order) <br>
 - default: 100x100 "98" "1" fullscreen=false <br>
butterchurn.min.js - see attached <br>
 - set the location in the script src header below <br>
butterchurnExtraImages.min.js - see attached <br>
 - set the location in the script src header below <br>
butterchurnPresets.min.js - see attached <br>
 - set the location in the script src header below <br>
butterchurnPresetsExtra.min.js - see attached <br>
 - set the location in the script src header below <br>
butterchurnPresetsExtra2.min.js - see attached <br>
 - set the location in the script src header below <br>
butterchurn_initvar.js - used to be called helper.js - see attached <br>
 - set the location in the script src header below <br>
jquery 1.12.14.min.js works - ajax.googleapis has a slow response but can be multi-site cached <br>
 - set the location in the script src header below <br>

not required:
butterchurn_isSupported.js 
- old code that is in included below in this example to check if it is supported..
https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js - loaded below <br>
* https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js is the newest referred by w3schools, not tested <br>
<br>
<br>
<!-- --></!-- -->
<noscript>
<b>this site requires script to view.</b>
</noscript>
//required: jquery 1 12 14 or something min.js here from google with a slow response time
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
<script src="butterchurn_initvar.js" type="text/javascript"></script>
<script>
const loadScript = src => {
  return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.onload = resolve
      script.onerror = reject
      script.src = src
      document.head.append(script)
    })
  }
  var bMilkDropInitialized=0;
  var visualsEnabled=0;
  var butterVis;
  var bLoadedAudioContext=0;
  var bLoadedAudioNode=0;
  var oAudioContext;
  var oAudioNode;
  var oAudioElement;
  function initMilkdrop() {
    
    return new Promise((resolve, reject) => {
      Promise.all([
        loadScript("butterchurn.min.js"),
        loadScript("butterchurnExtraImages.min.js"),
        loadScript("butterchurnPresets.min.js"),
        loadScript("butterchurnPresetsExtra.min.js"),
        loadScript("butterchurnPresetsExtra2.min.js"),
      ])
      .then(results => {
        loadScript("butterchurn.js")
        .then(r => {
          butterVis=new ButterchurnVis(document.getElementById('canvasMilkdrop'),oAudioContext,oAudioNode)
          butterVis.start();
          resolve(r);
          visualsEnabled=1;
        });
      })
      .catch(e => {
        console.log("Script Loading Error", e);
        reject(e);
      });
    });
  }
  function ToggleVisuals(){
    if(visualsEnabled==0){
      const testcanvas = document.createElement('canvas');
      let gl;
      try {
        gl = testcanvas.getContext('webgl2');
      } catch (x) {
        gl = null;
      }
      const webGL2Supported = !!gl;
      const audioApiSupported = !!(window.AudioContext || window.webkitAudioContext);
      if(webGL2Supported&&audioApiSupported){
        var bContinue=1;
        try {oAudioElement=document.getElementById('theaudioelement');oAudioElement.crossOrigin='anonymous';}
        catch (createderror){console.log('Could not find audio element on page..');bContinue=0;}
        if(bContinue==1){
          var AudioContext = window.AudioContext || window.webkitAudioContext;
          var createderror;
          if(bLoadedAudioContext==0){
            bLoadedAudioContext=1;
            try {oAudioContext = new AudioContext();}
            catch (createderror){console.log('Could not load audio context..');bLoadedAudioContext=0;}
          }
          if(bLoadedAudioNode==0){
            bLoadedAudioNode=1;
            try {oAudioNode = oAudioContext.createMediaElementSource(oAudioElement);}
            catch (createderror){console.log('Could not load audio node..');bLoadedAudioNode=0;}
          }
          if(bLoadedAudioContext==1&&bLoadedAudioNode==1){
            if(bMilkDropInitialized==0){initMilkdrop();bMilkDropInitialized=1;}else{butterVis.start();}
          }
        }
      }else{
        console.log('failed to load butterchurn: WEBGL graphics not supported.');
        document.write('failed to load butterchurn: WEBGL graphics not supported.');
      } 
    }else{
      visualsEnabled=0;
      try {butterVis.stop();}
      catch (createderror) {}
    }
  }
  var sThisUrl=window.location.href;
  sSongURL=sThisUrl.split('audiotoplay=');
  if(sSongURL[1]!='0'){
    var oPlayer=document.getElementById('theaudioelement');
    window.setTimeout(function(){oPlayer.src=sSongURL[1];},800);
    console.log("Playing "+sSongURL[1]);
    //window.setTimeout(function(){oPlayer.play();},1200);
    oPlayer.onstalled=function(){
      console.log('Audio playing stalled.. Retrying..');
      //window.setTimeout(function(){
        //oPlayer.src='';
        //oPlayer.src=sSongURL[1];
        //oPlayer.play();
      //},800);
    };
  };
  ToggleVisuals();
</script>
<br>
</body>
</html>
