const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,seconds)=>{for(let i=0;i<seconds*4&&!s.ended;i++)E.tick(s,.25);};

test('a new campaign starts with four independent enemy queens and populations',()=>{
  const s=E.create(64001),ids=s.colonies.map(n=>n.id),roles=s.colonies.map(n=>n.role);
  assert.equal(s.colonies.length,4);assert.equal(s.enemyQueensAlive,4);assert.equal(new Set(ids).size,4);
  assert.deepEqual(new Set(roles),new Set(['near','hunter','armored','deep_forest']));
  for(const n of s.colonies){assert.ok(n.queen>0);assert.ok(n.food>0);assert.ok(s.ants.some(a=>a.faction==='enemy'&&a.colony===n.id));assert.ok(n.brood&&Array.isArray(n.resourceRoutes));}
});

test('enemy casualties and food stocks affect only their own colony',()=>{
  const s=E.create(64002),[a,b]=s.colonies,member=s.ants.find(x=>x.faction==='enemy'&&x.colony===a.id),beforeB=s.ants.filter(x=>x.faction==='enemy'&&x.colony===b.id).length;
  member.hp=-1;E.tick(s,.25);assert.equal(s.ants.filter(x=>x.faction==='enemy'&&x.colony===b.id).length,beforeB);const foodB=b.food;a.food=0;assert.equal(b.food,foodB);assert.ok(a.losses>=1);
});

test('the four enemy archetypes have materially different strength and behavior',()=>{
  const s=E.create(64005),byRole=Object.fromEntries(s.colonies.map(n=>[n.role,n])),units=role=>s.ants.filter(a=>a.faction==='enemy'&&a.colony===byRole[role].id),soldiers=role=>units(role).filter(a=>a.caste==='soldier');
  assert.ok(byRole.deep_forest.populationCap>byRole.near.populationCap);assert.ok(byRole.hunter.attackDelay<byRole.deep_forest.attackDelay);assert.ok(byRole.armored.cooldown>byRole.hunter.cooldown);assert.ok(soldiers('hunter').length>soldiers('near').length);assert.ok(soldiers('armored').every(a=>a.maxHp>=18&&a.traits.min>=.42));assert.ok(E.distance(E.xy(byRole.near.home),E.xy(E.HOME))<E.distance(E.xy(byRole.armored.home),E.xy(E.HOME)));
});

test('a destroyed colony cannot breed, launch expeditions or revive while others continue',()=>{
  const s=E.create(64003),dead=s.colonies.find(n=>n.role==='near'),living=s.colonies.find(n=>n.role==='hunter');dead.queen=0;E.tick(s,.25);const deadCount=s.ants.filter(a=>a.faction==='enemy'&&a.colony===dead.id).length;
  dead.food=999;dead.birth=999;living.food=999;living.birth=living.birthInterval;E.tick(s,.25);assert.equal(dead.fallen,true);assert.equal(dead.destroyed,true);assert.equal(dead.queen,0);assert.equal(s.ants.filter(a=>a.faction==='enemy'&&a.colony===dead.id).length,deadCount);assert.ok(s.ants.filter(a=>a.faction==='enemy'&&a.colony===living.id).length>living.initialPower);assert.ok(!s.world.expeditions.some(ex=>ex.source===dead.id));
  advance(s,30);assert.equal(dead.queen,0);assert.equal(dead.destroyed,true);
});

test('a living queen can rebuild one forager from a real reachable food reserve after total field losses',()=>{
  const s=E.create(64033),n=s.colonies.find(n=>n.role==='near');s.ants=s.ants.filter(a=>a.faction!=='enemy'||a.colony!==n.id);s.time=200;n.lastEmergencyBrood=0;n.zeroPopulationSince=0;n.food=0;n.losses=n.initialPower;
  const reserve=s.resources.filter(r=>!r.queenCorpse&&E.distance(E.xy(n.home),E.xy(r.k))<=24&&E.path(s,n.home,r.k)!==null).sort((a,b)=>E.distance(E.xy(n.home),E.xy(a.k))-E.distance(E.xy(n.home),E.xy(b.k)))[0],before=reserve.amount;
  assert.ok(reserve&&before>=8);E.tick(s,.25);const rebuilt=s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id);assert.equal(rebuilt.length,1);assert.equal(rebuilt[0].job,'forage');assert.equal(reserve.amount,before-8);assert.equal(n.recoveryState,'recovering');
  rebuilt[0].hp=-1;n.queen=0;s.time+=181;E.tick(s,.25);assert.equal(n.destroyed,true);assert.equal(s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id).length,0);
});

