
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const E=require('../engine.js'),root=path.resolve(__dirname,'..'),world=fs.readFileSync(path.join(root,'world.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
 const calls=[];const ctx=new Proxy({createPattern(image){const p={setTransform(m){p.matrix=m},image};calls.push(['pattern',image.src]);return p},measureText:t=>({width:t.length*7}),createRadialGradient(){return {addColorStop(){}}}},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
 class Image{constructor(){this.naturalWidth=512;this.naturalHeight=512}set src(p){this._src=p;queueMicrotask(()=>this.onload?.())}get src(){return this._src}}
 class DOMMatrix{translate(x,y){this.x=x;this.y=y;return this}scale(s){this.s=s;return this}}
 const scope={window:{AntEngine:E},Image,DOMMatrix,devicePixelRatio:1,performance:{now:()=>0}};vm.runInNewContext(world,scope);
 const canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:600})};
 return {w:new scope.window.AntWorld(canvas),calls};
}
test('V9 gameplay backgrounds use existing natural textures, never V8 painted scenes',async()=>{
 const {w}=setup();await w.loadV8();const paths=Object.values(w.v8ImageCache).map(i=>i.src);
 assert.equal(paths.length,33);
 for(const forbidden of ['nest_world_v8','surface_battle_world_v8','nest_ground_v8.jpg','surface_ground_v8.jpg','nest_unexplored_v8.jpg','surface_unexplored_v8.jpg'])assert.ok(!paths.some(p=>p.includes(forbidden)));
 assert.ok(paths.includes('assets/v7/world/textures/nest_soil_tile.svg'));assert.ok(paths.includes('assets/v7/world/textures/surface_ground_tile.svg'));
 assert.doesNotMatch(world,/assets\/v8\/rooms\/|v8\/world\/tiles\//);
});
test('corridor edges come only from open seen passable underground neighbors, including branches',()=>{
 const s=E.create(91022),{w}=setup(),{nodes,edges}=w.corridors(s),pair=new Set();
 for(const {a,b}of edges){const ak=a.k??E.key(a.x,a.y),bk=b.k??E.key(b.x,b.y);assert.ok(a.open&&b.open&&a.seen&&b.seen);assert.ok(E.neighbors(s,ak).includes(bk));assert.ok(!E.isSurface(s,a)&&!E.isSurface(s,b));const key=[String(ak),String(bk)].sort().join('|');assert.ok(!pair.has(key));pair.add(key);}
 assert.ok(nodes.some(n=>n.x===8&&n.y===9));assert.ok(edges.length>5);
 const first=edges[0],k=first.b.k??E.key(first.b.x,first.b.y),before=edges.length;first.b.sealed=true;assert.ok(w.corridors(s).edges.length<before);first.b.sealed=false;
});
test('chamber geometry follows actual room center and size; maturity changes no footprint',()=>{
 const s=E.create(91023),{w,calls}=setup(),room={id:999,type:'nursery',k:E.key(8,9),size:2,maturity:0,status:'active'};s.rooms.push(room);
 const footprint=w.roomRadius(room);calls.length=0;w.nestGeometry(s);assert.ok(calls.some(c=>c[0]==='ellipse'&&c[1]===8&&c[2]===9&&c[3]===footprint));room.maturity=100;assert.equal(w.roomRadius(room),footprint);
 room.k=E.key(0,15);assert.ok(!E.cell(s,room.k).open);calls.length=0;w.nestGeometry(s);assert.ok(!calls.some(c=>c[0]==='ellipse'&&c[1]===0&&c[2]===15));
});
test('facing follows right, down, left and up motion; stopping preserves last angle',()=>{
 const s=E.create(91024),{w}=setup(),a=E.workers(s)[0];a.k=E.key(8,9);a.x=8;a.y=9;a.path=[];a.action='停留';
 w.facing(s,a);a.x=8.5;assert.equal(w.facing(s,a),0);a.y=9.5;assert.ok(Math.abs(w.facing(s,a)-Math.PI/2)<1e-10);a.x=8;assert.ok(Math.abs(w.facing(s,a)-Math.PI)<1e-10);a.y=9;assert.ok(Math.abs(w.facing(s,a)+Math.PI/2)<1e-10);assert.ok(Math.abs(w.facing(s,a)+Math.PI/2)<1e-10);
});
test('attack facing points at reachable target; blocked targets do not fake attack direction',()=>{
 const s=E.create(91025),{w}=setup(),a=E.workers(s)[0],b=s.ants.find(x=>x.faction==='enemy');a.k=E.key(8,9);a.x=8;a.y=9;a.path=[];a.action='戰鬥';a.traits.acid=0;b.k=E.key(9,9);b.x=9;b.y=9;s.ants=[a,b];assert.equal(w.facing(s,a),0);b.k=E.key(7,9);b.x=7;b.y=9;assert.ok(Math.abs(w.facing(s,a)-Math.PI)<1e-10);E.cell(s,b.k).sealed=true;assert.equal(w.attackTarget(s,a),null);
});
test('actual terrain and resource cells publish props at the same world coordinates',async()=>{
 const s=E.create(91026),{w}=setup();await w.loadV8();w.home('surface');const k=E.key(9,1),tile=E.cell(s,k);tile.seen=true;tile.open=false;tile.terrain='rock';
 const marks=[];w.prop=(name,x,y)=>marks.push({name,x,y});w.draw(s);
 const p=w.screen(tile.x,tile.y,tile.elevation||0);assert.ok(marks.some(m=>m.name==='rock'&&m.x===p.x&&m.y===p.y));
 const r=s.resources.find(x=>x.amount>0&&E.isSurface(s,x.k));const rc=E.cell(s,r.k);rc.seen=true;w.focus(r.k,'surface');marks.length=0;w.draw(s);const rp=E.xy(r.k),v=w.screen(rp.x,rp.y,r.height??rc.elevation??0);assert.ok(marks.some(m=>m.x===v.x&&m.y===v.y));
});
test('queen and brood visuals and targets use their actual world centers',()=>{
 const s=E.create(91027),{w}=setup(),queen=[];w.ant=(x,y,size,color,angle,a,isQueen,key)=>{if(isQueen&&key==='units/player/queen')queen.push({x,y})};w.draw(s);const qp=E.xy(s.queenK),q=w.screen(qp.x,qp.y);assert.equal(queen[0].x,q.x);assert.equal(queen[0].y,q.y);const b=s.broods[0],bp=E.xy(b.k??E.HOME),v=w.screen(bp.x,bp.y);assert.ok(w.targets.some(t=>t.kind==='brood'&&t.x===v.x&&t.y===v.y));
});
test('camera, mobile gestures, save keys and gameplay fingerprints stay fixed',()=>{
 assert.match(html,/world.js\?v=assets-v9-world-geometry/);const app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.match(app,/},430\)/);assert.match(app,/alien-ant-empire-v0641/);
 for(const [p,expected]of [['engine.js','436ebb5a4184bdab850cb89dc9741a85aca822fca406da12880e87df7670d858'],['interaction.js','587b19cf04d9c355c4f4af6850a8239baf559ba74f1fc7c1f19a6f41c73179d4']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'),expected);
 const fp=re=>crypto.createHash('sha256').update((world.match(re)||[]).join('|')).digest('hex');assert.equal(fp(/^    (?:home|focus|zoom|pan|screen|position)\([^\n]+/gm),'e93b6ffd8d46296f4c28f33bb7199255e8759fc47722b7272ffaf98c4d309267');
});



