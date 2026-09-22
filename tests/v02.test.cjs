const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,n)=>{for(let i=0;i<n*4;i++)E.tick(s,.25);};
const quiet=()=>{const s=E.create();s.ants=E.workers(s);s.food=1000;s.colonies.forEach(n=>{n.fallen=true;n.destroyed=true;n.alive=false;n.queen=0;});s.won=true;return s;};
test('0.1 save migrates in place; expanded coordinates survive deterministic loading',()=>{
 const s=quiet();s.version=1;const original=s.ants.map(a=>a.k),t=E.restore(E.serialize(s));assert.equal(t.version,12);assert.deepEqual(t.ants.map(a=>a.k),original);
 E.ensureChunk(t,-7,30);const k=E.key(-7,30);assert.equal(E.cell(t,k).x,-7);assert.equal(E.cell(E.restore(E.serialize(t)),k).y,30);assert.equal(E.cell(t,E.HOME).x,8);
});
test('surface chunks are generated once, link across boundaries and contain new ecology',()=>{
 const s=quiet(),old=s.cells.length;E.ensureChunk(s,32,-2);assert.ok(s.cells.length>old);assert.ok(E.path(s,E.surfaceKey(32,-1),E.surfaceKey(32,2)));assert.ok(s.resources.some(r=>E.xy(r.k).x>=32));assert.ok(s.wildlife.length>0);const count=s.cells.length;E.ensureChunk(s,32,-2);assert.equal(s.cells.length,count);
});
test('selected food command allocates only selected ants; intended food wins overlapping ants',()=>{
 const s=quiet(),r=s.resources[0],ids=s.ants.slice(0,2).map(a=>a.id);E.cell(s,r.k).seen=true;const other=s.ants.slice(2).map(a=>a.job);assert.equal(C.direct(s,ids,{kind:'food'},r.k).count,2);assert.deepEqual(s.ants.slice(2).map(a=>a.job),other);
 const targets=[{kind:'ants',k:r.k,id:ids[0],x:20,y:20,radius:24},{kind:'food',k:r.k,x:20,y:20,radius:27}];assert.equal(C.pick(targets,25,20,{moving:true}).kind,'food');assert.equal(C.overlaps(targets,25,20).length,2);
});
test('explicit scouting reveals and extends the world without autonomous endless exploring',()=>{
 const s=quiet(),a=s.ants[0];Object.assign(a,E.xy(E.key(30,2)),{k:E.key(30,2)});const ids=[a.id];assert.equal(C.direct(s,ids,null,E.key(34,2)).count,1);advance(s,8);assert.ok(E.cell(s,E.key(33,2)).seen);const n=s.cells.length;advance(s,10);assert.equal(s.cells.length,n);
});
test('depleted food returns workers home then only to safe discovered food',()=>{
 const s=quiet(),r=s.resources[0],a=s.ants[0];s.resources.forEach(r=>{r.known=false;E.cell(s,r.k).seen=false;});r.known=true;r.amount=0;C.release(a,'forage');E.assignFood(s,a,r);const p=E.xy(r.k);Object.assign(a,p,{k:r.k});advance(s,25);assert.ok(a.k===E.HOME||a.job==='forage');
 const chosen=s.resources.find(x=>x.k===s.routes.find(y=>y.id===a.route)?.k);if(a.job==='forage'&&chosen){assert.ok(chosen.known);assert.ok(chosen.amount>0);}else assert.ok(a.k===E.HOME||[E.HOME,s.mainExit].includes(a.goal)||a.job==='idle');
});
test('only sap regenerates; carcasses remain depleted',()=>{
 const s=quiet(),sap=s.resources.find(r=>r.type==='sap'),corpse=s.resources.find(r=>r.type==='insect');for(const r of [sap,corpse]){r.amount=0;r.depletedAt=0;}s.time=151;E.tick(s,.25);assert.ok(sap.amount>0);assert.equal(corpse.amount,0);
});
test('continuous excavation advances multiple cells and stops at discoveries',()=>{
 const s=quiet(),start=E.key(8,12),before=new Set(s.cells.filter(c=>c.open).map(c=>c.k??E.key(c.x,c.y))),p=E.project(s,start,'down',3,8);let opened=[];for(let i=0;i<320&&opened.length<2;i++){E.tick(s,.25);opened=s.cells.filter(c=>c.open&&!before.has(c.k??E.key(c.x,c.y)));}assert.ok(opened.length>=2);assert.ok(p.next!==null);Object.assign(E.cell(s,p.next),{feature:'昆蟲殘骸',layer:'表土',hard:false,deposit:0});advance(s,25);assert.equal(p.status,'stopped');assert.equal(p.reason,'昆蟲殘骸');assert.ok(s.shells>=5);assert.ok(!s.ants.some(a=>a.project===p.id));
});
test('excavation grows past original underground bounds',()=>{
 const s=quiet();for(let y=12;y<=22;y++)Object.assign(E.cell(s,E.key(8,y)),{open:true,seen:true,feature:null});E.ensureChunk(s,8,23);E.ensureChunk(s,8,25);for(let y=23;y<=25;y++)for(let x=6;x<=10;x++)Object.assign(E.cell(s,E.key(x,y)),{open:false,layer:'表土',feature:null,hard:false,deposit:0});const p=E.project(s,E.key(8,22),'down',3,3);advance(s,65);assert.equal(p.status,'stopped');assert.ok(s.cells.some(c=>c.open&&c.y>=23));
});
test('autocare recruits idle ants and soft capacity slows reproduction',()=>{
 const s=quiet(),b=s.broods[0];s.ants.forEach(a=>C.release(a));E.tick(s,.25);assert.ok(s.ants.some(a=>a.care===b.id));const normal=E.pressure(s).rate;for(let i=0;i<100;i++)s.ants.push(E.ant(s,'player',E.HOME));assert.ok(E.pressure(s).rate<normal);
});
test('nearby combat ants support allies; stationed guards retain their task',()=>{
 const s=quiet();s.broods.forEach(x=>x.autoCare=false);s.ants=s.ants.slice(0,3);const [a,b,guard]=s.ants;for(const x of s.ants){x.k=E.key(8,10);Object.assign(x,E.xy(x.k));C.release(x);}C.release(a,'combat');C.release(guard,'guard');guard.guardTarget=guard.k;a.lastHit=1;s.time=1;s.ants.push(E.ant(s,'enemy',E.key(9,10),'combat'));E.tick(s,.25);assert.equal(b.supporting,E.key(9,10));assert.equal(guard.job,'guard');
});
test('queen assault follows retreat and ends the first campaign',()=>{
 const s=quiet(),n=s.colonies[0];s.won=false;s.enemyQueen=1;Object.assign(n,{queen:1,fallen:false,destroyed:false,alive:true,retreated:true});for(const a of s.ants){a.k=n.queenK;Object.assign(a,E.xy(a.k));}const ids=s.ants.map(a=>a.id);assert.equal(C.direct(s,ids,{kind:'enemyQueen',colony:0},n.queenK).count,9);advance(s,1);assert.ok(n.fallen);assert.equal(s.ended,true);assert.equal(s.won,true);assert.equal(n.queen,0);
});
test('enemy defenders react to an isolated scout and recall when queen is threatened',()=>{
 const s=E.create(),p=E.workers(s)[0],foe=s.ants.find(a=>a.faction==='enemy'&&a.job==='combat'),n=s.colonies.find(n=>n.id===foe.colony);s.ants=[p,foe];p.k=E.key(E.xy(n.home).x,6);Object.assign(p,E.xy(p.k));C.release(p,'scout');p.scoutTarget=E.HOME;foe.k=E.key(E.xy(n.home).x,6);Object.assign(foe,E.xy(foe.k));s.time=n.attackDelay+1;E.tick(s,.25);assert.ok(foe.chaseUntil>s.time);n.threatUntil=s.time+10;p.k=E.HOME;Object.assign(p,E.xy(p.k));E.tick(s,.25);assert.equal(foe.action,'回防');
});
test('a chamber project opens more usable nest space and releases workers on stop',()=>{
 const s=quiet(),before=E.pressure(s).space,start=E.key(5,11);for(let y=10;y<=12;y++)for(let x=4;x<=6;x++){const c=E.cell(s,E.key(x,y));c.layer='表土';c.feature=null;c.deposit=0;c.hard=false;}const p=E.project(s,start,'chamber',3,9);advance(s,70);assert.ok(E.pressure(s).space>before);assert.equal(p.status,'stopped');
});
test('same batch produces individual variation; longevity is finite',()=>{
 const s=quiet(),b=s.broods[0];b.stage=2;b.progress=31.99;b.min=.8;b.pred=.7;b.shell=.5;b.count=6;E.tick(s,.25);const born=E.workers(s).filter(a=>a.id>b.id+1);assert.ok(new Set(born.map(a=>JSON.stringify(a.traits))).size>1);const a=s.ants[0];a.age=a.lifespan+1;a.k=E.key(8,6);Object.assign(a,E.xy(a.k));C.order(s,[a.id],a.k);const hp=a.hp;E.tick(s,.25);assert.ok(a.hp<hp);
});




