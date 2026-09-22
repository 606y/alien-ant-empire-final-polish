const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,t)=>{for(let i=0;i<t*4;i++)E.tick(s,.25);};

test('selecting nearby workers does not alter their jobs',()=>{
  const s=E.create(),before=E.workers(s).map(a=>a.job),ids=C.localAnts(s,s.ants[0].id);
  assert.equal(ids.length,9);assert.deepEqual(E.workers(s).map(a=>a.job),before);
});
test('direct split orders preserve the remainder and bypass old rally/waypoints',()=>{
  const s=E.create(),ids=C.localAnts(s,s.ants[0].id),a=ids.slice(0,3),b=ids.slice(3,6),rest=ids.slice(6);
  assert.equal(C.order(s,a,E.key(8,6)).count,3);assert.equal(C.order(s,b,E.key(5,11)).count,3);
  assert.notEqual(s.ants.find(x=>x.id===a[0]).group,s.ants.find(x=>x.id===b[0]).group);
  assert.ok(s.ants.filter(x=>rest.includes(x.id)).every(x=>x.job!=='combat'));
  assert.ok(s.ants.filter(x=>[...a,...b].includes(x.id)).every(x=>x.rallied&&x.viaDone));
  assert.equal(C.order(s,a,E.key(8,7)).count,3);
  assert.equal(E.workers(s).length,9);
});
test('a fourth split cannot silently hijack an existing order',()=>{
  const s=E.create(),ids=E.workers(s).map(a=>a.id);
  C.order(s,[ids[0],ids[1]],E.key(8,6));C.order(s,[ids[2],ids[3]],E.key(5,11));C.order(s,[ids[4],ids[5]],E.key(8,12));
  const others=s.ants.filter(a=>ids.slice(1).includes(a.id)).map(a=>[a.id,a.group]);assert.equal(C.order(s,[ids[0]],E.HOME).count,1);assert.deepEqual(s.ants.filter(a=>ids.slice(1).includes(a.id)).map(a=>[a.id,a.group]),others);assert.equal(s.groups.filter(g=>s.ants.some(a=>a.group===g.id)).length,4);
});
test('one-click gathering allocates real workers, and reducing returns them to idle',()=>{
  const s=E.create(),k=s.resources[0].k;E.cell(s,k).seen=true;
  assert.equal(C.gather(s,k).count,3);const r=s.routes[0];
  assert.equal(E.workers(s,'forage').filter(a=>a.route===r.id).length,3);
  C.gather(s,k,-1);assert.equal(E.workers(s,'idle').length,1);
  C.gather(s,k,1);assert.equal(E.workers(s,'forage').filter(a=>a.route===r.id).length,3);
});
test('guarding a second position leaves the first assigned guard in place',()=>{
  const s=E.create(),k=E.key(5,11),first=E.workers(s,'guard')[0];
  C.guard(s,k);assert.equal(C.guarding(s,k).length,1);
  const second=C.guarding(s,k)[0];assert.notEqual(first.id,second.id);
  advance(s,15);assert.equal(first.k,E.key(8,6));assert.equal(second.k,k);
  C.guard(s,k,-1);assert.equal(second.job,'idle');assert.equal(first.job,'guard');
});
test('direct excavation calls for a worker when no diggers are assigned',()=>{
  const s=E.create();E.workers(s,'dig').forEach(a=>C.release(a));
  assert.equal(C.dig(s,E.key(10,12)).count,1);assert.ok(s.digQueue.includes(E.key(10,12)));
});
test('care uses unassigned nurses or idle workers and never steals active work',()=>{
  const s=E.create(),id=s.broods[0].id;assert.equal(C.care(s,id,1).count,1);assert.equal(C.care(s,id,1).count,1);assert.equal(C.care(s,id,1).error,'目前沒有可調派工蟻。');
  const dig=E.workers(s,'dig')[0];C.release(dig);assert.equal(C.care(s,id,1).count,1);
  assert.equal(E.workers(s,'nurse').filter(a=>a.care===id).length,3);
  C.care(s,id,-1);assert.equal(E.workers(s,'nurse').filter(a=>a.care===id).length,2);
  assert.equal(E.workers(s).length,9);
});
test('touch targets snap near small ants and labels; digging ignores ants',()=>{
  const targets=[{kind:'ants',id:1,k:1,x:100,y:100,radius:24},{kind:'ground',k:1,x:100,y:100,radius:25},{kind:'soil',k:2,x:132,y:100,radius:24},{kind:'food',k:3,x:200,y:200,radius:24,box:{x:140,y:178,w:120,h:44}}];
  assert.equal(C.pick(targets,117,105).kind,'ants');
  assert.equal(C.pick(targets,150,190).kind,'food');
  assert.equal(C.pick(targets,115,100,{digging:true}).kind,'soil');
  assert.equal(C.pick(targets,400,400),null);
});
test('unreachable direct orders leave workforce unchanged',()=>{
  const s=E.create(),before=E.serialize(s);assert.ok(C.order(s,[s.ants[0].id],E.key(4,20)).error);assert.equal(E.serialize(s),before);
});
test('saved direct orders and individual defense destinations survive loading',()=>{
  const s=E.create();C.order(s,[s.ants[0].id],E.key(5,11));C.guard(s,E.key(8,12));
  const restored=E.restore(E.serialize(s));advance(s,4);advance(restored,4);assert.deepEqual(restored,s);
});
