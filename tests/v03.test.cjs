const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,t)=>{for(let i=0;i<t*4;i++)E.tick(s,.25);};
const peaceful=()=>{const s=E.create(72419);s.ants=E.workers(s);s.food=1000;return s;};

test('surface expands north south east and west as one navigable plane',()=>{
 const s=peaceful(),targets=[E.surfaceKey(34,2),E.surfaceKey(-3,2),E.surfaceKey(8,-3),E.surfaceKey(8,7)];for(const k of targets){assert.ok(E.expandToward(s,k));assert.ok(E.isSurface(s,k));assert.ok(E.path(s,s.mainExit,k));}const b=E.bounds(s,true);assert.ok(b.minX<0&&b.maxX>31&&b.minY<0&&b.maxY>4);
});

test('surface height uses climbable links and raised resources remain reachable',()=>{
 const s=peaceful();E.expandToward(s,E.surfaceKey(34,2));const raised=s.resources.find(r=>E.cell(s,r.k)?.elevation>0);assert.ok(raised);assert.ok(E.cell(s,raised.k).climb);assert.ok(E.path(s,s.mainExit,raised.k));const here=E.cell(s,E.surfaceKey(32,0)),next=E.cell(s,E.surfaceKey(33,0));Object.assign(here,{open:true,elevation:0,climb:false});Object.assign(next,{open:true,elevation:2,climb:false});assert.ok(!E.neighbors(s,here.k).includes(next.k));
});

test('selected ants always receive a direct exploration order on new surface ground',()=>{
 const s=peaceful(),ids=E.workers(s).slice(0,3).map(a=>a.id),k=E.surfaceKey(8,-3),r=C.direct(s,ids,{kind:'ground'},k);assert.equal(r.count,3);assert.equal(r.text,'開始探索');assert.ok(ids.every(id=>E.workers(s).find(a=>a.id===id).primary?.kind==='group'));
});

test('care and excavation cannot steal carrying or player-commanded ants',()=>{
 const s=peaceful(),a=s.ants[0],b=s.ants[1],brood=s.broods[0];a.carry=2;C.release(b,'combat');b.primary={kind:'group',group:'chosen'};const jobs=[a.job,b.job];assert.equal(C.care(s,brood.id,1).error,'目前沒有可調派工蟻。');assert.deepEqual([a.job,b.job],jobs);const p=E.project(s,E.key(8,12),'down',5,3);assert.ok(!p.error);assert.ok(![a.id,b.id].some(id=>E.workers(s,'dig').some(x=>x.id===id)));
});

test('a carrying ant finishes delivery before a new direct command',()=>{
 const s=peaceful(),a=s.ants[0],food=s.resources[0];E.cell(s,food.k).seen=true;C.release(a,'forage');E.assignFood(s,a,food);Object.assign(a,E.xy(food.k),{k:food.k,carry:2});const r=C.order(s,[a.id],E.key(8,10));assert.equal(r.count,1);assert.equal(a.job,'forage');assert.ok(a.pending);advance(s,25);assert.equal(a.carry,0);assert.equal(a.pending,null);assert.equal(a.job,'idle');
});

test('natural excavation trends downward while bending around local soil',()=>{
 const s=peaceful(),start=E.key(8,12);for(let y=13;y<23;y++)for(let x=3;x<14;x++)Object.assign(E.cell(s,E.key(x,y)),{open:false,seen:true,feature:null,hard:false,deposit:0,layer:'表土'});const p=E.project(s,start,'down',4,8);advance(s,130);const opened=s.cells.filter(c=>c.open&&c.y>=13&&c.y<23&&c.x>=3&&c.x<14);assert.equal(p.status,'stopped');assert.ok(Math.max(...opened.map(c=>c.y))>13);assert.ok(new Set(opened.map(c=>c.x)).size>1);
});

test('live insect fights, dies once, and becomes a harvestable carcass',()=>{
 const s=peaceful(),k=s.mainExit,w={id:s.nextId++,k,...E.xy(k),hp:2,maxHp:24,kind:'甲蟲',action:'活動中',cooldown:0,dead:false,height:0};s.wildlife.push(w);for(const a of s.ants.slice(0,4))Object.assign(a,E.xy(k),{k});const ids=s.ants.slice(0,4).map(a=>a.id);assert.equal(C.direct(s,ids,{kind:'wildlife',id:w.id},k).count,4);advance(s,3);assert.ok(w.dead);assert.equal(s.resources.filter(r=>r.name==='甲蟲屍體').length,1);assert.equal(C.direct(s,ids,{kind:'deadQueen'},k).error,'敵方蟻后已死亡，敵巢正在瓦解。');
});

test('injured ants slow down, heavy injuries retreat, and nest rest restores health',()=>{
 const s=peaceful(),a=s.ants[0];a.hp=a.maxHp*.25;a.k=E.key(8,10);Object.assign(a,E.xy(a.k));C.release(a,'combat');E.tick(s,.25);assert.ok(a.retreat>0);assert.match(a.action,/重傷|撤退/);a.k=E.HOME;Object.assign(a,E.xy(a.k));a.retreat=0;const hp=a.hp;advance(s,5);assert.ok(a.hp>hp);
});

test('dead enemy queen rejects combat and collapse milestone remains in history',()=>{
 const s=peaceful(),n=s.colonies[0];n.queen=0;n.fallen=true;s.milestones.firstEnemyNest=s.time;const r=C.direct(s,[s.ants[0].id],{kind:'deadQueen',colony:0},n.queenK);assert.ok(r.error);assert.equal(n.fallen,true);
});
