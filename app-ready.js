/* V7 presentation readiness: only the menu image tier and a painted frame gate the first screen. */
(function(root){
  'use strict';
  const overlay=document.getElementById('appLoading'),started=performance.now();
  const state={status:'loading',started,criticalReady:false,firstFrame:false,twoFrames:false};
  root.appReadyState=state;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  root.appReady=new Promise(resolve=>{
    let settled=false;
    const finish=async(status)=>{
      if(settled)return;settled=true;clearTimeout(watchdog);state.status=status;
      await delay(Math.max(0,450-(performance.now()-started)));
      overlay?.classList.add('is-fading');
      await delay(350);
      overlay?.remove();
      root.dispatchEvent(new CustomEvent('ant:app-ready'));
      resolve(state);
    };
    const watchdog=setTimeout(()=>{
      console.warn('V7 loading timed out after 8 seconds; continuing with existing menu fallback.');
      finish('timeout');
    },8000);
    (async()=>{
      if(document.readyState==='loading')await new Promise(done=>document.addEventListener('DOMContentLoaded',done,{once:true}));
      if(!root.AntAssetManifest||!root.AntAssets||!root.AntAppPresentation?.menuArt)throw Error('Presentation runtime unavailable');
      await root.AntAssets.menuReady;
      if(settled)return;
      state.criticalReady=true;
      await root.AntAppPresentation.menuArt.whenNextMenuFrame();
      if(settled)return;
      state.firstFrame=true;
      await frame();await frame();
      if(settled)return;
      state.twoFrames=true;
      finish('ready');
    })().catch(error=>{
      if(settled)return;
      console.warn('V7 loading fallback:',error?.message||String(error));
      finish('fallback');
    });
  });
})(window);
