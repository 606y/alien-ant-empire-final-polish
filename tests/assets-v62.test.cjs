const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),binary=p=>fs.readFileSync(path.join(root,p));
const hash=p=>crypto.createHash('sha256').update(binary(p)).digest('hex').toUpperCase();
test('V6.2 keeps the exact supplied Dreamina film and never selects the V6.1 film',()=>{
 const manifest=JSON.parse(read('assets/docs/ASSETS-V6.2-MANIFEST.json')),html=read('index.html'),app=read('app.js'),video='assets/'+manifest.assets.intro_video.file;
 assert.equal(video,'assets/video/intro_cinematic_v6_2_dreamina.mp4');assert.equal(hash(video),'867DE2CDE233246D63840FCD2F4B9EC560C23037A898CD9B1B9DF03AA9A79F62');
 assert.match(html,/id="cinematicVideo" playsinline/);assert.ok(html.includes(video));assert.ok(!html.includes('intro_cinematic_v6_10s.mp4'));assert.ok(!html.includes('intro_cinematic_v6_poster.jpg'));
 assert.match(app,/function startNewGame/);assert.match(app,/function finishCinematic/);assert.match(app,/showIntro\(\);audio\.resumeAfterCinematic\(\)/);assert.match(app,/skipCinematic/);assert.match(app,/V6\.2 cinematic unavailable/);
});
test('formal heavy uses the approved V6.1 static image and exact raised placements',()=>{
 const context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);const m=context.window.AntAssetManifest,heavy=m.menuV6.heavy,art=read('menu-art.js');
 assert.equal(heavy.key,'heavyHammerV6');assert.equal(m.images[heavy.key].src,'assets/menu/v6/characters/heavy_hammer_v6.png');
 assert.equal(hash(m.images[heavy.key].src),'7CCF8EDAD0B94E83A403F278E18765C62C7B1B88059AA1CB52D592D1FC21CF4B');
 assert.equal(heavy.lift,82);assert.equal(heavy.mobileLift,62);assert.equal(heavy.x,.83);assert.equal(heavy.mobileX,.84);assert.equal(heavy.height,.315);assert.equal(heavy.mobileHeight,.19);
 assert.match(art,/context\.drawImage\(heavy,x-width\/2,bottom-height,width,height\)/);assert.match(art,/bottom=h\*\(mobile\?c\.mobileBottom:c\.bottom\)-\(mobile\?c\.mobileLift:c\.lift\)/);
 assert.doesNotMatch(art.slice(art.indexOf('if(heavy){',art.indexOf('function drawV6Foreground')),art.indexOf('function drawV6Flyer')),/scale\(-1|rotate\(/);
});
test('V6.2 WebP, APNG, sheet and poster are archived but absent from runtime asset loading',()=>{
 const runtime=['index.html','assets/manifest.js','asset-loader.js','menu-art.js','style.css'].map(read).join('\n'),context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);const m=context.window.AntAssetManifest;
 for(const name of ['heavy_attack_v6_2.webp','heavy_attack_v6_2.png','heavy_attack_v6_2_sheet.png','heavy_attack_v6_2_poster.png','heavyAttackV62','menuHeavyV62'])assert.ok(!runtime.includes(name),name);
 assert.ok(m.imageTiers.primary.includes('heavyHammerV6'));assert.ok(!m.imageTiers.primary.some(key=>key.includes('V62')));
 assert.ok(fs.existsSync(path.join(root,'assets/menu/v6.2/heavy/heavy_attack_v6_2.webp')));
 assert.ok(fs.existsSync(path.join(root,'assets/menu/v6.2/heavy/heavy_attack_v6_2.png')));
 assert.ok(fs.existsSync(path.join(root,'assets/menu/v6.2/heavy/heavy_attack_v6_2_sheet.png')));
});
test('static-heavy patch leaves the accepted game engine, world and RTS interaction unchanged',()=>{
 assert.equal(hash('engine.js'),'436EBB5A4184BDAB850CB89DC9741A85ACA822FCA406DA12880E87DF7670D858');
 assert.equal(hash('world.js'),'51C3E5B08B87D8E354450FE751253EB8DC748B85CB4C3E727DA0E112C65D2881');
 assert.equal(hash('interaction.js'),'587B19CF04D9C355C4F4AF6850A8239BAF559BA74F1FC7C1F19A6F41C73179D4');
});
