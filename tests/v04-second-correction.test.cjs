const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const C=require('../interaction.js');

function clean(seed=9517){const s=E.create(seed);s.events=[];s.speed=1;s.ants=s.ants.filter(a=>a.faction==='player');s.colonies.forEach(n=>{n.fallen=true;n.destroyed=true;n.alive=false;n.queen=0;});s.won=true;s.broods.forEach(b=>b.autoCare=false);for(const a of E.workers(s))C.release(a);return s;}
function advance(s,seconds){for(let t=0;t<seconds;t+=.25)E.tick(s,.25);}
function prepareDig(s,start,direction){const o=E.xy(start),v=direction==='left'?[-1,0]:direction==='right'?[1,0]:[0,1];for(let i=1;i<=10;i++)for(let side=-4;side<=4;side++){const x=o.x+v[0]*i+(v[0]?0:side),y=o.y+v[1]*i+(v[0]?side:0);E.ensureChunk(s,x,y);const c=E.cell(s,E.key(x,y));if(c)Object.assign(c,{seen:true,sealed:false,hard:false,feature:null,deposit:0,layer:'表土',work:0});}}

for(const direction of ['left','right','down'])test(`selected workers execute a persistent ${direction} excavation through movement and terrain change`,()=>{
  const s=clean(),start=E.key(8,12),ids=E.laborers(s).slice(0,2).map(a=>a.id);prepareDig(s,start,direction);
  const p=E.project(s,start,direction,2,Infinity,ids);assert.ok(!p.error);assert.deepEqual(E.laborers(s,'dig').filter(a=>a.project===p.id).map(a=>a.id).sort((a,b)=>a-b),ids.sort((a,b)=>a-b));
  assert.ok(p.next!==null&&s.digQueue.includes(p.next));advance(s,45);
  assert.ok(E.cell(s,p.tip).open,'the map must actually gain traversable ground');assert.equal(p.status,'working');assert.equal(p.continuous,true);assert.ok(E.laborers(s,'dig').filter(a=>a.project===p.id).every(a=>a.playerLocked));
});

test('three marked resources retain separate balanced assignments and truthful route counts',()=>{
  const s=clean();for(const c of s.cells.filter(c=>E.isSurface(s,c))){c.open=true;c.seen=true;c.sealed=false;}const foods=s.resources.slice(0,3);
  for(const f of foods)assert.equal(E.path(s,E.HOME,f.k)!==null,true);
  const results=foods.map(f=>C.setGatherMode(s,f.k,'small'));assert.ok(results.every(r=>!r.error));
  const routeWorkers=foods.map(f=>{const route=s.routes.find(r=>r.k===f.k),ants=E.laborers(s,'forage').filter(a=>a.route===route.id);assert.equal(route.assigned,ants.length);assert.equal(ants.length,1);return ants[0].id;});
  assert.equal(new Set(routeWorkers).size,3);advance(s,2);assert.ok(foods.every(f=>E.laborers(s,'forage').some(a=>a.route===s.routes.find(r=>r.k===f.k).id)));
});

test('automatic gathering never steals a player locked construction worker',()=>{
  const s=clean(),a=E.laborers(s)[0],start=E.key(8,12);prepareDig(s,start,'down');const p=E.project(s,start,'down',1,Infinity,[a.id]);
  for(const c of s.cells.filter(c=>E.isSurface(s,c))){c.open=true;c.seen=true;}C.setGatherMode(s,s.resources[0].k,'large');advance(s,3);
  assert.equal(a.project,p.id);assert.equal(a.job,'dig');assert.equal(a.playerLocked,true);
});

test('nearby nest defenders respond without losing their persistent construction assignment',()=>{
  const s=clean(),a=E.laborers(s)[0],start=E.key(8,12);prepareDig(s,start,'down');const p=E.project(s,start,'down',1,Infinity,[a.id]);a.k=E.key(8,10);Object.assign(a,E.xy(a.k));
  const foe=E.ant(s,'enemy',E.key(8,10),'combat');s.ants.push(foe);E.tick(s,.25);assert.equal(a.action,'戰鬥');assert.equal(a.project,p.id);
  s.ants=s.ants.filter(x=>x.id!==foe.id);advance(s,1);assert.equal(a.project,p.id);assert.equal(a.job,'dig');assert.ok(['行走','挖掘'].includes(a.action));
});

test('a defeated enemy queen ends the campaign and preserves a final corpse record',()=>{
  const s=clean(),n=s.colonies[0];s.won=false;Object.assign(n,{home:E.key(28,8),queenK:E.key(28,8),queen:0,fallen:false,destroyed:false,alive:true});s.enemyQueen=0;E.cell(s,n.queenK).seen=true;E.tick(s,.25);
  const corpse=s.resources.find(r=>r.queenCorpse&&r.colony===n.id);assert.ok(corpse);assert.equal(n.fallen,true);assert.equal(s.ended,true);assert.equal(s.won,true);const a=E.laborers(s)[0];const result=C.direct(s,[a.id],{kind:'deadQueen',colony:n.id},n.queenK);assert.ok(result.error);
});

test('RTS selection and brood UI omit the blocking selection panel and confirmation step',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');assert.match(app,/function chooseAnts/);assert.match(app,/selectionTools/);assert.doesNotMatch(app,/確認培育/);assert.match(app,/設定點選後立即套用/);
});
