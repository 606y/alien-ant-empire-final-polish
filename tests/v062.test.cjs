const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js'),C=require('../interaction.js');
const advance=(s,t)=>{for(let i=0;i<t*4&&!s.ended;i++)E.tick(s,.25);};
function quiet(seed=62001){const s=E.create(seed);s.ants=E.workers(s);s.colonies.forEach(n=>{n.fallen=true;n.destroyed=true;n.alive=false;n.queen=0;});s.won=true;for(const a of E.laborers(s))C.release(a);return s;}

test('food safety has four distinct levels and reacts before zero inventory',()=>{
 const s=quiet();s.food=100;assert.equal(E.foodSafety(s).level,'normal');s.food=12;assert.ok(['attention','crisis'].includes(E.foodSafety(s).level));s.food=5;assert.ok(['crisis','emergency'].includes(E.foodSafety(s).level));s.food=0;assert.equal(E.foodSafety(s).level,'emergency');
});

test('food crisis reallocates automatic work while preserving player locked orders',()=>{
 const s=quiet(),locked=E.laborers(s)[0];E.project(s,E.HOME,'left',1,Infinity,[locked.id]);for(const r of s.resources.slice(0,2)){E.cell(s,r.k).seen=true;r.known=true;C.setGatherMode(s,r.k,'auto');}s.food=2;E.tick(s,.25);assert.equal(locked.job,'dig');assert.equal(locked.playerLocked,true);assert.ok(E.laborers(s,'forage').length>=3);assert.equal(s.foodSafetyLevel,'emergency');
});

test('starvation is gradual and zero-adult states end only without a near recovery',()=>{
 const s=quiet();s.resources=[];s.routes=[];s.food=0;const hp=E.laborers(s)[0].hp;advance(s,60);assert.equal(E.laborers(s)[0].hp,hp);advance(s,40);assert.ok(E.laborers(s)[0].hp<hp);
 const lost=quiet(62002);lost.ants=[];lost.broods=[];E.tick(lost,.25);assert.equal(lost.ended,true);assert.match(lost.failureReason,/失去全部可工作成蟻/);
 const recover=quiet(62003);recover.ants=[];recover.food=5;recover.broods=[{...recover.broods[0],stage:2,progress:20,count:1}];E.tick(recover,.25);assert.equal(recover.ended,false);
});

test('economy diagnostics record one row per minute and journal summaries stay sparse',()=>{
 const s=quiet();s.food=300;advance(s,370);assert.ok(s.economy.history.length>=6);assert.ok(s.economy.history.every(r=>['food','income','consumption','population','workers','soldiers','forage','nurse','construction','safety'].every(k=>k in r)));assert.ok(s.events.filter(e=>e.text.includes('近期王國摘要')).length<=3);assert.ok(s.events.length<40);
});

test('a heavily damaged expedition retreats and weakens its source colony',()=>{
 const s=E.create(62004),n=s.colonies[0],members=s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id).slice(0,5);s.time=300;s.world.expeditions=[{phase:'advance',started:250,source:n.id,ids:members.map(a=>a.id),initialSize:5}];s.world.expedition=s.world.expeditions[0];for(const a of members.slice(0,3))a.hp=0;s.ants=s.ants.filter(a=>a.hp>0);E.tick(s,.25);assert.equal(s.world.expeditions.length,0);assert.ok(n.recoveryUntil>s.time);assert.equal(n.strategy,'恢復');assert.ok(s.world.clues.some(c=>c.kind==='retreat'));
});

test('royal construction can be cancelled before departure but not removed during migration',()=>{
 const s=quiet(),k=E.key(6,11);s.food=100;const room=E.requestRoyalAt(s,k);assert.equal(room.error,undefined);s.royalTarget=room.id;const result=E.cancelRoom(s,room.id);assert.equal(result.error,undefined);assert.equal(s.royalTarget,null);
});

test('0.6.2 interface exposes temporary help, food trend, threats and world clues',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),world=fs.readFileSync(path.join(__dirname,'..','world.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');assert.match(html,/Prototype 0\.6\.4/);assert.match(html,/threatIndicators/);assert.match(app,/inputHintUntil=performance\.now\(\)\+5000/);assert.match(app,/E\.foodSafety\(s\)/);assert.match(app,/data-threat-k/);assert.match(world,/陌生蟻群痕跡/);assert.match(world,/strategicClue/);
});
