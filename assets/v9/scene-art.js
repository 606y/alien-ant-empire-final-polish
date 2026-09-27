/* Original V9 scene art. Original generated atlases and procedural geometry; no simulation writes. */
(function(root){
'use strict';
const E=root.AntEngine,TAU=Math.PI*2;
const palettes={
 player:{dark:'#141b1a',mid:'#343d34',light:'#ad9155',edge:'#ceb477',glow:'#e7b551',flag:'#943a34'},
 near:{dark:'#1c172c',mid:'#483456',light:'#987cae',edge:'#bc9cda',glow:'#ab7ff2',flag:'#6f438c'},
 hunter:{dark:'#112d31',mid:'#28616a',light:'#77afa5',edge:'#a5d2bc',glow:'#6be1c3',flag:'#317989'},
 armored:{dark:'#3e3529',mid:'#a08e6b',light:'#e1d2ad',edge:'#fff0c9',glow:'#cfa96c',flag:'#98703d'},
 deep_forest:{dark:'#1f2920',mid:'#50603b',light:'#95a165',edge:'#b3c186',glow:'#b2d372',flag:'#63734a'}
};
const hash=(x,y=0)=>{let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
const oval=(c,x,y,rx,ry,color,angle=0)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fill()};
const line=(c,points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()};
function shade(c,x,y,r,light,mid,dark){const g=c.createRadialGradient(x-r*.35,y-r*.45,r*.04,x,y,r);g.addColorStop(0,light);g.addColorStop(.47,mid);g.addColorStop(1,dark);return g}
function pebble(c,x,y,r,seed=1,color='#766754'){
 c.save();c.translate(x,y);c.rotate(hash(seed,3)*TAU);c.fillStyle=shade(c,0,-r*.1,r,'#a19377',color,'#302b25');c.beginPath();
 for(let i=0;i<7;i++){const a=i/7*TAU,d=r*(.65+hash(seed,i)*.35);i?c.lineTo(Math.cos(a)*d,Math.sin(a)*d*.65):c.moveTo(Math.cos(a)*d,Math.sin(a)*d*.65)}c.closePath();c.fill();c.restore();
}
function leaf(c,x,y,len,angle,color,light='#8c9a5b'){
 c.save();c.translate(x,y);c.rotate(angle);const g=c.createLinearGradient(0,-len*.3,0,len*.3);g.addColorStop(0,light);g.addColorStop(.4,color);g.addColorStop(1,'#182c20');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(len*.35,-len*.42,len*.8,-len*.22,len,0);c.bezierCurveTo(len*.6,len*.32,len*.2,len*.3,0,0);c.fill();line(c,[[0,0],[len*.84,0]],'#b1ab6a55',Math.max(.006,len*.018));c.restore();
}
const atlases={};
const ready=Promise.all(['facilities','objects','ant-bodies','player-castes','enemy-castes','wildlife','enemy-facilities'].map(name=>new Promise(resolve=>{const im=new Image();im.onload=()=>{atlases[name]=im;resolve()};im.onerror=()=>resolve();im.src='assets/'+(['enemy-castes','wildlife','enemy-facilities'].includes(name)?'v9.1/':'v9/')+name+'.png'})));
const crops=new Map();
function atlasCell(name,index,cols,rows){const im=atlases[name];if(!im)return null;const key=name+index;if(crops.has(key))return crops.get(key);const w=im.width/cols,h=im.height/rows,x=Math.round(index%cols*w),y=Math.round(Math.floor(index/cols)*h),sw=Math.floor(w),sh=Math.floor(h);const a=document.createElement('canvas');a.width=sw;a.height=sh;const g=a.getContext('2d');g.drawImage(im,x,y,sw,sh,0,0,sw,sh);const d=g.getImageData(0,0,sw,sh).data;let left=sw,top=sh,right=0,bottom=0;for(let yy=0;yy<sh;yy++)for(let xx=0;xx<sw;xx++)if(d[(yy*sw+xx)*4+3]>18){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy)}const cell={im,x:x+left,y:y+top,w:right-left+1,h:bottom-top+1};crops.set(key,cell);return cell;}
function stamp(c,cell,x,y,w,h){c.drawImage(cell.im,cell.x,cell.y,cell.w,cell.h,x-w/2,y-h/2,w,h)}
class SceneArt{
 constructor(world){this.world=world;this.ready=ready;this.textures={};this.patterns={};this.objects=new Map();this.bodies=new Map();this.motion=new WeakMap();this.state=null;this.clock=0;this.caveCache=null;this.metrics={bodyBuilds:0,propBuilds:0,caveBuilds:0};ready.then(()=>{this.bodies.clear();this.objects.clear()});}
 texture(kind){
  if(this.textures[kind])return this.textures[kind];
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),img=c.createImageData(256,256),a=img.data;
  const smooth=(x,y,n)=>{const gx=x/n,gy=y/n,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),h=(xx,yy)=>hash(((xx% (256/n))+(256/n))%(256/n)+19,((yy%(256/n))+(256/n))%(256/n)+71);return h(ix,iy)*(1-u)*(1-v)+h(ix+1,iy)*u*(1-v)+h(ix,iy+1)*(1-u)*v+h(ix+1,iy+1)*u*v};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const grain=hash(x,y),n=smooth(x,y,32)*.38+smooth(x,y,8)*.27+grain*.35,moss=smooth(x,y,64);
   let rgb;if(kind==='surface'){const m=Math.max(0,(moss-.39)*2.2);rgb=[100+n*39-m*41,84+n*34-m*9,56+n*27-m*16]}else if(kind.startsWith('floor'))rgb=[91+n*47,66+n*36,42+n*23];else rgb=[40+n*36,32+n*27,24+n*18];
   if(kind.includes('near'))rgb=[rgb[0]*.72,rgb[1]*.65,rgb[2]*1.3];if(kind.includes('hunter'))rgb=[rgb[0]*.58,rgb[1]*1.05,rgb[2]*1.15];if(kind.includes('armored'))rgb=[rgb[0]*1.4,rgb[1]*1.38,rgb[2]*1.3];if(kind.includes('deep_forest'))rgb=[rgb[0]*.78,rgb[1]*1.1,rgb[2]*.78];const i=(y*256+x)*4;for(let z=0;z<3;z++)a[i+z]=rgb[z];a[i+3]=255;
  }c.putImageData(img,0,0);
  // Small mineral flecks and organic litter are embedded material, never resources.
  for(let i=0;i<600;i++){const x=hash(i,12)*256,y=hash(i,52)*256,r=.3+hash(i,80)*1.1;oval(c,x,y,r,r*.5,i%3?'#e0bc7c0b':'#0c160f18')}
  this.textures[kind]=canvas;return canvas;
 }
 pattern(c,kind,span,ox=0,oy=0){
  const key=kind;let p=this.patterns[key];if(!p){p=c.createPattern(this.texture(kind),'repeat');this.patterns[key]=p}
  p.setTransform(new DOMMatrix().translate(ox,oy).scale(span/256));return p;
 }
 ground(w,h,ox,oy,scale,view){
  const c=this.world.ctx,nation=this.state?.colonies.find(n=>n.id===this.world.nestId)?.role;c.fillStyle=this.pattern(c,view==='surface'?'surface':nation?'soil-'+nation:'soil',scale*5,ox,oy);c.fillRect(0,0,w,h);
  const minX=Math.floor(-ox/scale)-1,maxX=Math.ceil((w-ox)/scale)+1,minY=Math.floor(-oy/scale)-1,maxY=Math.ceil((h-oy)/scale)+1;
  c.save();c.translate(ox,oy);c.scale(scale,scale);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const n=hash(x,y),xx=x+hash(x+11,y)*.8,yy=y+hash(x,y+13)*.8;
   if(view==='surface'){
    if(n>.65){c.globalAlpha=.23;leaf(c,xx,yy,.16+n*.12,n*TAU,'#746d3e','#b29b62');c.globalAlpha=1}
    if(n<.12)pebble(c,xx,yy,.02+n*.2,x*31+y,'#726a52');
   }else if(n>.76){c.strokeStyle='#94704a20';c.lineWidth=.016;c.beginPath();c.moveTo(xx,yy);c.bezierCurveTo(xx+.08,yy+.12,xx+.14,yy+.13,xx+.3,yy+.2);c.stroke()}
  }c.restore();
 }
 fog(s,w,h,ox,oy,scale){
  const seen=s.cells.filter(t=>t.seen&&E.isSurface(s,t)),key=[w,h,ox,oy,scale,seen.length,seen.map(t=>t.k??E.key(t.x,t.y)).join(',')].join('|');
  if(!this.fogLayer||this.fogKey!==key){this.fogKey=key;const a=this.fogLayer||(this.fogLayer=document.createElement('canvas'));a.width=w;a.height=h;const c=a.getContext('2d');c.fillStyle='#0d211bd0';c.fillRect(0,0,w,h);c.globalCompositeOperation='destination-out';c.fillStyle='#000';c.shadowColor='#000';c.shadowBlur=scale*.65;const path=new Path2D();for(const tile of seen){const x=ox+tile.x*scale,y=oy+tile.y*scale;path.moveTo(x+scale*.94,y);path.arc(x,y,scale*.94,0,TAU)}c.fill(path);c.globalCompositeOperation='source-over';c.shadowBlur=0;}
  this.world.ctx.drawImage(this.fogLayer,0,0);
 }
 cave(world,s){
  const c=world.ctx,nation=s.colonies.find(n=>n.id===world.nestId)?.role,{nodes,edges}=world.corridors(s),signature=nodes.map(n=>n.x+','+n.y+','+(n.narrow?1:0)).join(';')+'|'+s.rooms.map(r=>r.k+':'+r.size+':'+r.status).join(';');
  let cache=this.caveCache;
  if(!cache||cache.signature!==signature){
   const set=new Set(nodes.map(n=>E.key(n.x,n.y)));
   const make=width=>{
    const path=new Path2D();
    for(const n of nodes){const r=width*(n.narrow?.30:.5),seed=n.x*93+n.y*271;path.moveTo(n.x+r,n.y);for(let i=1;i<=20;i++){const a=i/20*TAU,rr=r*(.96+hash(seed,i)*.065);path.lineTo(n.x+Math.cos(a)*rr,n.y+Math.sin(a)*rr)}path.closePath()}
    for(const {a,b,narrow}of edges){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),r=width*(narrow?.30:.5),nx=-dy/len*r,ny=dx/len*r;path.moveTo(a.x+nx,a.y+ny);path.lineTo(a.x-nx,a.y-ny);path.lineTo(b.x-nx,b.y-ny);path.lineTo(b.x+nx,b.y+ny);path.closePath()}
    for(const n of nodes)if(!n.narrow&&set.has(E.key(n.x+1,n.y))&&set.has(E.key(n.x,n.y+1))&&set.has(E.key(n.x+1,n.y+1)))path.rect(n.x,n.y,1,1);
    return path;
   };
   cache=this.caveCache={signature,set,nodes,outer:make(1.28),rim:make(1.15),lip:make(1.04),floor:make(.91)};this.metrics.caveBuilds++;
  }
  c.save();c.translate(0,.08);c.fillStyle='#0e0c09';c.fill(cache.outer);c.restore();
  c.fillStyle='#30251a';c.fill(cache.outer);c.fillStyle=this.pattern(c,nation?'floor-'+nation:'floor',4);c.fill(cache.rim);c.fillStyle='#856c46';c.fill(cache.lip);
  c.save();c.translate(0,.07);c.fillStyle='#302219';c.fill(cache.lip);c.restore();c.fillStyle=this.pattern(c,nation?'floor-'+nation:'floor',4);c.fill(cache.floor);
  // Paint only boundary strata; intersections remain continuous open ground.
  const m=world.metrics;
  for(const n of cache.nodes){
   const sp=world.screen(n.x,n.y);if(sp.x<-m.scale||sp.x>m.w+m.scale||sp.y<-m.scale||sp.y>m.h+m.scale)continue;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){if(cache.set.has(E.key(n.x+dx,n.y+dy)))continue;
    const angle=Math.atan2(dy,dx),rad=n.narrow?.32:.52;
    for(let j=0;j<4;j++){const t=(j-1.5)*.22,x=n.x+dx*rad-dy*t,y=n.y+dy*rad+dx*t,seed=n.x*101+n.y*29+j;pebble(c,x,y,.055+hash(seed,3)*.035,seed,'#66503a');if(j===2&&nation){if(nation==='near'){c.fillStyle='#9072b0';c.beginPath();c.moveTo(x-.07,y);c.lineTo(x+.015,y-.22);c.lineTo(x+.09,y-.03);c.fill()}else if(nation==='hunter'){oval(c,x,y,.15,.07,'#40696677');leaf(c,x,y,.16,angle,'#3b7874')}else if(nation==='armored'){line(c,[[x-.08,y+.05],[x,y-.08],[x+.06,y+.01]],'#c4b694',.055)}else{line(c,[[x-.12,y],[x+.1,y-.13]],'#92a36a',.025);oval(c,x+.1,y-.16,.12,.045,'#8d9560')}}if(j===1)line(c,[[x,y],[x+dx*.13-dy*.07,y+dy*.13+dx*.07]],'#302117',.017)}
    if(hash(n.x+dx,n.y+dy)>.78){const x=n.x+dx*.62,y=n.y+dy*.62;line(c,[[x+dx*.15,y+dy*.15],[x,y],[x-dx*.23-dy*.08,y-dy*.23+dx*.08]],'#322116',.04);line(c,[[x,y],[x-dx*.15+dy*.07,y-dy*.15-dx*.07]],'#8d6c41',.015)}
   }
  }
  // Dig marks follow actual work progress; unopened soil never becomes a full room.
  for(const tile of s.cells){if(tile.open||!tile.seen||!(tile.work>0)||E.isSurface(s,tile))continue;const needed={表土:8,濕土:13,黏土:21,碎石:32}[tile.layer]||12,p=Math.min(.95,tile.work/needed),r=.12+p*.32;
   oval(c,tile.x,tile.y,r+.06,r*.8,'#2a1d13');oval(c,tile.x,tile.y+.025,r,r*.7,'#685034');
   for(let i=0;i<6;i++)pebble(c,tile.x+Math.cos(i)*r,tile.y+Math.sin(i)*r*.8,.03,Math.round(tile.x*90+i));
  }
 }
 extent(room,s){
  const p=E.xy(room.k),cells=(room.cells||[]).map(k=>E.cell(s,k)).filter(c=>c?.open&&Math.abs(c.x-p.x)<2.5&&Math.abs(c.y-p.y)<2.5);
  return cells.length>=4?Math.min(1.42,.62+Math.sqrt(cells.length)*.18):.5;
 }
 room(room,x,y,r,s){
  const c=this.world.ctx,level=this.world.roomLevel(room),active=room.status==='active',progress=room.status==='shaping'?Math.min(1,(room.progress||0)/(14*(room.targetSize||room.size||1))):((room.planCells||[]).filter(k=>E.cell(s,k)?.open).length/Math.max(1,(room.planCells||[]).length));
  c.save();c.translate(x,y);c.scale(r,r);
  if(!active){
   c.strokeStyle='#b69e6a88';c.lineWidth=.025;c.setLineDash([.1,.13]);c.beginPath();c.ellipse(0,0,.85,.67,0,0,TAU);c.stroke();c.setLineDash([]);
   for(let i=0;i<4+Math.floor(progress*8);i++){const a=i/12*TAU;pebble(c,Math.cos(a)*.77,Math.sin(a)*.57,.075,i+room.id)}
   if(progress>.25)for(let i=0;i<2+Math.floor(progress*3);i++)line(c,[[-.64+i*.28,-.42],[-.53+i*.28,-.6]],'#b39967',.045);
   c.restore();return;
  }
  // Equipment sits directly on the excavated floor; no detached room disc.
  const nation=this.state?.colonies.find(n=>n.id===room.nestId)?.role,nationColumn=['near','hunter','armored','deep_forest'].indexOf(nation),facility=nationColumn>=0?atlasCell('enemy-facilities',nationColumn+({nursery:0,military:1,store:2,mutation:3,royal:4}[room.type]||0)*4,4,5):atlasCell('facilities',{nursery:0,rest:1,military:2,mutation:3,store:4,prey:5,royal:6}[room.type],4,2);
  if(facility){const n=room.type==='royal'?1:level===1?1:level===2?2:3;for(let i=0;i<n;i++){const xx=n===1?0:(i-(n-1)/2)*.66,yy=n===3&&i===1?-.24:.02,w=room.type==='royal'?1.55:n===1?1.25:1.0;stamp(c,facility,xx,yy-.15,w,w*facility.h/facility.w*.78)}if(room.type==='store'&&s.food>0){const food=atlasCell('objects',0,4,3);if(food){const fill=Math.min(1,s.food/Math.max(1,E.foodCapacity(s)));for(let i=0;i<Math.ceil(fill*level*2);i++)stamp(c,food,-.4+(i%3)*.4,.34+Math.floor(i/3)*.12,.3,.22)}}c.restore();return;}
  const beds=level===1?2:level===2?4:6;
  const pod=(px,py,rx,ry,color)=>{
   oval(c,px,py+.055,rx*1.15,ry*1.25,'#160e0980');oval(c,px,py,rx,ry,shade(c,px,py,rx,'#b7a178','#6d6145','#332c22'));
   oval(c,px,py-.025,rx*.78,ry*.7,color);
   for(let j=0;j<4;j++)line(c,[[px-rx*.85+j*rx*.54,py-ry*.4],[px-rx*.75+j*rx*.5,py+ry*.48]],'#cdb88c33',.018);
  };
  if(room.type==='nursery'){
   for(let i=0;i<beds;i++){const xx=(i%3-1)*.48,yy=-.28+Math.floor(i/3)*.46;pod(xx,yy,.21,.16,'#b5a575')}
   // Brood itself is drawn once from s.broods by the world renderer.
   for(const side of [-1,1]){oval(c,side*.73,-.18,.09,.14,'#493d25');oval(c,side*.73,-.21,.05,.085,shade(c,side*.73,-.21,.1,'#f9d591','#aa7f38','#514323'))}
  }else if(room.type==='store'){
   const fill=Math.min(1,s.food/Math.max(1,E.foodCapacity(s)));
   for(let i=0;i<beds;i++){const xx=(i%3-1)*.48,yy=-.27+Math.floor(i/3)*.44;pod(xx,yy,.22,.17,'#392e1c');if(fill>.03)for(let j=0;j<Math.ceil(fill*8);j++){const a=hash(i,j)*TAU;oval(c,xx+Math.cos(a)*.13*hash(j,6),yy+Math.sin(a)*.08,.035,.021,'#c1a36a',a)}}
  }else if(room.type==='rest'){
   for(let i=0;i<beds;i++){const xx=(i%3-1)*.45,yy=-.25+Math.floor(i/3)*.44;pod(xx,yy,.21,.15,'#61715b');leaf(c,xx-.18,yy,.32,.1,'#56684c','#899976')}
   oval(c,0,-.52,.1,.1,shade(c,0,-.52,.15,'#efd197','#a27840','#483820'));
  }else if(room.type==='military'){
   for(let i=0;i<beds;i++){const xx=(i%3-1)*.47,yy=-.28+Math.floor(i/3)*.43;pod(xx,yy,.18,.13,'#423d32');c.fillStyle=shade(c,xx,yy,.16,'#a29265','#4c5046','#202b28');c.beginPath();c.moveTo(xx-.12,yy-.09);c.lineTo(xx+.12,yy-.09);c.lineTo(xx+.08,yy+.12);c.lineTo(xx,yy+.18);c.lineTo(xx-.08,yy+.12);c.fill()}
   for(const side of [-1,1]){line(c,[[side*.7,.18],[side*.7,-.64]],'#a78d53',.027);c.fillStyle='#7c2e2b';c.beginPath();c.moveTo(side*.7,-.63);c.lineTo(side*.7+.18,-.58);c.lineTo(side*.7+.14,-.3);c.lineTo(side*.7,-.33);c.fill()}
  }else if(room.type==='mutation'){
   for(let i=0;i<(level===1?1:level===2?3:5);i++){const a=i*2.4,xx=i?Math.cos(a)*.52:0,yy=i?Math.sin(a)*.34:0;pod(xx,yy,.2,.18,'#574842');oval(c,xx,yy-.11,.12,.22,shade(c,xx,yy-.12,.24,'#e5c773','#978546','#38372b'));line(c,[[xx-.14,yy+.1],[xx-.17,yy-.13],[xx-.06,yy-.32]],'#968775',.027);line(c,[[xx+.14,yy+.1],[xx+.17,yy-.13],[xx+.06,yy-.32]],'#968775',.027)}
  }else if(room.type==='prey'){
   pod(0,0,.5,.31,'#684735');for(let i=0;i<beds;i++){const a=i/beds*TAU;line(c,[[Math.cos(a)*.53,Math.sin(a)*.31],[Math.cos(a)*.7,Math.sin(a)*.44]],'#baa380',.06)}
   if((s.protein||0)>0)for(let i=0;i<Math.min(7,Math.ceil(s.protein/4));i++)pebble(c,(hash(i,5)-.5)*.5,(hash(i,7)-.5)*.25,.08,i,'#8e684f');
  }else if(room.type==='royal'){
   for(let j=0;j<level;j++){c.strokeStyle=['#80663a','#ae8f4f','#d1b578'][j];c.lineWidth=.03;c.beginPath();c.ellipse(0,0,.46+j*.12,.3+j*.075,0,0,TAU);c.stroke()}
   for(const side of [-1,1]){c.strokeStyle='#32251b';c.lineWidth=.16;c.beginPath();c.moveTo(side*.67,.2);c.bezierCurveTo(side*.89,-.1,side*.7,-.55,side*.35,-.65);c.stroke();c.strokeStyle='#c1a365';c.lineWidth=.045;c.stroke()}
  }
  if(level>=2)for(let i=0;i<level;i++)pebble(c,-.4+i*.4,.49,.09,room.id+i,'#746644');
  c.restore();
 }
 prop(name,x,y,size,angle=0,opacity=1){
  const slot={seeds:0,fruit:1,prey:2,insect_carcass:2,fungi:3,resin:4,ore:5,log:6,plant:7,rock:8,root:9,water:10,stump:11}[name],cell=atlasCell('objects',slot,4,3);
  if(cell){const c=this.world.ctx;c.save();c.globalAlpha=opacity;c.translate(x,y);c.rotate(angle);oval(c,0,size*.13,size*.38,size*.16,'#10170f32');const w=size*1.15,h=w*cell.h/cell.w;stamp(c,cell,0,-h*.12,w,h);c.restore();return;}
  const c=this.world.ctx,key=name;let sprite=this.objects.get(key);if(!sprite){sprite=document.createElement('canvas');sprite.width=sprite.height=192;const g=sprite.getContext('2d');g.translate(96,96);g.scale(150,150);this.paintObject(g,name);this.objects.set(key,sprite);this.metrics.propBuilds++}
  c.save();c.globalAlpha=opacity;c.translate(x,y);c.rotate(angle);c.drawImage(sprite,-size*.64,-size*.64,size*1.28,size*1.28);c.restore();
 }
 paintObject(c,name){
  oval(c,.035,.12,.43,.24,'#0c160f45');
  if(name==='seeds'){
   for(let i=0;i<14;i++){const x=(hash(i,7)-.5)*.7,y=(hash(i,9)-.5)*.35;oval(c,x+.02,y+.035,.105,.056,'#211b1577',i*.7);oval(c,x,y,.095,.05,shade(c,x,y,.12,'#dcc895','#a28b56','#624d2d'),i*.7);line(c,[[x-.04,y],[x+.04,y-.013]],'#e4d7a577',.008)}
  }else if(name==='fruit'){
   for(let i=0;i<7;i++){const x=(hash(i,8)-.5)*.62,y=(hash(i,2)-.5)*.28;oval(c,x,y,.13,.105,shade(c,x,y,.15,'#bb7370','#6c303c','#321e29'));oval(c,x-.035,y-.04,.024,.014,'#e6b7a577');leaf(c,x,y-.09,.1,-1.5,'#48653b')}
  }else if(name==='fungi'){
   for(let i=0;i<5;i++){const x=(hash(i,2)-.5)*.65,y=(hash(i,5)-.5)*.3,h=.12+hash(i,8)*.13;line(c,[[x,y+.1],[x-.01,y-h]],'#c4bba0',.038);oval(c,x,y-h,.10+h*.25,.065,shade(c,x,y-h,.16,'#ba9f68','#82664a','#493c2e'));for(let j=0;j<4;j++)oval(c,x+(hash(i,j)-.5)*.14,y-h+(hash(j,i)-.5)*.055,.008,.006,'#d9c8a8')}
  }else if(name==='insect_carcass'||name==='prey'){
   c.save();c.rotate(-.27);for(let side of [-1,1])for(let i=0;i<3;i++)line(c,[[i*.11-.12,side*.05],[i*.15-.22,side*.19],[i*.17-.2,side*.26]],'#514d35',.025);
   oval(c,-.13,0,.23,.135,shade(c,-.13,0,.27,'#8e895b','#4c563b','#242f23'));oval(c,.14,0,.11,.09,'#51472c');oval(c,.28,0,.09,.07,'#3e3526');line(c,[[-.28,-.025],[.02,-.025]],'#c0a77966',.012);c.restore();
  }else if(name==='rock'||name==='ore'){
   for(let i=0;i<4;i++)pebble(c,(hash(i,4)-.5)*.5,(hash(i,8)-.5)*.2,.16+hash(i,9)*.13,i+2,name==='ore'?'#686769':'#667065');
   if(name==='ore')for(let i=0;i<6;i++)line(c,[[(hash(i,4)-.5)*.4,-.15+hash(i,8)*.25],[(hash(i,4)-.5)*.4+.06,-.12+hash(i,8)*.25]],'#c3ad78',.013);
  }else if(name==='log'||name==='root'){
   for(let i=0;i<(name==='root'?4:1);i++){c.save();c.rotate(name==='root'?i*1.15:0);const len=name==='root'?.34:.72;line(c,[[-len*.5,.07],[.02,-.05],[len*.5,-.01]],'#342719',.19);line(c,[[-len*.5,.01],[.02,-.10],[len*.5,-.055]],'#756044',.13);for(let j=0;j<4;j++)line(c,[[-len*.43,-.06+j*.024],[.03,-.12+j*.024],[len*.43,-.085+j*.023]],j%2?'#352b1f':'#9c825b',.01);c.restore()}
   if(name==='log'){oval(c,.36,-.05,.035,.093,'#b09766');oval(c,.36,-.05,.019,.06,'#6d5639')}else for(let i=0;i<7;i++)leaf(c,(hash(i,4)-.5)*.35,(hash(i,6)-.5)*.18,.20,hash(i,5)*TAU,'#41583a','#7a8752');
  }else if(name==='plant'){
   for(let i=0;i<11;i++){const a=i*2.4;leaf(c,Math.cos(a)*.03,Math.sin(a)*.02,.25+hash(i,4)*.2,a,'#35523a','#83945b')}
  }else if(name==='water'){
   oval(c,0,.02,.46,.27,'#777857');oval(c,0,0,.42,.23,shade(c,0,0,.5,'#80968a','#456c66','#263f3e'));for(let i=0;i<4;i++)line(c,[[-.23+i*.12,-.07+i*.025],[-.05+i*.1,-.075+i*.025]],'#bac7ad66',.012);for(let i=0;i<6;i++){const x=.31+(hash(i,5)-.5)*.2;line(c,[[x,.1],[x-.02,-.12-hash(i,9)*.12]],'#6f8050',.013)}
  }else if(name==='resin'){
   line(c,[[-.3,.05],[.25,-.06]],'#5b4226',.12);for(let i=0;i<5;i++){const x=(hash(i,4)-.5)*.48,y=(hash(i,8)-.5)*.13;oval(c,x,y,.085,.10,shade(c,x,y,.13,'#f1cf78','#b3843e','#674724'));oval(c,x-.025,y-.04,.018,.028,'#ffedb780')}
  }
 }
 body(key){
  if(this.bodies.has(key))return this.bodies.get(key);
  const queen=key.includes('queen'),role=key.startsWith('units/player')?'player':key.split('/').pop().replace(/_(?:queen|soldier|special)$/,''),p=palettes[role]||palettes.player,type=key.split('/').pop(),armored=type.includes('armor')||role==='armored',jaw=type.includes('jaw'),acid=type.includes('acid');
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=220;const c=canvas.getContext('2d');c.translate(160,110);c.scale(80,80);
  const nation=['player','near','hunter','armored','deep_forest'].indexOf(role),caste={worker:0,soldier_normal:1,soldier_armor:2,soldier_jaw:3,soldier_acid:4,flyer:5}[type],dedicated=role==='player'&&!queen&&caste!==undefined,cell=dedicated?atlasCell('player-castes',caste,3,2):role!=='player'&&!queen&&/_(soldier|special)$/.test(type)?atlasCell('enemy-castes',Math.max(0,nation-1)+(type.endsWith('_special')?4:0),4,2):atlasCell('ant-bodies',Math.max(0,nation)+(queen?5:0),5,2);
  if(cell){const width=queen?2.65:1.95;stamp(c,cell,queen?-.2:0,0,width,width*cell.h/cell.w);if(jaw&&!dedicated)for(const side of [-1,1]){c.strokeStyle=p.light;c.lineWidth=.11;c.beginPath();c.moveTo(.63,side*.12);c.quadraticCurveTo(1.45,side*.45,1.32,side*.015);c.stroke()}if(acid&&!dedicated)for(const side of [-1,1])oval(c,-.5,side*.15,.28,.14,shade(c,-.5,side*.15,.3,'#d6dc9b','#89994f','#354626'));this.bodies.set(key,canvas);this.metrics.bodyBuilds++;return canvas;}
  const shell=(x,y,rx,ry)=>{oval(c,x,y,rx,ry,shade(c,x,y,Math.max(rx,ry),p.light,p.mid,p.dark));c.strokeStyle=p.edge+'55';c.lineWidth=.013;c.beginPath();c.ellipse(x-.025,y-.025,rx*.82,ry*.8,0,Math.PI,TAU);c.stroke()};
  shell(queen?-.65:-.52,0,queen?.8:.39,queen?.48:.25);shell(-.06,0,.09,.095);shell(.18,0,.25,.16);shell(.6,0,jaw?.37:armored?.34:.27,armored?.29:.23);
  if(queen){for(let i=0;i<6;i++){const x=-1.14+i*.19;c.strokeStyle=p.edge+'88';c.lineWidth=.02;c.beginPath();c.ellipse(x,0,.04,.20+Math.sin((i+1)/7*Math.PI)*.24,0,-Math.PI/2,Math.PI/2);c.stroke()}shell(.25,-.14,.18,.1);shell(.25,.14,.18,.1)}
  else if(armored){for(let i=0;i<3;i++)shell(-.7+i*.15,0,.16,.28-i*.025)}
  if(role==='player'){line(c,[[-.7,-.10],[-.45,-.16],[-.28,-.07]],p.edge,.026);line(c,[[.17,-.1],[.34,-.075]],'#ab4034',.075)}
  if(role==='near'){for(let i=0;i<5;i++)for(const side of [-1,1]){const x=-.85+i*.32,y=(i<3?.20:.14)*side;c.fillStyle=i%2?p.light:p.mid;c.beginPath();c.moveTo(x-.06,y);c.lineTo(x+.035,y+side*(queen?.3:.2));c.lineTo(x+.10,y);c.fill()}}
  if(role==='hunter'){for(const side of [-1,1]){c.strokeStyle=p.edge+'99';c.lineWidth=.018;c.beginPath();c.ellipse(-.52,0,.34,.2,0,side>0?.1:Math.PI+.1,side>0?Math.PI-.1:TAU-.1);c.stroke()}oval(c,-.55,0,.18,.075,p.glow+'44')}
  if(role==='armored')for(const side of [-1,1]){c.fillStyle=p.light;c.beginPath();c.moveTo(.44,side*.18);c.lineTo(.30,side*.46);c.lineTo(.68,side*.23);c.fill()}
  if(role==='deep_forest'){for(let i=0;i<(queen?10:6);i++){const x=-.9+hash(i,2)*.7,y=(hash(i,7)-.5)*.5;line(c,[[x,y],[x+.035,y-.12]],p.light,.024);oval(c,x+.035,y-.13,.075,.045,i%2?p.light:p.mid)}}
  if(acid)oval(c,-.57,0,.24,.17,shade(c,-.57,0,.25,'#cad68e','#829252','#354d31'));
  for(const side of [-1,1]){oval(c,.68,side*.17,.032,.043,p.glow);const reach=jaw?.43:role==='near'?.30:.21;c.fillStyle=p.light;c.beginPath();c.moveTo(.78,side*.12);c.quadraticCurveTo(.91+reach,side*.25,.84+reach,side*.005);c.quadraticCurveTo(.97,side*.08,.78,side*.06);c.fill()}
  this.bodies.set(key,canvas);this.metrics.bodyBuilds++;return canvas;
 }
 unit(x,y,size,angle,a,queen,key){
  const c=this.world.ctx,p=palettes[key?.startsWith('units/player')?'player':key?.split('/').pop().replace(/_(?:queen|soldier|special)$/,'')]||palettes.player;
  let phase=0,moving=false;if(a){let m=this.motion.get(a);if(!m){m={x:a.x,y:a.y,phase:hash(a.id,9)*TAU,stamp:this.clock,moving:false};this.motion.set(a,m)}
   if(m.stamp!==this.clock){const d=Math.hypot(a.x-m.x,a.y-m.y);moving=d>.0001&&d<2;m.phase+=moving?d*20:0;m.moving=moving;m.x=a.x;m.y=a.y;m.stamp=this.clock;this.motion.set(a,m)}phase=m.phase;moving=m.moving;}
  c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
  oval(c,queen?-.2:0,.10,queen?1.35:.98,queen?.48:.39,'#07100c24');oval(c,queen?-.2:0,.055,queen?1.1:.79,queen?.35:.24,'#07100c38');
  if(key?.endsWith('/flyer')){const flap=.18+Math.abs(Math.sin(this.clock*38+(a?.id||0)))*.82;for(const side of [-1,1]){c.save();c.scale(1,flap);oval(c,-.13,side*.68,.72,.24,'#d5dcc94f',side*-.48);oval(c,-.45,side*.43,.5,.18,'#c0cda143',side*-.3);line(c,[[.12,side*.08],[-.64,side*.92]],'#c3cc9c66',.012);c.restore();}}
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const walk=moving?Math.sin(phase+i*2.1+(side>0?Math.PI:0))*.18:0,hip=.27-i*.22,kneeX=.47-i*.46+walk,kneeY=side*(queen?.53:.43),toeX=.65-i*.62-walk*.6,toeY=side*(queen?.75:.67);
   line(c,[[hip,side*.095],[kneeX,kneeY],[toeX,toeY]],p.dark,.068);line(c,[[hip-.018,side*.08],[kneeX-.018,kneeY-.015],[toeX-.012,toeY-.015]],p.light,.018);
   oval(c,kneeX,kneeY,.035,.035,p.mid);
  }
  const twitch=Math.sin(this.clock*2+(a?.id||0))*.035;
  for(const side of [-1,1])line(c,[[.67,side*.13],[1.03,side*(.33+twitch)],[1.25,side*.25]],p.edge,.024);
  c.drawImage(this.body(key),-2,-1.375,4,2.75);c.restore();
 }
 wildlife(w,x,y,size,dead=false){
  const c=this.world.ctx,index=w.sizeClass==='small'?0:w.sizeClass==='large'?2:1,cell=atlasCell('wildlife',index+(dead?3:0),3,2);if(!cell)return;
  const angle=w.moveFrom?Math.atan2(w.y-w.moveFrom.y,w.x-w.moveFrom.x):w.heading||0,phase=this.clock*9+w.id;
  c.save();c.translate(x,y);c.rotate(angle);oval(c,0,size*.10,size*.52,size*.30,'#08110944');
  if(!dead&&index>0)for(const side of [-1,1])for(let i=0;i<3;i++){const stride=w.moveFrom?Math.sin(phase+i*2.1+side)*size*.08:Math.sin(phase*.35+i)*size*.018;line(c,[[size*(.2-i*.18),side*size*.17],[size*(.3-i*.28)+stride,side*size*.35],[size*(.4-i*.4)-stride,side*size*.51]],'#35291b',size*.035);line(c,[[size*(.2-i*.18),side*size*.17],[size*(.3-i*.28)+stride,side*size*.35]],'#a08c64',size*.013)}
  const pulse=!dead&&index===0?1+Math.sin(phase*.4)*.025:1;stamp(c,cell,0,0,size*pulse,size*cell.h/cell.w);c.restore();
 }
 entrance(x,y,size,role){
  const c=this.world.ctx,p=palettes[role]||palettes.player;c.save();c.translate(x,y);c.scale(size,size);oval(c,.08,.14,.53,.30,'#09110c44');oval(c,0,0,.43,.30,shade(c,0,-.07,.45,'#b49a6d','#7b6445','#433622'));oval(c,0,-.035,.30,.20,'#282218');oval(c,0,-.04,.235,.15,'#101610');for(let i=0;i<9;i++){const a=i/9*TAU;pebble(c,Math.cos(a)*.37,Math.sin(a)*.24,.05,i,'#8b7857')}
  for(const side of [-1,1]){line(c,[[side*.33,.14],[side*.35,-.2]],p.dark,.05);line(c,[[side*.33,.11],[side*.35,-.19]],p.edge,.018)}c.restore();
 }
 brood(x,y,size,stage,seed){
  const c=this.world.ctx;c.save();c.translate(x,y);c.rotate(.45);oval(c,.015,.025,size*.62,size,'#191b1044');
  if(stage===1){for(let i=0;i<5;i++)oval(c,Math.sin(i*.4)*size*.25,(i-2)*size*.3,size*.48,size*.27,shade(c,0,0,size,'#e3dcc0','#b7ad88','#726c51'))}
  else oval(c,0,0,size*(stage===2?.67:.55),size,shade(c,0,-size*.3,size,'#f3e5b8','#b6ad87','#716b51'));c.restore();
 }
}
SceneArt.loaded=()=>Object.keys(atlases);root.AntSceneArt=SceneArt;
})(window);

