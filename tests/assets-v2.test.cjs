const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const formalFiles=[
  'assets/menu/menu_bg_animation_base.png',
  'assets/menu/animated/flyer_scout_01.png','assets/menu/animated/flyer_guard_01.png','assets/menu/animated/flyer_heavy_01.png',
  'assets/intro/intro_01_fall.png','assets/intro/intro_02_mutation.png','assets/intro/intro_03_empires.png',
  'assets/audio/bgm/bgm_nest.ogg','assets/audio/bgm/bgm_surface.ogg','assets/audio/bgm/bgm_combat.ogg',
  'assets/audio/sfx/ui_confirm.ogg','assets/audio/sfx/ui_back.ogg','assets/audio/sfx/wing_pass.ogg','assets/audio/sfx/colony_pulse.ogg','assets/audio/sfx/impact_mutation.ogg'
];

test('Assets v2 package is complete and valid for browser decoding',()=>{
  for(const file of formalFiles){
    const bytes=fs.readFileSync(path.join(root,file));
    assert.ok(bytes.length>1000,file);
    if(file.endsWith('.png')){
      assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file);
      assert.ok(bytes.readUInt32BE(16)>=1200,file);
    }else assert.equal(bytes.subarray(0,4).toString(),'OggS',file);
  }
  const context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);
  const entries=[...Object.values(context.window.AntAssetManifest.images),...Object.values(context.window.AntAssetManifest.audio)];
  for(const file of formalFiles)assert.ok(entries.some(item=>item.src===file&&item.enabled),file);
  assert.deepEqual(Array.from(context.window.AntAssetManifest.introSequence),['intro01Fall','intro02Mutation','intro03Empires']);
  assert.equal(context.window.AntAssetManifest.menuFlyers.length,3);
});

test('formal menu, intro and audio controller keep safe fallbacks',()=>{
  const html=read('index.html'),menu=read('menu-art.js'),audio=read('audio.js'),app=read('app.js'),docs=read('assets/docs/ASSET-INTEGRATION.md');
  assert.ok(html.indexOf('assets/manifest.js')<html.indexOf('asset-loader.js'));
  assert.ok(html.indexOf('asset-loader.js')<html.indexOf('menu-art.js'));
  assert.match(menu,/menuBgAnimationBase/);assert.match(menu,/menuBgMain/);
  assert.match(menu,/cancelAnimationFrame/);assert.match(menu,/visibilitychange/);
  assert.doesNotMatch(menu,/drawProcedural|drawFlagSlice|drawGuardSlice/);
  assert.match(audio,/bgmNest/);assert.match(audio,/uiBack/);assert.match(audio,/impactMutation/);
  assert.match(audio,/this\.fade\(old/);assert.match(audio,/this\.muted/);
  for(const text of ['森林深處的異物','琥珀聖殿中的蟻群升蛹','黃昏戰場上的蟻國對決','進入蟻國'])assert.match(app+html,new RegExp(text));
  assert.match(docs,/Assets v2/);assert.match(read('assets/LICENSES.md'),/No third-party copyrighted assets are included\./);
});

test('BGM fade clamps the first browser frame to a legal volume',async()=>{
  const frames=[],context={window:{},performance:{now:()=>100},requestAnimationFrame:callback=>frames.push(callback)};
  vm.runInNewContext(read('audio.js'),context);
  let volume=0;const element={get volume(){return volume},set volume(value){if(value<0||value>1)throw RangeError('invalid volume');volume=value}};
  const finished=context.window.AntAudio.prototype.fade.call({},element,.27,0,420);
  frames.shift()(99);
  assert.equal(volume,.27);
  frames.shift()(520);
  await finished;
  assert.equal(volume,0);
});

test('static-host audio is fetched completely before media decoding',async()=>{
  const fetched=[],urls=[];
  class MockAudio{
    constructor(){this.listeners=new Map();this.readyState=0;this.loop=false;}
    addEventListener(type,listener){this.listeners.set(type,listener)}
    removeEventListener(type){this.listeners.delete(type)}
    load(){queueMicrotask(()=>{this.readyState=3;this.listeners.get('loadeddata')?.()})}
  }
  const context={window:{},Audio:MockAudio,fetch:async src=>{fetched.push(src);return {ok:true,blob:async()=>({})}},URL:{createObjectURL:()=>{urls.push('blob:formal-audio');return 'blob:formal-audio'},revokeObjectURL:()=>{}},setTimeout,clearTimeout,queueMicrotask};
  vm.runInNewContext(read('asset-loader.js'),context);
  const loader=new context.window.AntAssetLoader({images:{},audio:{bgmNest:{src:'assets/audio/bgm/bgm_nest.ogg',enabled:true,loop:true}}});
  await loader.ready;
  assert.equal(loader.state('bgmNest'),'ready');
  assert.equal(loader.audio('bgmNest').src,'blob:formal-audio');
  assert.equal(loader.audio('bgmNest').loop,true);
  assert.deepEqual(fetched,['assets/audio/bgm/bgm_nest.ogg']);
  assert.equal(urls.length,1);
});
