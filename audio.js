/* Licensed asset audio controller. Missing formal files intentionally fall back to silence. */
(function(root){
  'use strict';
  class AntAudio{
    constructor(){
      this.assets=root.AntAssets;this.scene='nest';this.unlocked=false;this.externalBgm=null;this.externalAmbience=null;this.last={};
      try{this.muted=localStorage.getItem('alien-ant-audio-muted')==='1';}catch{this.muted=false;}
      this.assets?.ready.then(()=>{if(this.unlocked)this.syncExternalAudio();});
    }
    ensure(){return null;}
    unlock(){this.unlocked=true;this.syncExternalAudio();}
    setMuted(value){
      this.muted=value;try{localStorage.setItem('alien-ant-audio-muted',value?'1':'0');}catch{}
      for(const audio of [this.externalBgm,this.externalAmbience])if(audio){audio.muted=value;if(!value&&this.unlocked)audio.play().catch(()=>{});}
    }
    toggle(){this.unlock();this.setMuted(!this.muted);return !this.muted;}
    setScene(scene){if(!['nest','surface','combat'].includes(scene)||scene===this.scene)return;this.scene=scene;if(this.unlocked)this.syncExternalAudio();}
    playAsset(key,volume=.5){
      const audio=this.assets?.cloneAudio(key);if(!audio||this.muted||!this.unlocked)return false;
      audio.volume=volume;audio.play().catch(()=>{});return true;
    }
    switchLoop(slot,key,volume){
      const ready=this.assets?.audio(key);
      if(!ready){if(this[slot]){this[slot].pause();this[slot]=null;}return false;}
      if(this[slot]?.dataset.assetKey===key){this[slot].muted=this.muted;if(!this.muted&&this.unlocked)this[slot].play().catch(()=>{});return true;}
      if(this[slot])this[slot].pause();const audio=this.assets.cloneAudio(key);audio.dataset.assetKey=key;audio.volume=volume;audio.muted=this.muted;this[slot]=audio;if(!this.muted&&this.unlocked)audio.play().catch(()=>{});return true;
    }
    syncExternalAudio(){
      if(!this.unlocked)return false;
      const bgm={nest:'bgmNest',surface:'bgmSurface',combat:'bgmCombat'}[this.scene];
      const ambience={nest:'ambNestLoop',surface:'ambForestLoop',combat:'ambCombatTensionLoop'}[this.scene];
      const hasBgm=this.switchLoop('externalBgm',bgm,.34),hasAmbience=this.switchLoop('externalAmbience',ambience,.2);return hasBgm||hasAmbience;
    }
    ui(){this.playAsset('sfxClick',.38);}
    command(kind='move'){
      const asset={attack:'sfxAttack',gather:'sfxConfirm',build:'sfxDig',move:'sfxMove'}[kind]||'sfxClick';this.playAsset(asset,kind==='attack'?.58:.42);
    }
    event(text=''){
      const now=performance.now(),kind=/失敗|滅亡/.test(text)?'defeat':/勝利/.test(text)?'victory':/攻擊|交戰|傷亡|陣亡|威脅/.test(text)?'danger':/羽化|形成|完成/.test(text)?'rise':'notice';
      if(now-(this.last[kind]||0)<1100)return;this.last[kind]=now;
      const asset={defeat:'sfxDefeat',victory:'sfxVictory',danger:'sfxWarning',rise:'sfxConfirm',notice:'sfxAlert'}[kind];this.playAsset(asset,kind==='danger'?.62:.5);
    }
  }
  root.AntAudio=AntAudio;
})(window);
