const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,t)=>{for(let i=0;i<t*4;i++)E.tick(s,.25);};
const quiet=()=>{const s=E.create(4401);s.ants=E.workers(s);s.food=500;s.colonies.forEach(n=>{n.fallen=true;n.destroyed=true;n.alive=false;n.queen=0;});s.won=true;for(const a of E.laborers(s))C.release(a);return s;};

test('stopped collection releases empty workers and carrying workers after delivery',()=>{
  const s=quiet(),food=s.resources[0];E.cell(s,food.k).seen=true;C.setGatherMode(s,food.k,'large');advance(s,3);const route=s.routes.find(r=>r.k===food.k),ants=E.laborers(s,'forage').filter(a=>a.route===route.id);assert.ok(ants.length);ants[0].carry=2;const stopped=C.stopGather(s,food.k);assert.ok(stopped.count>=1);advance(s,40);assert.equal(E.laborers(s,'forage').filter(a=>a.route===route.id).length,0);assert.ok(ants.every(a=>!a.primary));
});

test('automatic collection reserves brood care and standby capacity',()=>{
  const s=quiet(),food=s.resources[0];E.cell(s,food.k).seen=true;C.setGatherMode(s,food.k,'large');E.tick(s,.25);const w=E.workforce(s);assert.ok(w.nurse>=E.careNeed(s));assert.ok(w.forage<=w.automaticGatherLimit);assert.ok(w.idle>=w.standby);
});

test('low food uses known safe resources while preserving the workforce scheduler',()=>{
  const s=quiet();s.food=19;advance(s,4);assert.ok(s.routes.filter(r=>r.active).length>0);assert.ok(E.laborers(s,'forage').length<=E.workforce(s).automaticGatherLimit);assert.ok(E.workforce(s).available>=E.workforce(s).standby);
});

test('invalid completed group state is released and manual standby always recovers workers',()=>{
  const s=quiet(),a=E.laborers(s)[0];a.job='combat';a.group='gone';a.primary={kind:'group',group:'gone'};E.tick(s,.25);assert.notEqual(a.job,'combat');assert.equal(a.primary,null);a.job='guard';a.guardTarget=s.mainExit;a.primary={kind:'group',group:'old'};assert.equal(C.standby(s,[a.id]).count,1);assert.equal(a.job,'idle');assert.equal(a.primary,null);
});

test('room request chooses a direction, excavates its own path, and releases builders',()=>{
  const s=quiet(),room=E.requestRoom(s,'rest','left');assert.ok(!room.error);assert.ok(E.xy(room.k).x<E.xy(E.HOME).x);advance(s,220);assert.equal(room.status,'active');assert.ok(room.cells.every(k=>E.cell(s,k).open));assert.equal(E.laborers(s).filter(a=>a.roomProject===room.id).length,0);
});

test('several room requests queue and resume from reachable construction edges',()=>{
  const s=quiet();for(const [i,type] of Object.keys(E.ROOM_TYPES).filter(type=>type!=='royal').entries())assert.ok(!E.requestRoom(s,type,['left','right','deep'][i%3]).error);advance(s,520);assert.ok(s.rooms.filter(r=>r.status==='active').length>=5);assert.ok(E.workforce(s).available>0);
});

test('blocked room upgrade automatically plans another room of the same function',()=>{
  const s=quiet(),room={id:900,k:E.HOME,type:'nursery',cells:[E.HOME],planCells:[E.HOME],size:1,targetSize:1,status:'active',progress:100,maturity:10,use:0};s.rooms.push(room);const blocker=E.cell(s,E.key(7,7));blocker.hard=true;const result=E.expandRoom(s,room.id);assert.ok(!result.error);assert.equal(result.type,'nursery');assert.notEqual(result.id,room.id);assert.equal(result.alternative,true);
});

test('first formal nursery automatically becomes the single brood location',()=>{
  const s=quiet(),room=E.buildRoom(s,E.HOME,'nursery');advance(s,35);assert.equal(room.status,'active');assert.equal(s.formalNursery,room.id);assert.ok(s.temporaryNurseryRetired);assert.ok(s.broods.every(b=>b.k===room.k));
});

test('selected workers can be reassigned directly to reachable excavation',()=>{
  const s=quiet(),target=E.key(10,12),ids=E.laborers(s).slice(0,3).map(a=>a.id),result=C.assignSelected(s,ids,'dig',target);assert.equal(result.count,3);assert.ok(ids.every(id=>E.workers(s).find(a=>a.id===id).job==='dig'));
});
