const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');

test('0.6.4.1 saves the one-time mobile box-selection lesson',()=>{
  const fresh=E.create(64101);assert.equal(fresh.version,12);assert.equal(fresh.mobileBoxHintDone,false);
  fresh.mobileBoxHintDone=true;const restored=E.restore(E.serialize(fresh));assert.equal(restored.mobileBoxHintDone,true);
  const legacy=E.create(64102);delete legacy.mobileBoxHintDone;legacy.version=11;const migrated=E.restore(E.serialize(legacy));assert.equal(migrated.version,12);assert.equal(migrated.mobileBoxHintDone,false);
});

test('mobile battlefield explains pan, long-press box selection and pinch exactly where play happens',()=>{
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(html,/Prototype 0\.6\.4\.1/);assert.match(html,/id="touchHint"/);assert.match(html,/單指拖曳＝平移地圖/);assert.match(html,/長按約 0\.4 秒後拖曳＝框選多隻螞蟻/);assert.match(html,/雙指＝縮放/);
  assert.match(css,/\.touch-hint\{display:none/);assert.match(css,/@media\(max-width:600px\)\{\.touch-hint\{display:block/);assert.match(css,/\.selection-rect\.ready/);
});

test('touch gestures keep pan, delayed box selection and pinch mutually exclusive',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  assert.match(app,/setTimeout\(\(\)=>\{if\(gesture&&!gesture\.moved&&pointers\.size===1\)/);assert.match(app,/navigator\.vibrate\?\.\(20\)/);assert.match(app,/gesture\.longPress=true/);assert.match(app,/drawSelectionRect\(\)/);assert.match(app,/pointers\.size===2\)\{clearTimeout\(longPressTimer\)/);assert.match(app,/gesture\.multitouch=true/);assert.match(app,/!gesture\.multitouch/);assert.match(app,/s\.mobileBoxHintDone=true;renderTouchHint\(\);save\(\)/);
});

test('enemy queen corpses publish a dedicated large hitbox and contextual processing action',()=>{
  const root=path.join(__dirname,'..'),world=fs.readFileSync(path.join(root,'world.js'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.match(world,/food\.queenCorpse\?'deadQueen':'food'/);assert.match(world,/food\.queenCorpse\?38:27/);assert.match(world,/蟻后遺骸/);assert.match(app,/context\.kind==='deadQueen'/);assert.match(app,/data-action="processQueen"|button\([^\n]*'processQueen'/);assert.match(app,/\['food','deadQueen'\]\.includes/);
});
