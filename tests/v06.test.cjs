const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,seconds)=>{for(let i=0;i<seconds*4;i++)E.tick(s,.25);};

test('first campaign has hard terrain bounds and a persistent 3x setting',()=>{
  const s=E.create(61234),before=s.cells.length;s.speed=3;
  assert.equal(E.ensureChunk(s,40,20),false);assert.equal(E.ensureSurfaceChunk(s,48,4),false);
  assert.equal(E.expandToward(s,E.key(40,20)),false);assert.equal(s.cells.length,before);
  E.emit(s,'敵蟻接近巢口',true);E.tick(s,.25);assert.equal(s.speed,3);
});

test('a mined fragment is unavailable until its worker delivers it',()=>{
  const s=E.create(61235);s.ants=E.workers(s);s.colonies[0].fallen=true;s.food=100;
  const a=E.laborers(s)[0],k=E.key(8,10),c=E.cell(s,k);Object.assign(a,E.xy(k),{k});Object.assign(c,{seen:true,open:true,deposit:.5});
  const result=E.mine(s,k,1,[a.id]);assert.equal(result.count,1);
  advance(s,3);assert.equal(c.deposit,0);assert.equal(s.minerals,0);assert.ok(a.mineralCargo>0);
  advance(s,5);assert.ok(s.minerals>0);assert.equal(a.mineralCargo,0);assert.equal(s.miningTasks.length,0);
});

test('a completed royal room moves the queen and later eggs to the new core',()=>{
  const s=E.create(61236);s.ants=E.workers(s);s.food=200;
  const royal={id:s.nextId++,k:E.key(8,12),type:'royal',cells:[E.key(8,12)],size:1,targetSize:1,status:'active',progress:100,maturity:0,policy:'balanced'};
  s.rooms.push(royal);s.royalTarget=royal.id;advance(s,25);
  assert.equal(s.queenK,royal.k);assert.equal(s.royalTarget,null);
  assert.ok(E.workers(s,'guard').some(a=>a.guardTarget===royal.k&&E.distance(a,E.xy(royal.k))<2));
  advance(s,45);assert.ok(s.broods.some(b=>b.k===royal.k));
});

test('the 0.6 interface has direct RTS selection and no blocking unit toolbar',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.match(html,/Prototype 0\.6/);assert.doesNotMatch(html,/id="selectionBar"/);assert.match(html,/id="result"/);
  const s=E.create(61237),a=E.laborers(s)[0],k=E.key(8,10);
  assert.equal(C.direct(s,[a.id],{kind:'ground',k},k).count,1);
  assert.equal(E.laborers(s).filter(w=>w.playerLocked).length,1);
});

test('a working military chamber gradually supplies ordinary soldiers without repeated brood confirmation',()=>{
  const s=E.create(61238);s.food=120;
  s.rooms.push({id:s.nextId++,k:E.key(11,9),type:'military',cells:[E.key(11,9)],size:1,targetSize:1,status:'active',progress:100,maturity:0,use:0,policy:'balanced',lastGrowth:0});
  s.eggsClock=47.75;E.tick(s,.25);
  assert.equal(s.broods.at(-1).breed,'soldier');
  advance(s,112);
  assert.ok(E.soldiers(s).length>=2);
});
