const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const C=require('../interaction.js');

const advance=(s,seconds)=>{for(let i=0;i<seconds*4&&!s.ended;i++)E.tick(s,.25);};
const quiet=(seed=63001)=>{const s=E.create(seed);s.ants=E.workers(s);s.food=500;s.colonies.forEach(n=>{n.fallen=true;n.destroyed=true;n.alive=false;n.queen=0;});s.won=true;for(const a of E.laborers(s))C.release(a);return s;};

test('mineral work reports real assignment and completes only after delivery',()=>{
  const s=quiet(),a=E.laborers(s)[0],k=E.key(8,12),c=E.cell(s,k);for(let y=9;y<=12;y++){const p=E.cell(s,E.key(8,y));p.open=true;p.seen=true;p.hard=false;}Object.assign(c,{deposit:1,open:true,seen:true});
  const r=E.mine(s,k,1,[a.id]),task=r.task;assert.equal(task.state,E.TASK.ASSIGNED);assert.deepEqual(task.assignedWorkers,[a.id]);
  let sawTravel=false,sawWorking=false,sawReturn=false;for(let i=0;i<160&&s.miningTasks.includes(task);i++){E.tick(s,.25);sawTravel||=task.state===E.TASK.TRAVEL;sawWorking||=task.state===E.TASK.WORKING;sawReturn||=[E.TASK.CARRYING,E.TASK.RETURNING,E.TASK.DELIVERING].includes(task.state);}
  assert.ok(sawTravel&&sawWorking&&sawReturn);assert.equal(c.deposit,0);assert.ok(s.minerals>0);assert.equal(a.mineralCargo,0);assert.ok(!s.miningTasks.includes(task));
});

test('an unreachable queued route becomes BLOCKED instead of claiming travel',()=>{
  const s=quiet(),k=E.key(35,40);E.ensureChunk(s,35,40);const c=E.cell(s,k);c.open=true;c.seen=true;s.resources.push({k,name:'隔絕食物',amount:20,max:20,type:'seed',known:true,depletedAt:null});const route={id:s.nextId++,k,active:true,mode:'small',desired:1,state:E.TASK.WAITING,createdAt:s.time,lastProgressAt:s.time};s.routes.push(route);E.tick(s,.25);assert.equal(route.assignedWorkers.length,0);assert.equal(route.state,E.TASK.BLOCKED);assert.match(route.blockedReason,/無法抵達/);
});

test('queen corpse decreases at pickup and cargo survives the surface entrance',()=>{
  const s=quiet(63002);while(E.laborers(s).length<18)s.ants.push(E.ant(s,'player',E.HOME));const k=E.surfaceKey(8,2),corpse={k,name:'敵方蟻后遺骸',amount:30,max:30,type:'queen',prey:true,large:true,queenCorpse:true,freshness:100,known:true,depletedAt:null};s.resources.push(corpse);for(let y=2;y<=4;y++){const c=E.cell(s,E.surfaceKey(8,y));c.open=true;c.seen=true;}const result=C.setGatherMode(s,k,'queen');assert.ok(result.assigned>0);const start=corpse.amount;let carrier=null,sawSurfaceCargo=false;for(let i=0;i<400&&s.food<501;i++){E.tick(s,.25);carrier=E.laborers(s).find(a=>a.cargoTask&&a.carry>0)||carrier;if(carrier&&E.isSurface(s,carrier.k))sawSurfaceCargo=true;}assert.ok(corpse.amount<start);assert.ok(sawSurfaceCargo);assert.ok(s.food>500);assert.ok(!carrier||carrier.carry===0||carrier.cargoTask!==null);
});

test('journal repeats are silent and the permanent list stays bounded',()=>{
  const s=quiet();const before=s.events.length;for(let i=0;i<10;i++){s.time+=2;E.emit(s,'採集隊遭攻擊！',true,E.HOME);}assert.equal(s.events.length,before+1);assert.equal(s.events[0].repeat,10);assert.doesNotMatch(s.events[0].text,/重複|更新/);for(let i=0;i<80;i++){s.time+=130;E.emit(s,`主要敵國線索 ${i}`,true,E.HOME);}assert.ok(s.events.length<=45);
});

test('0.6.3 removes permanent build and nest-count UI and uses semantic compact threats',()=>{
  const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');assert.match(html,/Prototype 0\.6\.4/);assert.doesNotMatch(html,/id="buildButton"/);assert.doesNotMatch(app,/王巢.*<strong>1/);assert.match(app,/西側採集區/);assert.match(app,/東側森林/);assert.match(app,/主巢入口/);assert.match(app,/王室附近/);assert.match(css,/threat-indicators/);
});

test('WASD camera signs match screen directions',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');assert.match(app,/keys\.has\('a'\).*world\.pan\(cameraSpeed,0\)/);assert.match(app,/keys\.has\('d'\).*world\.pan\(-cameraSpeed,0\)/);assert.match(app,/keys\.has\('w'\).*world\.pan\(0,cameraSpeed\)/);assert.match(app,/keys\.has\('s'\).*world\.pan\(0,-cameraSpeed\)/);
});
