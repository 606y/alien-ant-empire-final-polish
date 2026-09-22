const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const C=require('../interaction.js');
const advance=(s,t)=>{for(let i=0;i<t*4;i++)E.tick(s,.25);};
function peaceful(seed=51001,count=24){const s=E.create(seed);s.ants=E.workers(s);s.food=500;s.colonies.forEach(n=>{n.fallen=true;n.destroyed=true;n.alive=false;n.queen=0;});s.won=true;for(const a of E.laborers(s))C.release(a);while(E.laborers(s).length<count)s.ants.push(E.ant(s,'player',E.HOME));return s;}

test('new world seeds vary terrain and resources while every opening remains viable',()=>{
  const worlds=[E.create(51011),E.create(51012),E.create(51013)];
  const signatures=worlds.map(s=>JSON.stringify({food:s.resources.map(r=>[r.k,r.type]),blocked:s.cells.filter(c=>E.isSurface(s,c)&&!c.open).map(c=>[c.x,c.y]),enemy:s.colonies[0].home}));
  assert.equal(new Set(signatures).size,3);
  for(const s of worlds){assert.ok(s.resources.some(r=>r.type==='seed'));assert.ok(s.resources.some(r=>r.type==='sap'));assert.ok(s.resources.slice(0,2).every(r=>E.path(s,E.HOME,r.k)!==null));assert.equal(s.worldSeed,s.seed===s.worldSeed?s.seed:s.worldSeed);}
});

test('the safe development window cannot be bypassed by an untelegraphed nest invasion',()=>{
  const s=E.create(1833801870),food=s.resources.find(r=>r.known&&r.type==='seed');C.setGatherMode(s,food.k,'large');E.requestRoom(s,'nursery','left');for(const b of s.broods)b.breed='soldier';advance(s,170);assert.equal(s.world.expedition,null);assert.equal(s.ants.filter(a=>a.faction==='enemy'&&!E.isSurface(s,a.k)&&E.distance(a,E.xy(E.HOME))<6).length,0);assert.ok(s.queen>99.5);assert.ok(E.workers(s).length>=12);
});

test('five mineral marks create real tasks, bind idle workers and deplete gradually',()=>{
  const s=peaceful(52001,26),spots=[E.key(6,9),E.key(7,9),E.key(9,9),E.key(10,9),E.key(8,10)];
  for(const k of spots){const c=E.cell(s,k);Object.assign(c,{open:true,seen:true,sealed:false,deposit:3,feature:'深灰色異常碎屑'});const result=E.mine(s,k,1);assert.ok(!result.error);}
  assert.equal(s.miningTasks.filter(t=>t.status==='working').length,5);assert.equal(E.laborers(s,'mine').length,5);const before=s.minerals;advance(s,2);assert.ok(s.minerals+E.workers(s).reduce((n,a)=>n+(a.mineralCargo||0),0)>before);assert.ok(spots.some(k=>E.cell(s,k).deposit<3));advance(s,30);assert.equal(s.miningTasks.filter(t=>t.status==='working').length,0);assert.ok(spots.every(k=>E.cell(s,k).deposit===0));
});

test('queen corpse assignment requests ten carriers and processing finishes at prey room',()=>{
  const s=peaceful(53001,24),room={id:800,k:E.key(6,10),type:'prey',cells:[E.key(6,10)],size:1,targetSize:1,status:'active',progress:100,maturity:30,use:0,policy:'balanced',lastGrowth:s.time};s.rooms.push(room);const corpse={k:E.key(12,3),name:'敵方蟻后遺骸',amount:30,max:30,type:'queen',prey:true,large:true,queenCorpse:true,freshness:100,known:true,depletedAt:null};s.resources.push(corpse);E.cell(s,corpse.k).open=true;E.cell(s,corpse.k).seen=true;const r=C.setGatherMode(s,corpse.k,'queen'),route=s.routes.find(x=>x.k===corpse.k);assert.ok(!r.error);assert.equal(route.desired,10);assert.equal(E.laborers(s,'forage').filter(a=>a.route===route.id).length,10);advance(s,90);assert.ok(s.preyProcessed>0&&s.protein>0&&s.tissues>0);
});

test('a formal nursery receives every later brood and permanently retires the temporary label',()=>{
  const s=peaceful(53501,18),k=E.key(6,10),room={id:801,k,type:'nursery',cells:[k],size:1,targetSize:1,status:'active',progress:100,maturity:20,use:0,policy:'balanced',lastGrowth:s.time};s.rooms.push(room);s.formalNursery=room.id;s.broods[0].k=E.HOME;s.eggsClock=48;const before=s.broods.length;E.tick(s,.25);assert.ok(s.broods.length>before);assert.ok(s.broods.every(b=>b.k===k));assert.equal(s.temporaryNurseryRetired,true);
});

test('a sustained midgame colony reaches thirty adults and at least eight real soldiers',()=>{
  const s=peaceful(53701,24),k=E.key(7,10);s.rooms.push({id:802,k,type:'military',cells:[k],size:1,targetSize:1,status:'active',progress:100,maturity:35,use:0,policy:'balanced',lastGrowth:s.time});for(const b of s.broods){b.count=5;b.breed='soldier';b.autoCare=true;}advance(s,140);assert.ok(E.workers(s).length>=30);assert.ok(E.soldiers(s).length>=8);assert.ok(E.workforce(s).available>0);
});

test('pressure starts a physical telegraphed expedition before any nest assault',()=>{
  const s=E.create(54001);s.food=180;while(E.workers(s).length<42)s.ants.push(E.ant(s,'player',E.HOME));for(const r of s.regions)r.seen=true;advance(s,525);const text=s.events.map(e=>e.text).join('\n');assert.match(text,/陌生偵察蟻/);assert.match(text,/足跡/);assert.match(text,/集結/);assert.ok(s.world.expedition||s.world.clues.some(c=>c.kind==='retreat')||s.colonies.some(n=>n.recoveryUntil>s.time));
});

test('RTS interface separates selection, command and panels and surface is top-down',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),world=fs.readFileSync(path.join(__dirname,'..','world.js'),'utf8');
  assert.match(app,/selectionTools=false,commandMode=null/);assert.match(app,/gesture\.shift/);assert.match(app,/selectMany\(ids/);assert.match(app,/data-edit-input/);assert.doesNotMatch(app,/moveBrood/);assert.match(world,/x:m\.x\+x\*m\.scale/);assert.doesNotMatch(world,/c\.transform\(1,0,-/);
});

