const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,seconds)=>{for(let i=0;i<seconds*4&&!s.ended;i++)E.tick(s,.25);};
function quiet(seed=63101){const s=E.create(seed);s.events=[];s.speed=1;s.rivalPending=false;s.ants=s.ants.filter(a=>a.faction==='player');for(const n of s.colonies){n.birth=-999;n.food=0;}return s;}

test('selected soldiers enter the enemy nest, preserve the expedition command and can win',()=>{
  const s=quiet(),n=s.colonies.find(n=>n.role==='near'),entry=E.surfaceKey(E.xy(n.home).x,4),ids=E.workers(s).slice(0,8).map(a=>a.id);
  for(const other of s.colonies.filter(other=>other.id!==n.id))Object.assign(other,{queen:0,fallen:true,destroyed:true,alive:false});
  for(const a of E.workers(s).filter(a=>ids.includes(a.id))){a.caste='soldier';a.soldierType='normal';a.maxHp=40;a.hp=40;}
  E.cell(s,entry).seen=true;n.queen=12;const result=C.direct(s,ids,{kind:'enemyNest',k:entry,colony:n.id},entry);assert.equal(result.count,8);assert.match(result.text,/兵蟻 8 隻正在進入敵巢/);
  const group=s.groups.find(g=>g.command==='ENTER_ENEMY_NEST');assert.ok(group);assert.equal(group.queenId,n.id);advance(s,70);
  const alive=E.workers(s).filter(a=>ids.includes(a.id));assert.ok(alive.some(a=>!E.isSurface(s,a.k)));assert.ok(alive.every(a=>a.group===group.id||s.won));assert.ok(s.won);assert.ok(s.events.some(e=>/四個敵對蟻國/.test(e.text)));
});

test('an enemy nest expedition never substitutes workers for a selected non-soldier force',()=>{
  const s=quiet(),n=s.colonies[0],entry=E.key(E.xy(n.home).x,4),ids=E.laborers(s).slice(0,3).map(a=>a.id);E.cell(s,entry).seen=true;
  const result=C.direct(s,ids,{kind:'enemyNest',k:entry,colony:n.id},entry);assert.match(result.error,/至少選取一隻兵蟻/);assert.ok(E.laborers(s).filter(a=>ids.includes(a.id)).every(a=>a.job!=='combat'));
});

test('depleted food releases empty gatherers and sends returning carriers through the entrance',()=>{
  const s=quiet(),foods=s.resources.slice(0,2);for(const r of foods){r.known=true;E.cell(s,r.k).seen=true;}foods[0].amount=1;foods[1].amount=80;
  C.setGatherMode(s,foods[0].k,'large');advance(s,45);assert.equal(s.resources.includes(foods[0]),false);assert.equal(s.routes.some(r=>r.k===foods[0].k),false);
  const stranded=E.laborers(s).filter(a=>a.k===s.mainExit&&a.job==='forage'&&!a.carry);assert.equal(stranded.length,0);assert.ok(E.laborers(s).some(a=>a.job==='forage'&&s.routes.some(r=>r.id===a.route&&r.k===foods[1].k))||E.laborers(s,'idle').length>0);
});

test('mineral visual and interaction source finalize together after the last cargo is stored',()=>{
  const s=quiet(),k=E.key(10,12),c=E.cell(s,k);c.open=true;c.seen=true;c.deposit=.35;c.feature='深灰色異常碎屑';const a=E.laborers(s)[0];Object.assign(a,E.xy(k),{k});E.mine(s,k,1,[a.id]);
  advance(s,2);assert.equal(c.deposit,0);assert.equal(c.depositPending,true);assert.ok(s.miningTasks.some(t=>t.k===k&&t.status==='working'));
  advance(s,30);assert.equal(c.depositPending,false);assert.equal(c.feature,null);assert.equal(s.miningTasks.some(t=>t.k===k),false);assert.match(E.mine(s,k,1).error,/沒有可採掘/);
});

test('journal is capped at 35 and routine battle noise keeps one entry per zone',()=>{
  const s=quiet();for(let i=0;i<12;i++){s.time+=130;E.emit(s,'採集隊遭攻擊！',true,E.HOME);}assert.equal(s.events.filter(e=>e.category==='battle').length,1);
  const before=s.events.length;E.emit(s,'1 隻己方螞蟻陣亡，附近防線失去兵力。',true,E.HOME);assert.equal(s.events.length,before);assert.match(s.uiNotice.text,/己方螞蟻陣亡/);
  for(let i=0;i<60;i++){s.time+=130;E.emit(s,`主要敵國線索 ${i}`,true,E.HOME);}assert.ok(s.events.length<=35);
});

test('enemy nest entrance art and its label share one generous command target',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','world.js'),'utf8');
  assert.match(source,/kind=colony\?'enemyNest':'exit'/);assert.match(source,/radius:Math\.max\(30,scale\*\.42\)/);assert.match(source,/h:scale\*\.95/);
});

test('0.6.3.1 UI exposes truthful care, layer-aware threats, locations and complete reset',()=>{
  const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  assert.match(html,/Prototype 0\.6\.4/);assert.match(app,/目前無需額外照護/);assert.match(app,/sameQueenLayer/);assert.match(app,/重要地點/);assert.match(app,/function resetGame/);assert.doesNotMatch(app,/分兵功能/);assert.match(css,/\.threat-indicators button\{[^}]*min-height:44px/);
});
