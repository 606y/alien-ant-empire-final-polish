/* Formal-asset loader. Failed or disabled entries retain safe fallbacks. */
(function(root){
  'use strict';
  class AssetLoader{
    constructor(manifest={images:{},audio:{}}){
      this.manifest=manifest;this.images=new Map();this.audioElements=new Map();this.audioUrls=new Map();this.states=new Map();this.menuReady=new Promise(resolve=>{this.resolveMenuReady=resolve;});this.ready=this.preload();
    }
    entry(key){return this.manifest.images?.[key]||this.manifest.audio?.[key]||null;}
    state(key){return this.states.get(key)||'fallback';}
    image(key){return this.state(key)==='ready'?this.images.get(key)||null:null;}
    audio(key){return this.state(key)==='ready'?this.audioElements.get(key)||null:null;}
    source(key){return this.entry(key)?.src||'';}
    async preload(){
      const images=this.manifest.images||{},audio=this.manifest.audio||{},tiers=this.manifest.imageTiers;
      for(const key of Object.keys(images))this.states.set(key,'fallback');
      const loadKeys=keys=>Promise.allSettled((keys||[]).filter(key=>images[key]?.enabled).map(key=>this.loadImage(key,images[key])));
      const audioJobs=()=>Object.entries(audio).map(([key,item])=>item.enabled?this.loadAudio(key,item):(this.states.set(key,'fallback'),Promise.resolve(false)));
      if(!tiers){await Promise.allSettled([...Object.entries(images).filter(([,item])=>item.enabled).map(([key,item])=>this.loadImage(key,item)),...audioJobs()]);this.resolveMenuReady(this);return this;}
      const primary=tiers.primary||[];
      await loadKeys(tiers.menuV71);
      const v71Ready=(tiers.menuV71||[]).length===5&&tiers.menuV71.every(key=>this.state(key)==='ready');
      if(!v71Ready){
        this.states.set('menuBgV71','fallback');
        await loadKeys(primary.filter(key=>!key.startsWith('intro')));
        if(this.state('menuBgV6')!=='ready')await loadKeys(tiers.menuV6Alt);
        if(this.state('menuBgV6')!=='ready'&&this.state('menuBgV6Alt')!=='ready')await loadKeys(tiers.menuV5);
        if(this.state('menuBgV6')!=='ready'&&this.state('menuBgV6Alt')!=='ready'&&this.state('menuBgV5')!=='ready'){
          await loadKeys(tiers.menuV4);
          if(this.state('menuBgV4')!=='ready'){
            await loadKeys(tiers.menuV3);
            if(this.state('menuBgV3')!=='ready')await loadKeys(tiers.menuV2);
            else if(!(this.manifest.menuFlyersV3||[]).every(group=>this.state(group.body)==='ready'&&this.state(group.wings)==='ready'))await loadKeys(this.manifest.menuFlyers||[]);
          }
        }
      }
      this.resolveMenuReady(this);
      await Promise.allSettled([loadKeys(primary.filter(key=>key.startsWith('intro'))),...audioJobs()]);
      for(let i=0;i<(this.manifest.introSequenceV6||[]).length;i++){
        if(this.state(this.manifest.introSequenceV6[i])==='ready')continue;
        await loadKeys([this.manifest.introSequenceV5?.[i]]);
        if(this.state(this.manifest.introSequenceV5?.[i])==='ready')continue;
        await loadKeys([this.manifest.introSequenceV4?.[i]]);
        if(this.state(this.manifest.introSequenceV4?.[i])==='ready')continue;
        await loadKeys([this.manifest.introSequenceV3?.[i]]);
        if(this.state(this.manifest.introSequenceV3?.[i])!=='ready')await loadKeys([this.manifest.introSequence?.[i]]);
      }
      return this;
    }
    loadImage(key,item){
      this.states.set(key,'loading');return new Promise(resolve=>{const image=new Image();image.decoding='async';image.onload=()=>{this.images.set(key,image);this.states.set(key,'ready');resolve(true)};image.onerror=()=>{this.states.set(key,'fallback');resolve(false)};image.src=item.src;});
    }
    async loadAudio(key,item){
      this.states.set(key,'loading');let url=item.src,objectUrl='';
      try{
        // A complete same-origin fetch avoids delayed byte-range media requests on static hosts.
        if(typeof fetch==='function'&&typeof URL!=='undefined'&&typeof URL.createObjectURL==='function'){
          const response=await fetch(item.src);if(!response.ok)throw Error(`Audio HTTP ${response.status}`);
          objectUrl=URL.createObjectURL(await response.blob());url=objectUrl;
        }
        const ready=await new Promise(resolve=>{
          const audio=new Audio();let done=false,timer;
          const finish=ok=>{if(done)return;done=true;clearTimeout(timer);audio.removeEventListener('canplay',available);audio.removeEventListener('loadeddata',available);audio.removeEventListener('error',failed);resolve(ok?audio:null)};
          const available=()=>finish(audio.readyState>=2),failed=()=>finish(false);
          audio.addEventListener('canplay',available,{once:true});audio.addEventListener('loadeddata',available,{once:true});audio.addEventListener('error',failed,{once:true});
          audio.preload='auto';audio.loop=!!item.loop;audio.src=url;
          timer=setTimeout(()=>finish(audio.readyState>=2),15000);audio.load();
        });
        if(!ready)throw Error('Audio not decoded');
        this.audioElements.set(key,ready);if(objectUrl)this.audioUrls.set(key,objectUrl);this.states.set(key,'ready');return true;
      }catch{
        if(objectUrl)URL.revokeObjectURL(objectUrl);
        this.states.set(key,'fallback');return false;
      }
    }
    mountImage(key,element){const image=this.image(key);if(!image||!element)return false;element.src=image.src;element.classList.remove('hidden');return true;}
    cloneAudio(key){const source=this.audio(key);if(!source)return null;const audio=source.cloneNode(true);audio.loop=source.loop;return audio;}
    report(){const out={};for(const key of [...Object.keys(this.manifest.images||{}),...Object.keys(this.manifest.audio||{})])out[key]=this.state(key);return out;}
  }
  root.AntAssetLoader=AssetLoader;
  root.AntAssets=new AssetLoader(root.AntAssetManifest||{images:{},audio:{}});
})(window);
