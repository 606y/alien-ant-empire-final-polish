const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('presentation uses formal assets with quiet fallbacks and no remote dependency',()=>{
  const html=read('index.html'),css=read('style.css'),menu=read('menu-art.js'),audio=read('audio.js');
  assert.match(html,/id="mainMenu"/);assert.match(html,/id="menuArt"/);assert.match(html,/id="intro"/);assert.match(html,/id="introArt"/);
  assert.match(html,/在黑暗森林中，孕育一座會呼吸、擴張並吞噬一切的異變蟻國。/);
  assert.match(menu,/class MenuArt/);assert.match(menu,/function drawFormalFlyer/);assert.match(menu,/function drawQuietFallback/);assert.match(menu,/function usableFormal/);
  for(const removed of [/function wingedAnt/,/function drawWarpedFlag/,/function formalBanners/,/function formalGuardLife/,/function formalAtmosphere/])assert.doesNotMatch(menu,removed);
  assert.match(audio,/class AntAudio/);assert.match(audio,/setScene/);assert.match(audio,/syncExternalAudio/);assert.doesNotMatch(audio,/AudioContext|createOscillator|musicTick|noiseBurst/);
  assert.match(css,/\.main-menu/);assert.match(css,/\.intro/);assert.match(css,/\.menu-noise\{display:none\}/);assert.match(menu,/naturalWidth>16/);
  assert.doesNotMatch(html,/<(?:script|link|img)[^>]+(?:src|href)="https?:\/\//i);assert.doesNotMatch(css,/url\(["']?https?:\/\//i);assert.doesNotMatch(menu+audio,/https?:\/\//);
});

test('asset record documents project sources and no third-party copyrighted assets',()=>{
  const license=read(path.join('assets','LICENSES.md'));assert.match(license,/No third-party copyrighted assets are included\./);
  for(const source of ['menu-art.js','world.js','style.css','audio.js'])assert.match(license,new RegExp(source.replace('.','\\.')));
});