test('the first three queen deaths do not win; only the fourth ends the campaign',()=>{
  const s=E.create(64004);for(let i=0;i<3;i++){s.colonies[i].queen=0;E.tick(s,.25);assert.equal(s.won,false);assert.equal(s.ended,false);assert.equal(s.enemyQueensAlive,3-i);}s.colonies[3].queen=0;E.tick(s,.25);assert.equal(s.enemyQueensAlive,0);assert.equal(s.won,true);assert.equal(s.ended,true);assert.match(s.events[0].text,/四個敵對蟻國/);
});

test('all four nest entrances use the same selected-soldier expedition command and preserve identity',()=>{
  for(const role of ['near','hunter','armored','deep_forest']){const s=E.create(64010+role.length),n=s.colonies.find(n=>n.role===role),soldier=E.workers(s)[0],entry=E.surfaceKey(E.xy(n.home).x,4);s.ants=s.ants.filter(a=>a.faction==='player');soldier.caste='soldier';soldier.soldierType='normal';soldier.maxHp=soldier.hp=200;E.cell(s,entry).seen=true;const result=C.direct(s,[soldier.id],{kind:'enemyNest',k:entry,colony:n.id},entry);assert.equal(result.count,1);const g=s.groups.find(g=>g.command==='ENTER_ENEMY_NEST'&&g.queenId===n.id);assert.ok(g);advance(s,45);const same=E.workers(s).find(a=>a.id===soldier.id);assert.ok(same);assert.equal(same.group,g.id);assert.ok(!E.isSurface(s,same.k));}
});

test('all four surface entrances connect to their underground nests, including expanded-map colonies',()=>{
  const s=E.create(64019);for(const n of s.colonies){const entry=E.surfaceKey(E.xy(n.home).x,4);assert.ok(E.path(s,entry,n.home),`${n.role} entrance should reach its queen chamber`);assert.ok(E.path(s,E.HOME,n.home),`${n.role} nest should connect to the player world graph`);}
});

test('workers haul three loads from each enemy queen corpse without a portal loop',()=>{
  for(const [i,role] of ['near','hunter','armored','deep_forest'].entries()){
    const s=E.create(64040+i),n=s.colonies.find(n=>n.role===role);s.food=500;for(const colony of s.colonies)colony.attackDelay=99999;
    n.queen=0;E.tick(s,.25);s.ants=s.ants.filter(a=>a.faction!=='enemy');const corpse=s.resources.find(r=>r.queenCorpse&&r.colony===n.id);assert.ok(corpse,`${role} corpse exists`);E.cell(s,corpse.k).seen=true;
    for(const a of E.laborers(s))C.release(a);const result=C.setGatherMode(s,corpse.k,'queen'),route=s.routes.find(r=>r.k===corpse.k);assert.ok(!result.error,`${role} route starts`);assert.equal(route.corpseId,corpse.id);assert.equal(route.nestId,n.id);assert.equal(route.targetLayer,'enemy_nest_underground');
    const start=corpse.amount,startFood=s.food,carrierIds=new Set(),transitions=new Map();let sawPickup=false,sawSurfaceCargo=false;
    for(let step=0;step<2400&&s.resources.includes(corpse);step++){
      E.tick(s,.25);for(const a of E.laborers(s).filter(a=>a.haulTask?.corpseId===corpse.id)){if(a.carry>0){sawPickup=true;carrierIds.add(a.id);if(E.isSurface(s,a.k))sawSurfaceCargo=true;}transitions.set(a.id,(a.layerTransitions||[]).filter(t=>t.task===route.id).length);}
      if((route.delivered||0)>=13.5&&corpse.amount<start-9)break;
    }
    assert.ok(sawPickup&&sawSurfaceCargo,`${role} workers pick up and cross layers with cargo`);assert.ok(corpse.amount<=start-13.5,`${role} corpse decreases only after at least three loads`);assert.ok((route.delivered||0)>=13.5,`${role} delivers at least three loads`);assert.ok(s.food>startFood-20,`${role} delivery reaches player storage`);assert.equal(route.portalLoopCount||0,0,`${role} does not trigger portal-loop watchdog`);assert.ok([...transitions.values()].every(count=>count<3),`${role} does not repeat the same portal transition three times in the watchdog window`);assert.ok(carrierIds.size>0);
    // The farthest queen now has a real outer/patrol/defense approach; allow the final
    // loaded workers to traverse that longer route before asserting entity cleanup.
    for(let step=0;step<5200&&s.resources.includes(corpse);step++)E.tick(s,.25);assert.ok(!s.resources.includes(corpse),`${role} depleted corpse entity is removed`);assert.ok(!s.routes.some(r=>r.id===route.id),`${role} completed corpse task source is removed`);assert.ok(!E.laborers(s).some(a=>a.haulTask?.corpseId===corpse.id),`${role} workers clear corpse task context`);
  }
});

