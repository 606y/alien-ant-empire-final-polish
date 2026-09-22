const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
function advance(s,seconds){for(let i=0;i<seconds*4;i++)E.tick(s,.25);}
function peaceful(s){s.ants=s.ants.filter(a=>a.faction==='player');s.enemyQueen=0;s.won=true;return s;}

test('one queen, nine unique workers, exclusive jobs and scout limit',()=>{
  const s=E.create();assert.equal(E.workers(s).length,9);assert.equal(s.queen,100);
  assert.equal(E.assign(s,'combat',1),false);
  E.assign(s,'dig',-1);assert.equal(E.assign(s,'combat',1),true);
  assert.equal(E.workers(s).length,9);assert.equal(E.workers(s,'combat').length,1);
  assert.equal(new Set(E.workers(s).map(a=>a.id)).size,9);
});

test('food routes require discovery and food is carried home over time',()=>{
  const s=peaceful(E.create()),r=s.resources[0];
  assert.equal(E.establishRoute(s,r.k),false);E.cell(s,r.k).seen=true;
  assert.equal(E.establishRoute(s,r.k),true);const initial=s.food,amount=r.amount;
  advance(s,3);assert.ok(s.food<initial);assert.equal(r.amount,amount);
  advance(s,45);assert.ok(r.amount<amount);assert.ok(s.preyMeals>0);
  assert.ok(E.workers(s,'forage').every(a=>s.routes.some(route=>route.id===a.route)));
});

test('digging changes traversable graph and finds mineral without revealing whole object',()=>{
  const s=peaceful(E.create());const target=E.key(10,12);
  assert.equal(E.passable(s,target),false);assert.equal(E.queueDig(s,target),true);
  advance(s,25);assert.equal(E.passable(s,target),true);assert.ok(E.cell(s,target).deposit>0);assert.ok(s.discoveredMineral);
  assert.equal(E.cell(s,E.key(18,21)).seen,false);
});

test('sealed corridors disconnect paths and cannot crush occupying ants',()=>{
  const s=E.create(),k=E.key(8,6);
  assert.ok(E.path(s,E.HOME,s.mainExit));assert.equal(E.seal(s,k),null);
  assert.equal(E.path(s,E.HOME,s.mainExit),null);assert.equal(E.seal(s,k),null);
  s.ants[0].k=k;assert.match(E.seal(s,k),/螞蟻/);assert.ok(E.path(s,E.HOME,s.mainExit));
});

test('protein and mineral exposure produce variable adult traits through larval development',()=>{
  const s=peaceful(E.create());s.food=1000;s.minerals=100;
  for(const a of E.workers(s))a.job='nurse';
  s.broods=s.broods.slice(0,1);s.broods[0].stage=1;s.broods[0].feed='protein';s.broods[0].add='mineral';
  advance(s,105);const born=E.workers(s).filter(a=>a.traits.pred>.1);
  assert.ok(born.length>=3);assert.ok(born.every(a=>a.traits.min>.1));
  assert.ok(new Set(born.map(a=>a.traits.pred)).size>1);assert.ok(s.minerals<100);
});

test('losses remove actual assigned workers; starvation gives a recovery window before threatening queen',()=>{
  const s=peaceful(E.create());s.ants[0].hp=-1;advance(s,.25);
  assert.equal(E.workers(s).length,8);assert.equal(s.deaths,1);
  s.resources=[];s.routes=[];s.food=0;const health=s.queen;advance(s,10);assert.equal(s.queen,health);advance(s,190);assert.ok(s.queen<health);
});

test('three groups cannot duplicate workers and can prefer observed armor',()=>{
  const s=E.create();for(const a of E.workers(s))a.job='combat';s.ants[2].traits.min=.8;s.groups[0].preference='armor';
  assert.ok(E.groupAdjust(s,'A',1));assert.equal(s.ants[2].group,'A');
  for(let i=0;i<20;i++)E.groupAdjust(s,'B',1);
  assert.equal(E.workers(s).filter(a=>a.group).length,9);
  assert.equal(E.groupAdjust(s,'C',1),false);
});

test('enemy visibility is blocked by unexplored branching geometry',()=>{
  const s=E.create(),a=s.ants.find(a=>a.faction==='enemy'),b=s.ants[0];
  Object.assign(a,{k:E.key(8,6),...E.xy(E.key(8,6))});
  Object.assign(b,{k:E.key(6,9),...E.xy(E.key(6,9))});
  assert.equal(E.visible(s,a,b),false);
});

test('save round-trip preserves deterministic continuation and rejects unsupported versions',()=>{
  const s=E.create();advance(s,5);const copy=E.restore(E.serialize(s));
  advance(s,5);advance(copy,5);assert.deepEqual(copy,s);
  assert.throws(()=>E.restore('{"version":99}'));assert.throws(()=>E.restore('invalid'));
});

test('territory decays without activity instead of staying permanently captured',()=>{
  const s=peaceful(E.create());s.regions[4].ours=30;s.regions[4].theirs=0;s.regions[4].seen=true;
  for(const a of s.ants)a.job='nurse';advance(s,15);
  assert.ok(s.regions[4].ours<30);assert.equal(E.territory(s.regions[4]),'己方活動占優');
});

test('long run preserves resource and worker invariants',()=>{
  const s=E.create();s.food=300;s.resources.forEach(r=>E.cell(s,r.k).seen=true);E.establishRoute(s,s.resources[0].k);
  advance(s,260);
  assert.ok(Number.isFinite(s.queen));assert.ok(s.food>=0);assert.ok(s.enemyFood>=0);
  assert.ok(s.ants.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.hp>0));
  assert.ok(new Set(s.ants.map(a=>a.id)).size===s.ants.length);
});

function encounter(wide=false,armor=0){
  const s=E.create();s.ants=[];s.broods=[];s.food=100;s.time=500;
  const k=E.key(8,6),entry=E.key(8,5);s.guardPoints=[k];
  const defender=E.ant(s,'player',k,'guard',{pred:0,min:armor});s.ants.push(defender);
  for(let i=0;i<3;i++)s.ants.push(E.ant(s,'enemy',entry,'combat'));
  if(wide)for(const k of [E.key(7,5),E.key(9,5),E.key(7,6),E.key(9,6)])E.cell(s,k).open=true;
  return {s,defender,entry};
}

test('a living blocker cannot be walked through by an opposing force',()=>{
  const {s,defender,entry}=encounter();advance(s,2);
  assert.ok(defender.hp>0);assert.ok(s.ants.filter(a=>a.faction==='enemy').every(a=>a.k===entry));
});

test('the same force deals more simultaneous damage in a wide chamber than a narrow passage',()=>{
  const narrow=encounter(),wide=encounter(true);
  advance(narrow.s,.25);advance(wide.s,.25);
  assert.ok(wide.defender.maxHp-wide.defender.hp>narrow.defender.maxHp-narrow.defender.hp);
});

test('mineral armor reduces incoming damage under identical terrain and force',()=>{
  const native=encounter(),armored=encounter(false,.8);
  advance(native.s,.25);advance(armored.s,.25);
  assert.ok(armored.defender.maxHp-armored.defender.hp<native.defender.maxHp-native.defender.hp);
});


