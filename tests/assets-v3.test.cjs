const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('supplied v3 image slots are enabled and complete with v2 fallback',()=>{
  const context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);const manifest=context.window.AntAssetManifest;
  assert.equal(manifest.version,6);
  assert.deepEqual(Array.from(manifest.menuBackground),['menuBgV6','menuBgV6Alt','menuBgV5','menuBgV4','menuBgV3','menuBgAnimationBase','menuBgMain']);
  const files=['assets/menu/v3/menu_bg_v3.png','assets/intro/v3/intro_01_fall_v3.png','assets/intro/v3/intro_02_mutation_v3.png','assets/intro/v3/intro_03_empires_v3.png'];
  for(const caste of ['scout','guard','heavy'])for(const part of ['body','wings'])files.push(`assets/menu/v3/flyers/flyer_${caste}_${part}.png`);
  for(const file of files){const entry=Object.values(manifest.images).find(item=>item.src===file);assert.ok(entry,file);assert.equal(entry.enabled,true,file);assert.equal(fs.existsSync(path.join(root,file)),true,file);}
  assert.equal(manifest.menuFlyersV3.length,3);
  for(const group of manifest.menuFlyersV3){assert.notEqual(group.body,group.wings);assert.ok(group.wing.frequency>=8);assert.ok(manifest.images[group.body].enabled);assert.ok(manifest.images[group.wings].enabled);}
  assert.equal(manifest.menuGroundV3.length,4);assert.equal(manifest.menuBannersV3.length,3);
  for(const item of [...manifest.menuGroundV3,...manifest.menuBannersV3]){assert.ok(manifest.images[item.key].enabled);assert.ok(fs.existsSync(path.join(root,manifest.images[item.key].src)));}
  for(const [i,entry] of manifest.menuGroundV3.entries())assert.ok(entry.height>=([.045,.055,.055,.08][i])&&entry.height<=([.065,.08,.08,.11][i]));
  assert.deepEqual(Array.from(manifest.introSequenceV3),['intro01FallV3','intro02MutationV3','intro03EmpiresV3']);
  for(const dir of ['assets/menu/v3','assets/menu/v3/flyers','assets/intro/v3'])assert.ok(fs.statSync(path.join(root,dir)).isDirectory());
});

test('v3 presentation keeps independent wing frames and full device pixel ratio',()=>{
  const menu=read('menu-art.js'),css=read('style.css'),docs=read('assets/docs/ASSETS-V3-INTEGRATION.md');
  assert.match(menu,/devicePixelRatio/);assert.doesNotMatch(menu,/Math\.min\(2,.*devicePixelRatio/);
  assert.match(menu,/backgroundLimited/);assert.match(menu,/function spriteFrame/);assert.match(menu,/animation\.columns/);assert.match(menu,/function drawV3Flyer/);assert.match(menu,/function drawGround/);assert.match(menu,/function drawBanners/);assert.match(menu,/wingBeat/);
  assert.match(menu,/function introImage/);assert.match(menu,/introSequenceV3/);assert.match(menu,/introSequence/);
  assert.match(css,/\.main-menu>canvas\{background-size:cover/);assert.match(docs,/Assets v3/);
  assert.doesNotMatch(menu,/drawProcedural|drawFlagSlice|drawGuardSlice|function wingedAnt/);
});
