const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('v5 package paths lead the fallback order',()=>{
  const pack=JSON.parse(read('assets/docs/ASSETS-V5-MANIFEST.json')),context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);const m=context.window.AntAssetManifest;
  assert.equal(m.version,5);assert.deepEqual(Array.from(m.menuBackground),['menuBgV5','menuBgV4','menuBgV3','menuBgAnimationBase','menuBgMain']);
  const files=[...Object.values(pack.menu),...Object.values(pack.intro)];
  for(const file of files){const item=Object.values(m.images).find(v=>v.src===file);assert.ok(item,file);assert.ok(item.enabled,file);assert.ok(fs.existsSync(path.join(root,file)),file)}
  assert.deepEqual(Array.from(m.introSequenceV5),['intro01FallV5','intro02MutationV5','intro03EmpiresV5']);
  assert.equal(m.menuV5.flyer.body,'flyerBodyV5');assert.equal(m.menuV5.flyer.wings,'flyerWingsV5');
  assert.ok(m.menuV5.flag.height>=.22&&m.menuV5.flag.height<=.30);assert.ok(m.menuV5.heavy.height>=.26&&m.menuV5.heavy.height<=.34);assert.ok(m.menuV5.flyer.height>=.09&&m.menuV5.flyer.height<=.13);
});
test('v5 menu uses three supplied dynamic layers only',()=>{
  const menu=read('menu-art.js'),loader=read('asset-loader.js');assert.match(menu,/if\(background\?\.key==='menuBgV5'\)/);assert.match(menu,/return drawV5Flyer\(context,w,h,time\)/);
  assert.match(menu,/function drawV5Foreground/);assert.match(menu,/function drawV5Flyer/);assert.match(menu,/isolateSprite\(flag/);assert.match(menu,/drawPartSprite\(context,heavy/);
  assert.match(loader,/menuBgV5/);assert.match(loader,/menuBgV4/);assert.match(loader,/introSequenceV5/);
  assert.doesNotMatch(menu,/drawFlagSlice|drawGuardSlice|drawProcedural|function wingedAnt/);
});
test('v5 formal copy is applied exactly',()=>{
  const copy=read('assets/docs/COPY_DECK.md'),app=read('app.js'),html=read('index.html');
  for(const line of copy.split(/\r?\n/)){const v=line.trim();if(!v||v.startsWith('#')||v.startsWith('**標題：**'))continue;assert.ok((app+html).includes(v),v)}
  for(const title of ['森林深處的異物','琥珀王座的甦醒','蟻國的黃昏決戰'])assert.ok(app.includes(title));
});
