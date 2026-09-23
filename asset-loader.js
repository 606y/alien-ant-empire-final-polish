/* Formal-asset loader. Failed or disabled entries retain safe fallbacks. */
(function(root){
  'use strict';
  class AssetLoader{
    constructor(manifest={images:{},audio:{}}){
      this.manifest=manifest;this.images=new Map();this.audioElements=new Map();this.audioUrls=new Map();this.states=new Map();this.ready=this.preload();
    }
    entry(key){return this.manifest.images?.[key]||this.manifest.audio?.[key]||null;}
    state(key){return this.states.get(key)||'fallback';}
    image(key){return this.state(key)==='ready'?this.images.get(key)||null:null;}
    audio(key){return this.state(key)==='ready'?this.audioElements.get(key)||null:null;}
    source(key){return this.entry(key)?.src||'';}
    async preload(){
      const jobs=[];
      for(const [key,item] of Object.entries(this.manifest.images||{})){if(item.enabled)jobs.push(this.loadImage(key,item));else this.states.set(key,'fallback');}
      for(const [key,item] of Object.entries(this.manifest.audio||{})){if(item.enabled)jobs.push(this.loadAudio(key,item));else this.states.set(key,'fallback');}
      await Promise.allSettled(jobs);return this;
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
