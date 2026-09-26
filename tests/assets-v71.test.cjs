const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex').toLowerCase();
const scope={window:{}};vm.runInNewContext(read('assets/manifest.js'),scope);const m=scope.window.AntAssetManifest,packageRoot='assets/v7.1/';
test('V7.1 official Drive package is complete and byte-for-byte intact',()=>{
 const manifest=JSON.parse(read(packageRoot+'MANIFEST.json'));assert.equal(manifest.version,'v7.1');assert.equal(manifest.files.length,10);
 for(const file of manifest.files){const p=packageRoot+file.path;assert.ok(fs.existsSync(path.join(root,p)),p);assert.equal(fs.statSync(path.join(root,p)).size,file.bytes,p);assert.equal(hash(p),file.sha256,p);}
 for(const file of ['docs/INTEGRATION.md','docs/COPY_DECK.md','docs/LICENSES.md','docs/ART_DIRECTION.md'])assert.ok(read(packageRoot+file).length>100);
});
test('V7.1 background and all four formal layers are first-tier menu assets',()=>{
 const paths={menuBgV71:'menu/background/menu_bg_confrontation_v7_1.png',flagAntV71:'menu/characters/flag_ant_v7_1.png',heavyHammerV71:'menu/characters/heavy_hammer_v7_1.png',flyerBodyV71:'menu/flyer/flyer_body_v7_1.png',flyerWingsV71:'menu/flyer/flyer_wings_v7_1.png'};
 for(const [key,value] of Object.entries(paths))assert.equal(m.images[key].src,packageRoot+value);
 assert.equal(m.imageTiers.menuV71.length,5);for(const key of Object.keys(paths))assert.ok(m.imageTiers.menuV71.includes(key));
 const loader=read('asset-loader.js');assert.match(loader,/await loadKeys\(tiers\.menuV71\)/);assert.match(loader,/this\.states\.set\('menuBgV71','fallback'\)/);
 assert.ok(loader.indexOf('await loadKeys(tiers.menuV71)')<loader.lastIndexOf("this.resolveMenuReady(this);"));
});
test('V7.1 desktop and mobile placement mirrors the supplied placement JSON without mirroring art',()=>{
 const p=JSON.parse(read(packageRoot+'menu/placement_v7_1.json'));
 for(const side of ['flag','heavy'])for(const [field,manifestField] of [['x','x'],['bottom','bottom'],['height','height'],['liftPx','lift']])assert.equal(m.menuV71[side][manifestField],p.desktop[side][field]);
 for(const side of ['flag','heavy'])for(const [field,manifestField] of [['x','mobileX'],['bottom','mobileBottom'],['height','mobileHeight'],['liftPx','mobileLift']])assert.equal(m.menuV71[side][manifestField],p.mobile[side][field]);
 assert.equal(m.menuV71.flyer.height,.115);assert.equal(m.menuV71.flyer.mobileHeight,.105);
 assert.equal(hash(packageRoot+'menu/characters/flag_ant_v7_1.png'),hash('assets/menu/v6/characters/flag_ant_v6.png'));
 assert.equal(hash(packageRoot+'menu/characters/heavy_hammer_v7_1.png'),hash('assets/menu/v6/characters/heavy_hammer_v6.png'));
});
test('V7.1 uses the proven flag-cloth and flyer routines, with a static heavy',()=>{
 const art=read('menu-art.js'),foreground=art.slice(art.indexOf('function drawV6Foreground'),art.indexOf('function drawV6Flyer'));
 assert.match(art,/background\?\.key==='menuBgV71'/);assert.match(art,/drawV6Foreground\(context,w,h,time,assets\.manifest\.menuV71\)/);
 assert.match(art,/drawV6Flyer\(context,w,h,time,assets\.manifest\.menuV71\.flyer\)/);
 assert.match(foreground,/isolateSprite\(flag,c\.key/);assert.match(foreground,/context\.drawImage\(heavy,x-width\/2,bottom-height,width,height\)/);
 assert.doesNotMatch(foreground,/scale\(-1,1\)|scaleX|heavy_attack|drawPartSprite\(context,heavy/);
 assert.match(art,/cycle=\(time\/44000\+\.06\)%1/);assert.match(art,/beat=Math\.sin\(time\*Math\.PI\*2\*17\/1000\)/);
});
test('V7 loading, world visuals, V6.3 opening and core implementation remain intact',()=>{
 const html=read('index.html');assert.ok(html.includes('app-ready.js?v=v7'));assert.ok(html.includes('world.js?v=assets-v72-world-art'));assert.ok(html.includes('intro_cinematic_v6_3_capcut_badged.mp4'));
 assert.ok(html.includes('assets/manifest.js?v=assets-v71-menu-confrontation'));assert.ok(html.includes('menu-art.js?v=assets-v71-menu-confrontation'));
 assert.ok(read('world.js').includes('assets/v7.2/world/nest/nest_atmosphere_v7_2.jpg'));
 assert.equal(hash('engine.js'),'436ebb5a4184bdab850cb89dc9741a85aca822fca406da12880e87df7670d858');
 assert.equal(hash('interaction.js'),'587b19cf04d9c355c4f4af6850a8239baf559ba74f1fc7c1f19a6f41c73179d4');
 assert.ok(read('assets/LICENSES.md').includes('V7.1 confrontation menu background'));
});
