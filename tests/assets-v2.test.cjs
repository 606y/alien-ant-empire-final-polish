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
  for(const text of ['森林深處的異物','蟻群開始改變','森林從來不是無主之地','進入蟻國'])assert.match(app+html,new RegExp(text));
  assert.match(docs,/Assets v2/);assert.match(read('assets/LICENSES.md'),/No third-party copyrighted assets are included\./);
});
