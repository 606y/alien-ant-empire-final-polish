const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('v4 package paths are enabled ahead of v3 and v2 fallbacks',()=>{
  const manifestJson=JSON.parse(read('assets/docs/ASSETS-V4-MANIFEST.json')),context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);const m=context.window.AntAssetManifest;
  assert.equal(m.version,6);assert.equal(m.menuBackground[3],'menuBgV4');
  const paths=[manifestJson.menu.background,...Object.values(manifestJson.menu.foreground),...Object.values(manifestJson.menu.flyer),...manifestJson.intro];
  for(const file of paths){const dest='assets/'+file,entry=Object.values(m.images).find(v=>v.src===dest);assert.ok(entry,dest);assert.equal(entry.enabled,true,dest);assert.ok(fs.existsSync(path.join(root,dest)),dest)}
  assert.deepEqual(Array.from(m.introSequenceV4),['intro01FallV4','intro02MutationV4','intro03EmpiresV4']);
  assert.equal(m.menuV4.flyer.body,'flyerBodyV4');assert.equal(m.menuV4.flyer.wings,'flyerWingsV4');
  assert.ok(m.menuV4.flag.height>=.18&&m.menuV4.flag.height<=.24);assert.ok(m.menuV4.heavy.height>=.20&&m.menuV4.heavy.height<=.27);assert.ok(m.menuV4.flyer.height>=.09&&m.menuV4.flyer.height<=.13);
});
test('v4 menu contains only approved independent foreground and one split flyer',()=>{
  const code=read('menu-art.js');assert.match(code,/if\(background\?\.key==='menuBgV4'\)/);assert.match(code,/return drawV4Flyer\(context,w,h,time\)/);
  assert.match(code,/function drawV4Foreground/);assert.match(code,/function drawV4Flyer/);assert.match(code,/context\.drawImage\(wings/);assert.match(code,/context\.drawImage\(body/);
  assert.doesNotMatch(code,/drawFlagSlice|drawGuardSlice|drawProcedural|function wingedAnt/);
});
test('v4 package copy remains archived for fallback provenance',()=>{
  const copy=read('assets/docs/ASSETS-V4-COPY-DECK.md'),integration=read('assets/docs/ASSETS-V4-PACKAGE-INTEGRATION.md');
  assert.match(copy,/戰爭已經開始/);assert.match(integration,/Assets v4/);
});
