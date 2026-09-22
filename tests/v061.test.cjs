const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const C=require('../interaction.js');
const advance=(s,seconds)=>{for(let i=0;i<seconds*4;i++)E.tick(s,.25);};

test('the campaign creates four asymmetric enemies from real populations',()=>{
  const s=E.create(76101);assert.equal(s.colonies.length,4);
  const deep=s.colonies.find(n=>n.role==='deep_forest'),near=s.colonies.find(n=>n.role==='near'),hunter=s.colonies.find(n=>n.role==='hunter'),armored=s.colonies.find(n=>n.role==='armored');
  assert.ok(deep&&near&&hunter&&armored);assert.ok(deep.populationCap>near.populationCap);assert.ok(s.ants.some(a=>a.faction==='enemy'&&a.colony===near.id));
});

test('only destroying every enemy queen wins the campaign',()=>{
  const s=E.create(76102);for(const n of s.colonies.slice(0,3)){n.queen=0;E.tick(s,.25);assert.equal(s.won,false);}s.colonies[3].queen=0;E.tick(s,.25);assert.equal(s.won,true);assert.equal(s.ended,true);
});

test('a royal room uses the exact safe reachable location chosen by the player',()=>{
  const s=E.create(76103);s.ants=E.workers(s);s.food=100;const k=E.key(6,11),c=E.cell(s,k);c.open=true;c.seen=true;c.hard=false;
  const room=E.requestRoyalAt(s,k);assert.equal(room.k,k);assert.equal(room.type,'royal');assert.equal(s.food,88);
  assert.match(E.requestRoyalAt(s,s.mainExit).error,/巢口|地下空腔/);
});

test('repeated journal events collapse instead of flooding the log',()=>{
  const s=E.create(76104),before=s.events.length;for(let i=0;i<8;i++){s.time+=2;E.emit(s,'採集隊遭攻擊！請調整路線或派遣護衛。',true,E.HOME);}
  assert.equal(s.events.length,before+1);assert.equal(s.events[0].repeat,8);assert.doesNotMatch(s.events[0].text,/更新|重複/);assert.equal(s.events[0].category,'battle');
});

test('the interface encodes one-shot commands, left drag selection and post-battle review',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.match(html,/Prototype 0\.6\.4/);assert.match(html,/id="reviewBattlefield"/);assert.match(html,/id="resultStats"/);
  assert.match(app,/commandMarker=.*clearSelected\(\);closeContext\(false\)/s);assert.match(app,/gesture\.button===0\)gesture\.box=true/);assert.match(app,/gesture\.button===1\|\|gesture\.button===2/);assert.match(app,/requestRoyalAt/);assert.doesNotMatch(html,/id="buildButton"/);assert.doesNotMatch(app,/placeRoom'\).*assignSelected/s);
});

test('clicking the nest entrance gives selected surface ants a real cross-layer return order',()=>{
  const s=E.create(76105),a=E.workers(s)[0],surface=E.surfaceKey(8,3);E.cell(s,surface).seen=true;E.cell(s,surface).open=true;a.k=surface;Object.assign(a,E.xy(surface));a.x=8;a.y=3;
  const result=C.direct(s,[a.id],{kind:'exit',k:s.mainExit},s.mainExit);
  assert.equal(result.error,undefined);assert.match(result.text,/返回地下王巢/);const g=s.groups.find(g=>g.id===a.group);assert.equal(g.target,E.HOME);
});

test('separate enemy colonies can create simultaneous pressure fronts',()=>{
  const s=E.create(76106);advance(s,31);while(E.workers(s).length<20)s.ants.push(E.ant(s,'player',E.HOME));s.food=220;s.time=500;for(const r of s.regions)r.seen=true;for(const n of s.colonies)n.lastExpedition=-999;
  E.tick(s,.25);assert.equal(s.world.expeditions.length,2);assert.equal(new Set(s.world.expeditions.map(ex=>ex.source)).size,2);assert.equal(s.world.expedition,s.world.expeditions[0]);
});
