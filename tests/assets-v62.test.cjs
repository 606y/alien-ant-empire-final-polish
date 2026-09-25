const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),binary=p=>fs.readFileSync(path.join(root,p));
const hash=p=>crypto.createHash('sha256').update(binary(p)).digest('hex').toUpperCase();
test('V6.2 ships the exact supplied Dreamina film and never selects the V6.1 film',()=>{
 const manifest=JSON.parse(read('assets/docs/ASSETS-V6.2-MANIFEST.json')),html=read('index.html'),app=read('app.js'),video='assets/'+manifest.assets.intro_video.file;
 assert.equal(video,'assets/video/intro_cinematic_v6_2_dreamina.mp4');assert.equal(hash(video),'867DE2CDE233246D63840FCD2F4B9EC560C23037A898CD9B1B9DF03AA9A79F62');
 assert.match(html,/id="cinematicVideo" playsinline/);assert.ok(html.includes(video));assert.ok(!html.includes('intro_cinematic_v6_10s.mp4'));assert.ok(!html.includes('intro_cinematic_v6_poster.jpg'));
 assert.match(app,/function startNewGame/);assert.match(app,/function finishCinematic/);assert.match(app,/showIntro\(\);audio\.resumeAfterCinematic\(\)/);assert.match(app,/skipCinematic/);assert.match(app,/V6\.2 cinematic unavailable/);
});
test('V6.2 heavy animation uses the supplied eight-frame WebP, APNG and sprite fallback without mirroring',()=>{
 const manifest=JSON.parse(read('assets/docs/ASSETS-V6.2-MANIFEST.json')),context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);
 const m=context.window.AntAssetManifest,heavy=m.menuV6.heavy,art=read('menu-art.js'),css=read('style.css');
 assert.equal(m.images[heavy.animated[0]].src,'assets/menu/v6.2/'+manifest.assets.heavy.preferred);
 assert.equal(m.images[heavy.animated[1]].src,'assets/menu/v6.2/'+manifest.assets.heavy.fallback_apng);
 assert.equal(m.images[heavy.sheet].src,'assets/menu/v6.2/'+manifest.assets.heavy.sprite_sheet);
 assert.equal(m.images[heavy.poster].src,'assets/menu/v6.2/'+manifest.assets.heavy.poster);
 assert.equal(hash(m.images[heavy.animated[0]].src),'A871A66C17A254E5B42A1FDFE742C205A7203428FF39B223BD19A7BD4BFCAFF4');
 assert.equal(hash(m.images[heavy.animated[1]].src),'605CACCDFCAF78413B1A2EE1E7F5390575ADDDAC962A113954FB364C2C8732F0');
 const webp=binary(m.images[heavy.animated[0]].src),apng=binary(m.images[heavy.animated[1]].src);assert.equal(webp.toString('ascii',0,4),'RIFF');assert.equal(webp.toString('ascii',8,12),'WEBP');
 const webpDurations=[];for(let p=12;p+8<=webp.length;){const name=webp.toString('ascii',p,p+4),size=webp.readUInt32LE(p+4),start=p+8;if(name==='ANMF')webpDurations.push(webp[start+12]|webp[start+13]<<8|webp[start+14]<<16);p=start+size+(size%2)}
 const pngDurations=[];let frames=0;for(let p=8;p+12<=apng.length;){const size=apng.readUInt32BE(p),name=apng.toString('ascii',p+4,p+8),start=p+8;if(name==='acTL')frames=apng.readUInt32BE(start);if(name==='fcTL'){const num=apng.readUInt16BE(start+20),den=apng.readUInt16BE(start+22)||100;pngDurations.push(num/den*1000)}p=start+size+4}
 assert.equal(frames,8);assert.deepEqual(webpDurations,[520,300,260,320,170,520,360,650]);assert.equal(webpDurations.reduce((a,b)=>a+b,0),3100);assert.equal(Math.round(pngDurations.reduce((a,b)=>a+b,0)),3100);
 assert.match(art,/updateV62HeavyOverlay/);assert.match(css,/\.menu-heavy-v62\{[^}]*transform:none/);assert.doesNotMatch(art.slice(art.indexOf('function updateV62HeavyOverlay'),art.indexOf('function drawV6Foreground')),/scaleX|scale\(-1/);
 assert.equal(heavy.lift,82);assert.equal(heavy.mobileLift,62);assert.equal(m.menuV6.flag.lift,92);assert.equal(m.menuV6.flag.mobileLift,68);
});
test('APNG is loaded if the supplied WebP fails',async()=>{
 class Image{set src(value){this._src=value;Promise.resolve().then(()=>value.endsWith('.webp')?this.onerror():this.onload())}get src(){return this._src}}
 const context={Image,window:{AntAssetManifest:{images:{heavyAttackV62Webp:{src:'heavy.webp',enabled:true},heavyAttackV62Apng:{src:'heavy.png',enabled:true}},audio:{},imageTiers:{primary:['heavyAttackV62Webp']}}}};
 vm.runInNewContext(read('asset-loader.js'),context);await context.window.AntAssets.ready;
 assert.equal(context.window.AntAssets.state('heavyAttackV62Webp'),'fallback');assert.equal(context.window.AntAssets.state('heavyAttackV62Apng'),'ready');
});
test('V6.2 integration leaves the accepted game engine, world and RTS interaction unchanged',()=>{
 assert.equal(hash('engine.js'),'436EBB5A4184BDAB850CB89DC9741A85ACA822FCA406DA12880E87DF7670D858');
 assert.equal(hash('world.js'),'51C3E5B08B87D8E354450FE751253EB8DC748B85CB4C3E727DA0E112C65D2881');
 assert.equal(hash('interaction.js'),'587B19CF04D9C355C4F4AF6850A8239BAF559BA74F1FC7C1F19A6F41C73179D4');
});
