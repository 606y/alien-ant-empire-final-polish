
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('downloaded V6 assets are complete and take priority over V5',()=>{
  const pack=JSON.parse(read('assets/docs/ASSETS-V6-MANIFEST.json')),context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);const m=context.window.AntAssetManifest;
  assert.equal(m.version,6);
  assert.deepEqual(Array.from(m.menuBackground),['menuBgV6','menuBgV6Alt','menuBgV5','menuBgV4','menuBgV3','menuBgAnimationBase','menuBgMain']);
  const files=[...Object.values(pack.menu),...Object.values(pack.intro)];
  assert.equal(files.length,9);
  for(const file of files){const entry=Object.values(m.images).find(v=>v.src===file);assert.ok(entry,file);assert.ok(entry.enabled,file);assert.ok(fs.statSync(path.join(root,file)).size>100000,file)}
  assert.deepEqual(Array.from(m.introSequenceV6),['intro01FallV6','intro02MutationV6','intro03EmpiresV6']);
  assert.equal(m.menuV6.flyer.body,'flyerBodyV6');assert.equal(m.menuV6.flyer.wings,'flyerWingsV6');
});
test('V6 deck matches active intro and menu text exactly',()=>{
  const deck=read('assets/docs/COPY_DECK.md'),app=read('app.js'),html=read('index.html');
  for(const line of deck.split(/\r?\n/)){const value=line.trim();if(!value||value.startsWith('#')||value.startsWith('標題：')||value.startsWith('內文：')||value.startsWith('按鈕：'))continue;assert.ok(html.includes(value),value)}
  const slides=[...deck.matchAll(/標題：([^\r\n]+)\r?\n內文：([^\r\n]+)/g)];
  assert.equal(slides.length,3);
  for(const [,title,body] of slides){assert.ok(app.includes(title),title);assert.ok(app.includes(body),body)}
  assert.ok(read('assets/LICENSES.md').includes('AlienAntEmpire_Assets_v6.zip'));
});
test('V6 renders independent supplied layers without gameplay changes',()=>{
  const menu=read('menu-art.js'),loader=read('asset-loader.js');
  assert.match(menu,/drawV6Foreground/);assert.match(menu,/drawV6Flyer/);
  assert.match(menu,/background\?\.key==='menuBgV6'/);assert.match(menu,/introSequenceV6/);
  assert.match(loader,/menuV6Alt/);assert.match(loader,/menuV5/);
  assert.doesNotMatch(menu,/drawProcedural|drawFlagSlice|drawGuardSlice|function wingedAnt/);
});
