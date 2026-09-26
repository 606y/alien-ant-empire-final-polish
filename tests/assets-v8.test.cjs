
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),world=read('world.js');
function renderer(){
 const calls=[],images=[];const ctx=new Proxy({createPattern(image){const p={setTransform(m){p.matrix=m},image};calls.push(['pattern',image.src]);return p},measureText:t=>({width:t.length*7})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
 class Img{constructor(){images.push(this);this.naturalWidth=512;this.naturalHeight=512}set src(v){this._src=v;queueMicrotask(()=>this.onload?.())}get src(){return this._src}}
 class Matrix{translate(x,y){this.x=x;this.y=y;return this}scale(s){this.s=s;return this}}
 const scope={window:{},Image:Img,DOMMatrix:Matrix,document:{createElement:()=>({getContext:()=>ctx})}};vm.runInNewContext(world,scope);
 return {w:new scope.window.AntWorld({getContext:()=>ctx}),calls,images};
}
test('V8 official package: all 69 files remain byte-identical to supplied manifest',()=>{
 const m=JSON.parse(read('assets/v8/MANIFEST.json'));assert.equal(m.version,'v8');assert.equal(m.core_gameplay_change,false);assert.equal(m.files.length,69);
 for(const f of m.files){const b=fs.readFileSync(path.join(root,'assets/v8',f.path));assert.equal(b.length,f.bytes,f.path);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256,f.path);}
});
test('V8 loads 14 independent units, 21 room scenes, 10 props and 6 environment images only once',async()=>{
 const {w,images,calls}=renderer();await w.loadV8();const first=w.v8Ready;await w.loadV8();assert.equal(w.v8Ready,first);assert.equal(images.length,57);
 const keys=Object.keys(w.v8ImageCache);assert.equal(keys.length,51);assert.equal(keys.filter(k=>k.startsWith('units/player')).length,6);assert.equal(keys.filter(k=>k.startsWith('units/enemies')).length,8);assert.equal(keys.filter(k=>k.startsWith('rooms/')).length,21);assert.equal(keys.filter(k=>k.startsWith('props/')).length,10);assert.equal(calls.filter(c=>c[0]==='pattern').length,6);
 assert.equal(images.filter(i=>i.src.includes('/units/')&&!i.src.includes('/v8/')).length,0);
 for(const k of keys)assert.ok(fs.existsSync(path.join(root,w.v8ImageCache[k].src)));
});
test('environment fills the entire viewport and pattern coordinates follow camera translation and zoom',async()=>{
 const {w,calls}=renderer();await w.loadV8();
 for(const view of ['nest','surface']){w.view=view;for(const scale of [12,45,140])for(const [x,y]of [[-3000,2000],[2000,-3000]]){calls.length=0;w.worldEnvironment(1366,768,x,y,scale);assert.deepEqual(calls.find(c=>c[0]==='fillRect'),['fillRect',0,0,1366,768]);const m=w.v8Patterns[view+'/unexplored'].matrix;assert.equal(m.x,x);assert.equal(m.y,y);assert.equal(m.s,scale*6/512);}}
 w.v8Patterns={};calls.length=0;w.worldEnvironment(390,844,0,0,1);assert.deepEqual(calls.find(c=>c[0]==='fillRect'),['fillRect',0,0,390,844]);
});
test('room maturity changes only the visual source; clipping preserves original center and radius',async()=>{
 const {w,calls}=renderer();await w.loadV8();
 for(const type of ['nursery','store','prey','rest','military','mutation','royal']){const room={type,maturity:0,status:'active'};
 for(const [m,level]of [[0,1],[33,1],[34,2],[66,2],[67,3],[100,3]]){room.maturity=m;const before=JSON.stringify(room);calls.length=0;w.roomScene(room,20,30,40);assert.equal(JSON.stringify(room),before);assert.equal(w.v8RoomCache.get(room).image,w.v8ImageCache['rooms/'+type+'/'+level]);assert.deepEqual(calls.find(c=>c[0]==='ellipse').slice(0,5),['ellipse',20,30,40,28.799999999999997]);const cached=w.v8RoomCache.get(room);w.roomScene(room,20,30,40);assert.equal(w.v8RoomCache.get(room),cached);}}
});
test('whole sprite rendering uses actual source with rotation and no mirrored or generic ant fallback',async()=>{
 const {w,calls}=renderer();await w.loadV8();calls.length=0;w.ant(10,20,12,'red',.7,null,true,'units/player/queen');assert.ok(calls.some(c=>c[0]==='rotate'&&c[1]===.7));assert.equal(calls.find(c=>c[0]==='drawImage')[1],w.v8ImageCache['units/player/queen']);assert.ok(!calls.some(c=>c[0]==='scale'));assert.doesNotMatch(world.slice(world.indexOf('    ant('),world.indexOf('    label(')),/lineTo|bezier|bodyPart/);
});
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
 const app=read('app.js'),html=read('index.html');assert.ok(app.includes("'alien-ant-empire-v0641'"));assert.match(app,/},430\)/);assert.ok(html.includes('menu-art.js?v=assets-v71-menu-confrontation'));assert.ok(html.includes('intro_cinematic_v6_3_capcut_badged.mp4'));assert.ok(html.includes('assets/v8/ui/v8-ui.css'));assert.match(app,/audio\.leaveMenu\(\);audio\.unlock\(\)/);
 for(const [p,sha]of [['engine.js','436ebb5a4184bdab850cb89dc9741a85aca822fca406da12880e87df7670d858'],['interaction.js','587b19cf04d9c355c4f4af6850a8239baf559ba74f1fc7c1f19a6f41c73179d4']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'),sha);
});



test('repeated official tiles exclude their black footer without altering source files',async()=>{const {w,calls}=renderer();await w.loadV8();const sources=calls.filter(c=>c[0]==='pattern').map(c=>c[1]);assert.equal(sources.length,6);assert.match(world,/source.height=key.startsWith\('nest\/'\)\?398:458/);assert.doesNotMatch(world.slice(world.indexOf('    draw(s,')),/createElement|new Image/);});
