
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function boxes(buffer,start,end){const result=[];for(let p=start;p+8<=end;){let size=buffer.readUInt32BE(p),head=8;const type=buffer.toString('ascii',p+4,p+8);if(size===1){size=Number(buffer.readBigUInt64BE(p+8));head=16}else if(size===0)size=end-p;if(size<head||p+size>end)break;result.push({type,start:p,end:p+size,payload:p+head});p+=size}return result}
function child(buffer,box,type){return boxes(buffer,box.payload,box.end).find(item=>item.type===type)}
test('V6.1 placement matches the supplied Drive file while keeping V6 art keys',()=>{
 const placement=JSON.parse(read('assets/docs/ASSETS-V6.1-PLACEMENT.json')).menu_patch,context={window:{}};vm.runInNewContext(read('assets/manifest.js'),context);const menu=context.window.AntAssetManifest.menuV6;
 assert.equal(menu.flag.key,'flagAntV6');assert.equal(menu.heavy.key,'heavyHammerV6');
 assert.equal(menu.flag.lift,placement.desktop_1366x768.flag_ant.move_up_px);
 assert.equal(menu.heavy.lift,placement.desktop_1366x768.heavy_enemy.move_up_px);
 assert.equal(menu.flag.mobileLift,placement.mobile_390x844.flag_ant.move_up_px);
 assert.equal(menu.heavy.mobileLift,placement.mobile_390x844.heavy_enemy.move_up_px);
 assert.match(read('menu-art.js'),/bottom=h\*\(mobile\?c\.mobileBottom:c\.bottom\)-\(mobile\?c\.mobileLift:c\.lift\)/);
});
test('formal unmodified MP4 contains ten seconds of 30 fps video and an audio track',()=>{
 const manifest=JSON.parse(read('assets/docs/ASSETS-V6.1-MANIFEST.json')),video=fs.readFileSync(path.join(root,'assets',manifest.cinematic_intro.video)),poster=fs.readFileSync(path.join(root,'assets',manifest.cinematic_intro.poster));
 assert.equal(video.toString('ascii',4,8),'ftyp');assert.equal(poster[0],255);assert.equal(poster[1],216);
 const moov=boxes(video,0,video.length).find(item=>item.type==='moov');assert.ok(moov);
 const tracks=boxes(video,moov.payload,moov.end).filter(item=>item.type==='trak').map(trak=>{
  const mdia=child(video,trak,'mdia'),hdlr=child(video,mdia,'hdlr'),mdhd=child(video,mdia,'mdhd'),stbl=child(video,child(video,mdia,'minf'),'stbl'),stts=child(video,stbl,'stts');
  const kind=video.toString('ascii',hdlr.payload+8,hdlr.payload+12),version=video[mdhd.payload],timescale=video.readUInt32BE(mdhd.payload+(version?20:12)),duration=version?Number(video.readBigUInt64BE(mdhd.payload+24)):video.readUInt32BE(mdhd.payload+16);
  let samples=0,ticks=0;for(let i=0,n=video.readUInt32BE(stts.payload+4);i<n;i++){const p=stts.payload+8+i*8,count=video.readUInt32BE(p);samples+=count;ticks+=count*video.readUInt32BE(p+4)}
  return{kind,seconds:duration/timescale,samples,fps:samples*timescale/ticks};
 });
 const picture=tracks.find(x=>x.kind==='vide'),sound=tracks.find(x=>x.kind==='soun');
 assert.ok(picture);assert.ok(sound);assert.equal(picture.seconds,10);assert.equal(picture.samples,300);assert.equal(picture.fps,30);assert.ok(sound.seconds>=10);
});
test('new-game film preserves the existing three slides and has a skip and failure path',()=>{
 const html=read('index.html'),app=read('app.js'),audio=read('audio.js'),css=read('style.css');
 assert.match(html,/id="cinematicVideo" playsinline/);assert.match(html,/intro_cinematic_v6_2_dreamina\.mp4/);assert.doesNotMatch(html,/intro_cinematic_v6_10s\.mp4/);
 assert.match(app,/function startNewGame/);assert.match(app,/function finishCinematic/);assert.match(app,/showIntro\(\);audio\.resumeAfterCinematic\(\)/);assert.match(app,/skipCinematic/);assert.match(app,/console\.warn\('V6\.2 cinematic unavailable/);
 assert.match(audio,/suspendForCinematic/);assert.match(audio,/resumeAfterCinematic/);assert.match(css,/object-fit:contain/);
 assert.ok(read('assets/LICENSES.md').includes('V6.1 cinematic MP4'));
});
