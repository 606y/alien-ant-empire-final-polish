const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex').toUpperCase();
test('V7 Drive package is complete and its supplied art/license records are retained',()=>{
 const m=JSON.parse(read('assets/v7/MANIFEST.json'));assert.equal(m.version,'v7');assert.equal(m.core_gameplay_change,false);
 assert.equal(m.files.length,54);for(const name of m.files)assert.ok(fs.existsSync(path.join(root,'assets/v7',name)),name);
 for(const doc of ['docs/INTEGRATION.md','docs/COPY_DECK.md','docs/LICENSES.md','world/WORLD_STYLE.json','ui/v7-ui-theme.css'])assert.ok(read('assets/v7/'+doc).length>20);
 assert.ok(read('assets/LICENSES.md').includes('AlienAntEmpire_Assets_v7.zip'));
});
test('loading is initial DOM and appReady gates menu tier, painted frame and two RAFs with bounds',()=>{
 const html=read('index.html'),ready=read('app-ready.js'),loader=read('asset-loader.js'),art=read('menu-art.js');
 assert.ok(html.indexOf('id="appLoading"')<html.indexOf('id="mainMenu"'));
 assert.ok(html.includes('loading/loading_backdrop.svg'));assert.ok(html.includes('loading/loading_crest.svg'));assert.ok(html.includes('loading/loading_progress_frame.svg'));
 assert.match(html,/id="v7-loading-critical"/);assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(ready,/root\.appReady=new Promise/);assert.match(ready,/root\.AntAssets\.menuReady/);
 assert.match(ready,/whenNextMenuFrame\(\)/);assert.match(ready,/await frame\(\);await frame\(\)/);
 assert.match(ready,/450-\(performance\.now\(\)-started\)/);assert.match(ready,/await delay\(350\)/);
 assert.match(ready,/},8000\)/);assert.match(ready,/overlay\?\.remove\(\)/);
 assert.doesNotMatch(ready,/cinematicVideo|video\.readyState|window\.onload/);
 assert.match(loader,/this\.menuReady=new Promise/);assert.match(loader,/this\.resolveMenuReady\(this\)/);
 assert.match(art,/whenNextMenuFrame\(\)/);
});
test('V7 supplied UI, frame and icon URLs resolve relative to the published stylesheets',()=>{
 const html=read('index.html'),theme='assets/v7/ui/v7-ui-theme.css',binding='assets/v7/ui/v7-integration.css';
 assert.ok(html.includes(theme+'?v=v7'));assert.ok(html.includes(binding+'?v=v7'));
 for(const file of [theme,binding]){
  const css=read(file),urls=[...css.matchAll(/url\("([^"]+)"\)/g)].map(m=>m[1]);assert.ok(urls.length>5);
  for(const url of urls)assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),url)),file+' '+url);
 }
 const css=read(binding);for(const item of ['nest','surface','colony','journal','settings'])assert.ok(css.includes('icons/nav/'+item+'.svg'));
 for(const item of ['panel_frame','button_normal','button_active','resource_chip'])assert.ok(css.includes('frames/'+item+'.svg'));
 assert.ok(css.includes('@media(max-width:600px)'));assert.ok(css.includes('min-height:44px'));
});
test('V7 world uses cached formal textures, six player castes, four enemy families, seven rooms and command art',()=>{
 const world=read('world.js'),body=world.slice(world.indexOf('    draw(s,'));
 assert.match(world,/this\.v8Started=false/);assert.match(world,/if\(this\.v8Started\)return/);
 assert.match(world,/this\.ctx\.createPattern\(source,'repeat'\)/);assert.doesNotMatch(body,/new Image\(/);
 assert.doesNotMatch(world,/scaleX\(-1\)/);
 for(const name of ['worker','soldier_normal','soldier_armor','soldier_jaw','soldier_acid','queen'])assert.ok(world.includes("'units/player/"+name+"'"));
 for(const name of ['near','hunter','armored','deep_forest'])for(const suffix of ['', '_queen'])assert.ok(world.includes("'units/enemies/"+name+suffix+"'"));
 for(const name of ['nursery','store','prey','rest','military','mutation','royal'])assert.ok(fs.existsSync(path.join(root,'assets/v7/rooms',name+'.svg')));
 for(const name of ['selection_ring','command_move','command_attack','command_gather','command_build','command_cross'])assert.ok(fs.existsSync(path.join(root,'assets/v7/world/effects',name+'.svg')));
 assert.match(world,/this\.v8RoomCache/);assert.match(world,/this\.v7Images\['world\/effects\/selection_ring'\]/);
 assert.match(world,/this\.v7Images\['world\/effects\/command_'\+commandMarker\.type\]/);
});
test('V7 leaves camera, position, hitboxes and accepted gameplay implementation unchanged',()=>{
 const world=read('world.js'),fingerprint=re=>crypto.createHash('sha256').update((world.match(re)||[]).join('|')).digest('hex');
 assert.equal(fingerprint(/this\.targets\.push\(\{[^;\n]*\}\);/g),'d125280c6e8df7c2b0801310e8541b2dbfe3410e143de885dd9be28dba923feb');
 assert.equal(fingerprint(/^    (?:home|focus|zoom|pan|screen|position)\([^\n]+/gm),'e93b6ffd8d46296f4c28f33bb7199255e8759fc47722b7272ffaf98c4d309267');
 assert.equal(sha('engine.js'),'436EBB5A4184BDAB850CB89DC9741A85ACA822FCA406DA12880E87DF7670D858');
 assert.equal(sha('interaction.js'),'587B19CF04D9C355C4F4AF6850A8239BAF559BA74F1FC7C1F19A6F41C73179D4');
});
test('V6.3 CapCut intro and static V6.1 menu heavy remain selected',()=>{
 const html=read('index.html'),app=read('app.js'),manifest=read('assets/manifest.js');
 assert.ok(html.includes('intro_cinematic_v6_3_capcut_badged.mp4'));
 assert.ok(!html.includes('intro_cinematic_v6_2_dreamina.mp4'));
 assert.ok(!html.includes('intro_cinematic_v6_10s.mp4'));
 assert.match(app,/showIntro\(\);audio\.resumeAfterCinematic\(\)/);
 assert.match(app,/skipCinematic'\)\.onclick=finishCinematic/);
 assert.ok(manifest.includes('heavy_hammer_v6.png'));
});
