const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,t)=>{for(let i=0;i<t*4;i++)E.tick(s,.25);};
const quiet=()=>{const s=E.create(4024);s.ants=E.workers(s);s.food=300;s.colonies.forEach(n=>{n.fallen=true;n.destroyed=true;n.alive=false;n.queen=0;});s.won=true;for(const a of s.ants)C.release(a);return s;};

test('0.3 state migrates to functional-room and caste data without moving ants',()=>{
 const s=E.create();s.version=3;delete s.rooms;const positions=s.ants.map(a=>a.k),r=E.restore(E.serialize(s));assert.equal(r.version,12);assert.deepEqual(r.ants.map(a=>a.k),positions);assert.ok(Array.isArray(r.rooms));assert.ok(r.ants.every(a=>a.caste));
});

test('functional chamber occupies real space while nearby requests are automatically moved apart',()=>{
 const s=quiet(),room=E.buildRoom(s,E.HOME,'nursery');assert.ok(!room.error);assert.ok(room.cells.length>=4);const store=E.buildRoom(s,E.key(10,9),'store');assert.ok(!store.error);assert.ok(E.distance(E.xy(room.k),E.xy(store.k))>=4);advance(s,80);assert.equal(room.status,'active');assert.ok(s.events.some(e=>e.text.includes('育幼巢形成')));
});

test('room expansion requires surrounding space and increases its practical capacity',()=>{
 const s=quiet(),room=E.buildRoom(s,E.HOME,'store');advance(s,25);const before=E.foodCapacity(s);for(let y=7;y<=11;y++)for(let x=6;x<=10;x++){const c=E.cell(s,E.key(x,y));if(c){c.open=true;c.seen=true;c.hard=false;}}const result=E.expandRoom(s,room.id);assert.ok(!result.error);advance(s,35);assert.equal(room.size,2);assert.ok(E.foodCapacity(s)>before);
});

test('military and mutation chambers turn configured brood into repeatable soldier castes',()=>{
 const s=quiet();s.rooms.push({id:900,k:E.HOME,type:'military',cells:[E.HOME],size:1,status:'active',progress:100,maturity:30,use:0},{id:901,k:E.key(6,10),type:'mutation',cells:[E.key(6,10)],size:1,status:'active',progress:100,maturity:30,use:0});s.shells=100;s.minerals=100;
 const armor=s.broods[0];Object.assign(armor,{stage:2,progress:31.99,breed:'armor',feed:'protein',add:'shell'});const acid=s.broods[1];Object.assign(acid,{stage:2,progress:31.99,breed:'acid',add:'mineral'});E.tick(s,.25);assert.ok(E.soldiers(s,'armor').length>=armor.count);assert.ok(E.soldiers(s,'acid').length>=acid.count);
});

test('large prey is separated into strategic materials when a processing chamber exists',()=>{
 const s=quiet(),a=s.ants[0];s.rooms.push({id:902,k:E.key(6,10),type:'prey',cells:[E.key(6,10)],size:1,status:'active',progress:100,maturity:0,use:0});Object.assign(a,{k:E.HOME,x:E.xy(E.HOME).x,y:E.xy(E.HOME).y,carry:10,prey:true,largePrey:true,shellCarry:2});const food=s.food;advance(s,8);assert.ok(s.protein>0&&s.tissues>0&&s.shells>2);assert.ok(s.food>food);
});

test('processed high protein is consumed by high-protein larval feeding',()=>{
 const s=quiet(),b=s.broods[0];s.protein=10;Object.assign(b,{stage:1,progress:0,feed:'protein'});const before=s.protein;E.tick(s,.25);assert.ok(s.protein<before);assert.ok(b.pred>0);
});

test('marked resources recruit idle labor automatically and stopping releases empty carriers',()=>{
 const s=quiet(),r=s.resources[0];E.cell(s,r.k).seen=true;C.gather(s,r.k);for(const a of E.laborers(s,'forage'))C.release(a);E.tick(s,.25);assert.ok(E.laborers(s,'forage').filter(a=>a.route===s.routes[0].id).length>=1);const stopped=C.stopGather(s,r.k);assert.ok(stopped.count>=1);assert.equal(s.routes[0].active,false);
});

test('extreme breeding and mutation raise the chance of rare individuals without fixed intervals',()=>{
 const s=quiet();s.rooms.push({id:903,k:E.HOME,type:'mutation',cells:[E.HOME],size:2,status:'active',progress:100,maturity:80,use:0});s.broods=Array.from({length:18},(_,i)=>({...s.broods[0],id:1000+i,count:5,stage:2,progress:31.999,pred:1,min:1,shell:1,genetics:1.2}));E.tick(s,.25);assert.ok(E.workers(s).some(a=>a.special));assert.ok(s.events.some(e=>e.text.includes('特殊個體羽化')));
});

test('nest title is derived from population, usable rooms, and excavated space',()=>{
 const s=quiet();while(E.workers(s).length<20)s.ants.push(E.ant(s,'player',E.HOME));for(let y=5;y<=13;y++)for(let x=4;x<=10;x++){const c=E.cell(s,E.key(x,y));if(c){c.open=true;c.seen=true;c.sealed=false;}}s.rooms.push({id:904,k:E.HOME,type:'nursery',cells:[E.HOME],size:1,status:'active',progress:100,maturity:20,use:0},{id:905,k:E.key(5,11),type:'store',cells:[E.key(5,11)],size:1,status:'active',progress:100,maturity:20,use:0});assert.equal(E.nestStage(s),'主巢');E.tick(s,.25);assert.equal(s.nestStage,'主巢');
});

test('rest chamber accelerates recovery for an ant occupying its real footprint',()=>{
 const base=quiet(),resting=E.restore(E.serialize(base)),homeAnt=E.workers(base)[0],roomAnt=E.workers(resting)[0],restK=E.key(6,10);homeAnt.hp=roomAnt.hp=3;homeAnt.k=E.HOME;Object.assign(homeAnt,E.xy(E.HOME));roomAnt.k=restK;Object.assign(roomAnt,E.xy(restK));resting.rooms.push({id:906,k:restK,type:'rest',cells:[restK],size:2,status:'active',progress:100,maturity:100,use:0});E.tick(base,1);E.tick(resting,1);assert.ok(roomAnt.hp-3>homeAnt.hp-3);
});



