/* Formal audio controller, including policy-aware V8 menu ambience. */
(function(root){
  'use strict';
  class AntAudio{
    constructor(){
      this.assets=root.AntAssets;this.scene='nest';this.unlocked=false;this.externalBgm=null;this.last={};this.switchToken=0;this.colonyTimer=0;this.cinematicActive=false;
      try{this.muted=localStorage.getItem('alien-ant-audio-muted')==='1';}catch{this.muted=false;}
      const menu=this.assets?.manifest?.menuAudio;this.menuActive=!!menu;this.menuBgm=menu?new Audio(menu.src):null;this.menuAudioStatus='idle';
      if(this.menuBgm){this.menuBgm.loop=true;this.menuBgm.preload='auto';this.menuBgm.volume=menu.gain??.5;this.menuBgm.muted=this.muted;}
      this.menuUnlock=()=>this.unlock();
      this.onVisibility=()=>{if(document.hidden)this.pauseLoop();else if(this.menuActive)this.tryMenuPlayback();else if(this.unlocked&&!this.muted&&!this.cinematicActive)this.syncExternalAudio();this.scheduleColonyPulse();};
      this.onWingPass=()=>this.throttled('wingPass',18000,.26);
      document.addEventListener('visibilitychange',this.onVisibility);root.addEventListener('ant:wingpass',this.onWingPass);
      this.assets?.ready.then(()=>{if(this.unlocked&&!document.hidden&&!this.menuActive)this.syncExternalAudio();});
      this.tryMenuPlayback();
    }
    ensure(){return null;}
    armMenuUnlock(){if(this.menuUnlockArmed||!this.menuActive)return;this.menuUnlockArmed=true;for(const type of ['pointerdown','touchend','keydown'])document.addEventListener(type,this.menuUnlock,{once:true,capture:true});}
    clearMenuUnlock(){for(const type of ['pointerdown','touchend','keydown'])document.removeEventListener(type,this.menuUnlock,true);this.menuUnlockArmed=false;}
    async tryMenuPlayback(){
      if(!this.menuBgm||!this.menuActive||this.muted||this.cinematicActive||document.hidden)return false;
      this.menuBgm.muted=false;
      try{await this.menuBgm.play();if(!this.menuActive||this.muted||this.cinematicActive||document.hidden){this.menuBgm.pause();return false;}this.unlocked=true;this.menuAudioStatus='playing';this.clearMenuUnlock();return true;}
      catch(error){this.menuAudioStatus=error?.name==='NotAllowedError'?'blocked':'unavailable';if(this.menuActive)this.armMenuUnlock();return false;}
    }
    leaveMenu(){this.menuActive=false;this.menuBgm?.pause();this.menuAudioStatus='paused';this.clearMenuUnlock();}
    suspendForCinematic(){this.leaveMenu();this.cinematicActive=true;this.switchToken++;this.pauseLoop();this.externalBgm=null;clearTimeout(this.colonyTimer);this.colonyTimer=0;}
    resumeAfterCinematic(){if(!this.cinematicActive)return;this.cinematicActive=false;if(this.unlocked&&!this.muted&&!document.hidden)this.syncExternalAudio();this.scheduleColonyPulse();}
    unlock(){this.unlocked=true;if(this.menuActive)this.tryMenuPlayback();else if(!this.muted&&!document.hidden&&!this.cinematicActive)this.syncExternalAudio();this.scheduleColonyPulse();}
    setMuted(value){
      this.muted=!!value;try{localStorage.setItem('alien-ant-audio-muted',this.muted?'1':'0');}catch{}
      if(this.externalBgm)this.externalBgm.muted=this.muted;
      if(this.menuBgm)this.menuBgm.muted=this.muted;
      if(this.muted)this.pauseLoop();else if(this.menuActive)this.tryMenuPlayback();else if(this.unlocked&&!document.hidden&&!this.cinematicActive)this.syncExternalAudio();
      this.scheduleColonyPulse();
    }
    toggle(){this.unlock();this.setMuted(!this.muted);return !this.muted;}
    setScene(scene){if(!['nest','surface','combat'].includes(scene)||scene===this.scene)return;this.scene=scene;if(this.unlocked&&!this.muted&&!document.hidden)this.syncExternalAudio();this.scheduleColonyPulse();}
    pauseLoop(){this.menuBgm?.pause();if(this.externalBgm&&!this.externalBgm.paused)this.externalBgm.pause();}
    fade(audio,from,to,duration){
      return new Promise(resolve=>{if(!audio){resolve();return;}const started=performance.now();audio.volume=from;const step=now=>{const progress=Math.max(0,Math.min(1,(now-started)/duration));audio.volume=Math.max(0,Math.min(1,from+(to-from)*progress));if(progress<1)requestAnimationFrame(step);else resolve();};requestAnimationFrame(step);});
    }
    async syncExternalAudio(){
      if(this.menuActive||!this.unlocked||this.muted||document.hidden||this.cinematicActive)return false;
      const key={nest:'bgmNest',surface:'bgmSurface',combat:'bgmCombat'}[this.scene],ready=this.assets?.audio(key),token=++this.switchToken;
      if(!ready){this.pauseLoop();this.externalBgm=null;return false;}
      if(this.externalBgm?.dataset.assetKey===key){this.externalBgm.muted=false;await this.externalBgm.play().catch(()=>{});return true;}
      const old=this.externalBgm;
      if(old){await this.fade(old,old.volume,0,420);old.pause();old.currentTime=0;}
      if(token!==this.switchToken||this.muted||document.hidden)return false;
      const audio=this.assets.cloneAudio(key);if(!audio)return false;audio.dataset.assetKey=key;audio.volume=0;audio.muted=false;this.externalBgm=audio;
      await audio.play().catch(()=>{});if(token===this.switchToken)await this.fade(audio,0,.27,520);return true;
    }
    playAsset(key,volume=.4){
      const audio=this.assets?.cloneAudio(key);if(!audio||this.muted||!this.unlocked||document.hidden||this.cinematicActive)return false;
      audio.volume=volume;audio.play().catch(()=>{});return true;
    }
    throttled(key,interval,volume){const now=performance.now();if(now-(this.last[key]||0)<interval)return false;this.last[key]=now;return this.playAsset(key,volume);}
    ui(){return this.throttled('uiConfirm',90,.32);}
    back(){return this.throttled('uiBack',90,.3);}
    introMutation(){return this.throttled('impactMutation',700,.44);}
    command(kind='move'){return this.throttled('uiConfirm',140,kind==='attack'?.38:.3);}
    event(text=''){
      if(/異變|未知黑色|碎屑/.test(text))return this.throttled('impactMutation',1600,.4);
      if(/攻擊|交戰|傷亡|陣亡|威脅/.test(text))return this.throttled('impactMutation',1800,.33);
      if(/形成|完成|羽化|勝利/.test(text))return this.throttled('uiConfirm',900,.32);
      return false;
    }
    scheduleColonyPulse(){
      clearTimeout(this.colonyTimer);this.colonyTimer=0;
      if(this.menuActive||!this.unlocked||this.muted||document.hidden||this.cinematicActive||this.scene!=='nest')return;
      this.colonyTimer=setTimeout(()=>{this.playAsset('colonyPulse',.18);this.scheduleColonyPulse();},19000+Math.random()*5000);
    }
    destroy(){this.leaveMenu();clearTimeout(this.colonyTimer);this.switchToken++;this.pauseLoop();document.removeEventListener('visibilitychange',this.onVisibility);root.removeEventListener('ant:wingpass',this.onWingPass);}
  }
  root.AntAudio=AntAudio;
})(window);
