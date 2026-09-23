const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const reserved=[
  'assets/menu/menu_bg_main.png','assets/menu/menu_fog_overlay.png','assets/menu/menu_foreground_overlay.png',
  'assets/intro/intro_01_fall.png','assets/intro/intro_02_mutation.png','assets/intro/intro_03_empires.png',
  'assets/logo/logo_main.png','assets/audio/bgm/bgm_nest.ogg','assets/audio/bgm/bgm_surface.ogg','assets/audio/bgm/bgm_combat.ogg',
  'assets/audio/sfx/sfx_click.ogg','assets/audio/sfx/sfx_confirm.ogg','assets/audio/sfx/sfx_cancel.ogg','assets/audio/sfx/sfx_move.ogg','assets/audio/sfx/sfx_attack.ogg','assets/audio/sfx/sfx_alert.ogg','assets/audio/sfx/sfx_warning.ogg','assets/audio/sfx/sfx_victory.ogg','assets/audio/sfx/sfx_defeat.ogg','assets/audio/sfx/sfx_dig.ogg','assets/audio/sfx/sfx_ant_march.ogg','assets/audio/sfx/sfx_chitin_hit.ogg','assets/audio/sfx/sfx_bite.ogg','assets/audio/sfx/sfx_mutation_pulse.ogg','assets/audio/sfx/sfx_queen_move.ogg','assets/audio/sfx/sfx_larva_care.ogg','assets/audio/sfx/sfx_wing_flap.ogg','assets/audio/sfx/amb_nest_loop.ogg','assets/audio/sfx/amb_forest_loop.ogg','assets/audio/sfx/amb_combat_tension_loop.ogg'
];

test('Assets v1 reserves every requested path and loads safe image slots',async()=>{
  for(const dir of ['assets/menu','assets/intro','assets/logo','assets/audio/bgm','assets/audio/sfx','assets/docs'])assert.equal(fs.statSync(path.join(root,dir)).isDirectory(),true,dir);
  const context={window:{},Image:class{set src(v){this._src=v;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}},Audio:class{constructor(){throw new Error('disabled audio requested');}},setTimeout,queueMicrotask};
  vm.runInNewContext(read('assets/manifest.js'),context);vm.runInNewContext(read('asset-loader.js'),context);await context.window.AntAssets.ready;
  const entries=[...Object.values(context.window.AntAssetManifest.images),...Object.values(context.window.AntAssetManifest.audio)];
  assert.equal(entries.length,reserved.length);for(const wanted of reserved){const entry=entries.find(item=>item.src===wanted);assert.ok(entry,wanted);assert.equal(entry.enabled,wanted==='assets/menu/menu_bg_main.png'||wanted.startsWith('assets/intro/'),wanted);}
  assert.equal(context.window.AntAssets.state('menuBgMain'),'ready');for(const key of ['intro01Fall','intro02Mutation','intro03Empires'])assert.equal(context.window.AntAssets.state(key),'ready');assert.ok(Object.entries(context.window.AntAssets.report()).filter(([key])=>!['menuBgMain','intro01Fall','intro02Mutation','intro03Empires'].includes(key)).every(([,state])=>state==='fallback'));
});

test('formal menu, intro, logo and audio slots are wired before procedural fallbacks',()=>{
  const html=read('index.html'),menu=read('menu-art.js'),audio=read('audio.js'),app=read('app.js'),docs=read('assets/docs/ASSET-INTEGRATION.md');
  assert.ok(html.indexOf('assets/manifest.js')<html.indexOf('asset-loader.js'));
  assert.ok(html.indexOf('asset-loader.js')<html.indexOf('menu-art.js'));
  assert.match(html,/id="menuLogo"/);assert.match(app,/mountImage\('logoMain'/);
  for(const key of ['menuBgMain','menuFogOverlay','menuForegroundOverlay'])assert.match(menu,new RegExp(key));
  for(const key of ['bgmNest','bgmSurface','bgmCombat','sfxClick','sfxAttack','sfxWarning'])assert.match(audio,new RegExp(key));
  assert.match(docs,/enabled: false/);assert.match(read('assets/LICENSES.md'),/No third-party copyrighted assets are included\./);
});