test('entering an enemy nest without soldiers gives the correct actionable message',()=>{
  const s=E.create(64018),n=s.colonies[0],entry=E.surfaceKey(E.xy(n.home).x,4);s.ants=s.ants.filter(a=>a.faction==='player');const result=C.direct(s,[],{kind:'enemyNest',k:entry,colony:n.id},entry);assert.match(result.error,/至少選取一隻兵蟻/);assert.doesNotMatch(result.error,/工蟻/);
});

test('global war pressure allows at most two simultaneous expeditions',()=>{
  const s=E.create(64020);while(E.workers(s).length<24)s.ants.push(E.ant(s,'player',E.HOME));s.time=900;s.food=200;for(const n of s.colonies){n.lastExpedition=-999;n.recoveryUntil=0;}for(const r of s.regions)r.seen=true;E.tick(s,.25);assert.ok(s.world.expeditions.length>=1);assert.ok(s.world.expeditions.length<=2);assert.equal(new Set(s.world.expeditions.map(ex=>ex.source)).size,s.world.expeditions.length);
});

test('save/load and a fresh reset preserve four-colony campaign state',()=>{
  const s=E.create(64030);s.colonies[0].queen=0;E.tick(s,.25);const restored=E.restore(E.serialize(s));assert.equal(restored.colonies.length,4);assert.equal(restored.colonies[0].destroyed,true);assert.equal(restored.enemyQueensAlive,3);const fresh=E.create(64031);assert.equal(fresh.colonies.length,4);assert.equal(fresh.enemyQueensAlive,4);assert.ok(fresh.colonies.every(n=>!n.destroyed));
});

test('twelve generated campaigns keep player and enemy cores safely separated with layered approaches',()=>{
  for(let seed=65000;seed<65012;seed++){
    const s=E.create(seed),player=E.xy(E.HOME),layout=Object.fromEntries(s.colonies.map(n=>[n.role,[E.xy(n.home).x,E.xy(n.home).y]]));
    assert.deepEqual(E.validateEnemyLayout(layout),{valid:true,errors:[]},`seed ${seed} layout validates`);
    for(let i=0;i<s.colonies.length;i++){
      const n=s.colonies[i],z=n.zones,sequence=['outer','gathering','patrol','defense','core'].map(name=>z[name]);
      assert.ok(E.distance(player,E.xy(n.home))>=E.MAP_RULES.playerEnemyMin,`seed ${seed} ${n.role} clears player nest`);
      assert.ok(sequence.every(k=>E.cell(s,k)?.open),`seed ${seed} ${n.role} has open transition zones`);
      assert.equal(new Set(sequence).size,sequence.length,`seed ${seed} ${n.role} zones do not collapse together`);
      assert.ok(E.path(s,z.entry,z.core),`seed ${seed} ${n.role} entrance reaches core`);
      assert.equal(E.cell(s,z.core).seen,false,`seed ${seed} ${n.role} queen room starts undiscovered`);
      for(let j=i+1;j<s.colonies.length;j++)assert.ok(E.distance(E.xy(n.home),E.xy(s.colonies[j].home))>=E.MAP_RULES.enemyEnemyMin,`seed ${seed} enemy cores stay separate`);
    }
  }
});

test('normal three-room expansion near the player cannot touch an enemy queen zone',()=>{
  for(let seed=65100;seed<65110;seed++){
    const s=E.create(seed);s.food=400;
    const rooms=[E.requestRoom(s,'nursery','left'),E.requestRoom(s,'store','right'),E.requestRoom(s,'prey','deep')];
    for(const room of rooms){assert.ok(!room.error,`seed ${seed} creates three normal rooms`);for(const k of room.planCells)for(const n of s.colonies)assert.ok(E.distance(E.xy(k),E.xy(n.queenK))>E.MAP_RULES.enemyCoreBuffer,`seed ${seed} room plan clears ${n.role} queen core`);}
    assert.ok(s.colonies.every(n=>!n.queenKnown&&!E.cell(s,n.queenK).seen),`seed ${seed} construction does not reveal a queen`);
  }
});

test('0.6.4.1 UI keeps the map primary and exposes compact truthful campaign status',()=>{
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.match(html,/Prototype 0\.6\.4\.1/);assert.match(app,/戰役態勢/);assert.match(app,/敵后仍存/);assert.match(app,/消滅敵國/);assert.match(app,/enemyQueensAlive/);assert.doesNotMatch(app,/分兵功能/);
});

