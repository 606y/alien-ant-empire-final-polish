/* Optional formal-asset loader. Disabled or failed entries always fall back safely. */
(function(root){
  'use strict';
  class AssetLoader{
    constructor(manifest={images:{},audio:{}}){this.manifest=manifest;this.images=new Map();this.audioElements=new Map();this.states=new Map();this.ready=this.preload();}
    entry(key){return this.manifest.images?.[key]||this.manifest.audio?.[key]||null;}
    state(key){return this.states.get(key)||'fallback';}
    image(key){return this.state(key)==='ready'?this.images.get(key)||null:null;}
    audio(key){return this.state(key)==='ready'?this.audioElements.get(key)||null:null;}
    source(key){return this.entry(key)?.src||'';}
    async preload(){const jobs=[];for(const [key,item] of Object.entries(this.manifest.images||{})){if(item.enabled)jobs.push(this.loadImage(key,item));else this.states.set(key,'fallback');}for(const [key,item] of Object.entries(this.manifest.audio||{})){if(item.enabled)jobs.push(this.loadAudio(key,item));else this.states.set(key,'fallback');}await Promise.allSettled(jobs);return this;}
    loadImage(key,item){this.states.set(key,'loading');return new Promise(resolve=>{const img=new Image();img.decoding='async';img.onload=()=>{this.images.set(key,img);this.states.set(key,'ready');resolve(true);};img.onerror=()=>{this.states.set(key,'fallback');resolve(false);};img.src=item.src;});}
    loadAudio(key,item){this.states.set(key,'loading');return new Promise(resolve=>{const audio=new Audio();let done=false;const finish=ok=>{if(done)return;done=true;audio.removeEventListener('canplaythrough',ready);audio.removeEventListener('error',failed);if(ok){audio.loop=!!item.loop;audio.preload='auto';this.audioElements.set(key,audio);this.states.set(key,'ready');}else this.states.set(key,'fallback');resolve(ok);};const ready=()=>finish(true),failed=()=>finish(false);audio.addEventListener('canplaythrough',ready,{once:true});audio.addEventListener('error',failed,{once:true});audio.preload='auto';audio.src=item.src;audio.load();setTimeout(()=>finish(audio.readyState>=2),5000);});}
    mountImage(key,element){const img=this.image(key);if(!img||!element)return false;element.src=img.src;element.classList.remove('hidden');return true;}
    cloneAudio(key){const source=this.audio(key);if(!source)return null;const audio=source.cloneNode(true);audio.loop=source.loop;return audio;}
    report(){const out={};for(const key of [...Object.keys(this.manifest.images||{}),...Object.keys(this.manifest.audio||{})])out[key]=this.state(key);return out;}
  }
  root.AntAssetLoader=AssetLoader;
  root.AntAssets=new AssetLoader(root.AntAssetManifest||{images:{},audio:{}});
})(window);
