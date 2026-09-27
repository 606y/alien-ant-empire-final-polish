// V9.1 authorized growth/ecology/portal/assault changes rebaseline implementation fingerprints; gameplay behavior remains covered by engine and v91 tests.

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),world=read('world.js');
function renderer(){
 const calls=[],images=[];const ctx=new Proxy({createPattern(image){const p={setTransform(m){p.matrix=m},image};calls.push(['pattern',image.src]);return p},measureText:t=>({width:t.length*7})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
 class Img{constructor(){images.push(this);this.naturalWidth=512;this.naturalHeight=512}set src(v){this._src=v;queueMicrotask(()=>this.onload?.())}get src(){return this._src}}
 class Matrix{translate(x,y){this.x=x;this.y=y;return this}scale(s){this.s=s;return this}}
 const scope={window:{AntEngine:require('../engine.js')},Image:Img,DOMMatrix:Matrix,devicePixelRatio:1,performance:{now:()=>0}};vm.runInNewContext(world,scope);
 return {w:new scope.window.AntWorld({getContext:()=>ctx}),calls,images};
}
test('V8 official package: all 69 files remain byte-identical to supplied manifest',()=>{
 const m=JSON.parse(read('assets/v8/MANIFEST.json'));assert.equal(m.version,'v8');assert.equal(m.core_gameplay_change,false);assert.equal(m.files.length,69);
 for(const f of m.files){const b=fs.readFileSync(path.join(root,'assets/v8',f.path));assert.equal(b.length,f.bytes,f.path);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256,f.path);}
});
test('V9 retires V8 sprite runtime while loading existing command art once',async()=>{const {w,images}=renderer();await w.loadV8();const first=w.v8Ready;await w.loadV8();assert.equal(first,w.v8Ready);assert.equal(images.length,6);assert.equal(Object.keys(w.v8ImageCache).length,0);for(const im of images)assert.ok(fs.existsSync(path.join(root,im.src)));});

test('environment delegates exact camera coordinates and has full viewport fallback',()=>{const {w,calls}=renderer();for(const view of ['nest','surface']){w.view=view;w.art={ground(...args){assert.deepEqual(args,[1366,768,-3000,2000,45,view])}};w.worldEnvironment(1366,768,-3000,2000,45)}w.art=null;calls.length=0;w.worldEnvironment(390,844,0,0,1);assert.deepEqual(calls.find(c=>c[0]==='fillRect'),['fillRect',0,0,390,844]);});

test('room display levels remain independent of simulation room geometry',()=>{const {w}=renderer();for(const type of ['nursery','store','prey','rest','military','mutation','royal'])for(const [maturity,level]of [[0,1],[34,2],[67,3]]){const room={type,maturity,size:1,status:'active'},before=JSON.stringify(room);let called=false;w.art={state:{},room(r,x,y,radius){called=true;assert.equal(r,room);assert.deepEqual([x,y,radius],[20,30,40])}};w.roomScene(room,20,30,40);assert.ok(called);assert.equal(w.roomLevel(room),level);assert.equal(w.roomRadius(room),.51);assert.equal(JSON.stringify(room),before)}});

test('articulated unit receives actual movement angle without sprite calibration',()=>{const {w}=renderer();let args;w.art={unit(...a){args=a}};w.ant(10,20,12,'red',.7,null,true,'units/player/queen');assert.deepEqual(args,[10,20,12,.7,null,true,'units/player/queen']);assert.doesNotMatch(world,/scaleX\(-1\)/)});

test('menu Ogg is supplied stereo 48kHz Vorbis; record actual duration instead of altering official audio',()=>{
 const b=fs.readFileSync(path.join(root,'assets/v8/audio/bgm_menu_v8.ogg')),id=b.indexOf(Buffer.from([1,118,111,114,98,105,115]));assert.ok(id>=0);assert.equal(b[id+11],2);assert.equal(b.readUInt32LE(id+12),48000);
 let p=0,granule=0;while(p<b.length){assert.equal(b.toString('ascii',p,p+4),'OggS');const g=b.readBigUInt64LE(p+6);if(g<2n**63n)granule=Math.max(granule,Number(g));const n=b[p+26];let size=0;for(let i=0;i<n;i++)size+=b[p+27+i];p+=27+n+size;}assert.ok(Math.abs(granule/48000-36)<.001);
 const scope={window:{}};vm.runInNewContext(read('assets/manifest.js'),scope);assert.equal(scope.window.AntAssetManifest.menuAudio.src,'assets/v8/audio/bgm_menu_v8.ogg');
});
function audioHarness(saved=null){
 let allowed=false,pending=null;const media=[],listeners=new Map(),storage=new Map(saved?[['alien-ant-audio-muted',saved]]:[]);
 const doc={hidden:false,addEventListener(t,f,o){if(!listeners.has(t))listeners.set(t,new Map);listeners.get(t).set(f,o)},removeEventListener(t,f){listeners.get(t)?.delete(f)}};
 class Audio{constructor(src){this.src=src;this.paused=true;this.dataset={};media.push(this)}play(){if(pending)return pending.then(()=>{this.paused=false});if(!allowed)return Promise.reject(Object.assign(new Error('policy'),{name:'NotAllowedError'}));this.paused=false;return Promise.resolve()}pause(){this.paused=true}}
 const win={addEventListener(){},removeEventListener(){},AntAssets:{manifest:{menuAudio:{src:'assets/v8/audio/bgm_menu_v8.ogg',gain:.5}},ready:Promise.resolve(),audio(){return null}}};
 vm.runInNewContext(read('audio.js'),{window:win,Audio,document:doc,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},performance:{now:()=>0},requestAnimationFrame(){}});
 const a=new win.AntAudio();
 return {a,media,storage,allow:()=>allowed=true,defer:p=>pending=p,async settle(){await new Promise(r=>setImmediate(r))},emit(t){for(const[f,o]of [...(listeners.get(t)||[])]){if(o?.once)listeners.get(t).delete(f);f()}},listeners};
}
for(const event of ['pointerdown','touchend','keydown'])test('autoplay denial preserves sound ON; first '+event+' starts menu then cinema pauses it',async()=>{
 const h=audioHarness();await h.settle();assert.equal(h.a.muted,false);assert.equal(h.a.menuAudioStatus,'blocked');assert.equal(h.media[0].paused,true);h.allow();h.emit(event);await h.settle();assert.equal(h.media[0].paused,false);assert.equal(h.a.menuAudioStatus,'playing');assert.ok([...h.listeners.values()].every(l=>!l.has(h.a.menuUnlock)));h.a.suspendForCinematic();assert.equal(h.media[0].paused,true);h.a.resumeAfterCinematic();await h.settle();assert.equal(h.media[0].paused,true);h.a.destroy();
});
test('saved mute survives normal interaction and explicit unmute restores menu audio',async()=>{
 const h=audioHarness('1');h.allow();h.a.unlock();await h.settle();assert.equal(h.media[0].paused,true);assert.equal(h.a.muted,true);h.a.setMuted(false);await h.settle();assert.equal(h.media[0].paused,false);assert.equal(h.storage.get('alien-ant-audio-muted'),'0');h.a.destroy();
});
test('pending play cannot restart menu after entering cinematic or continuing save',async()=>{
 const h=audioHarness();await h.settle();let resolve;h.defer(new Promise(r=>resolve=r));const play=h.a.tryMenuPlayback();h.a.leaveMenu();resolve();await play;assert.equal(h.media[0].paused,true);h.a.destroy();
});
test('V8 integration keeps saved game key, menu art, movie and 430ms mobile gesture',()=>{
 const app=read('app.js'),html=read('index.html');assert.ok(app.includes("'alien-ant-empire-v0641'"));assert.match(app,/},430\)/);assert.ok(html.includes('menu-art.js?v=assets-v71-menu-confrontation'));assert.ok(html.includes('intro_cinematic_v6_3_capcut_badged.mp4'));assert.ok(html.includes('assets/v8/ui/v8-ui.css'));assert.match(app,/audio\.leaveMenu\(\);audio\.startGameplay\(\)/);
 for(const [p,sha]of [['engine.js','911082b4b0a6a448e5c2a6fc310cec5d650e18ec4a8c7855533990bea475d8d9'],['interaction.js','36c0bf11c1c88abb5ea432fb2cbb5d35addb5109d357550613d20ab93104e635']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'),sha);
});



test('V9 original atlas files match their provenance hashes',()=>{const m=JSON.parse(read('assets/v9/MANIFEST.json'));assert.equal(m.atlases.length,4);for(const a of m.atlases){const b=fs.readFileSync(path.join(root,'assets/v9',a.path));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);assert.equal(b.toString('ascii',1,4),'PNG')}assert.doesNotMatch(world,/assets\/v8\/(?:units|rooms|props|world)/)});
