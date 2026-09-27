/* V9.1 independent enemy map migration. Existing numeric player/surface keys remain valid. */
(function(root){'use strict';
function upgrade(s,E){
 if(s.nestInstancesVersion===1)return;
 const remap=new Map();s.enemyNests??=[];
 for(const n of s.colonies){
  const origin=E.xy(n.home),id=n.id,k=(x,y)=>E.nestKey(id,x,y),entrance=E.surfaceKey(origin.x,4),cells=new Map(),put=(x,y,zone='passage')=>{const kk=k(x,y);if(!cells.has(kk))cells.set(kk,{k:kk,x,y,nestId:id,surface:false,open:true,seen:false,sealed:false,layer:n.role==='armored'?'碎石':n.role==='hunter'?'濕土':'黏土',work:0,ours:0,theirs:0,mark:false,deposit:0,feature:null,enemyZone:zone});return kk},line=(ax,ay,bx,by,zone)=>{let x=ax,y=ay;put(x,y,zone);while(x!==bx||y!==by){if(x!==bx)x+=Math.sign(bx-x);else y+=Math.sign(by-y);put(x,y,zone)}},room=(cx,cy,type,size=1)=>{const keys=[];for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++)keys.push(put(x,y,type));return {id:'enemy-'+id+'-'+type,nestId:id,type,k:k(cx,cy),cells:keys,size,maturity:size===1?0:size===2?40:80,status:'active',hp:type==='royal'?100:45,maxHp:type==='royal'?100:45,destroyed:false}};
  const depth=Math.max(14,origin.y),mid=Math.round((5+depth)/2),coreY=depth;
  // Alternating bends and an outer loop; no straight portal-to-queen tunnel.
  line(origin.x,5,origin.x,7,'outer');line(origin.x,7,origin.x-2,7,'outer');line(origin.x-2,7,origin.x-2,mid,'patrol');line(origin.x-2,mid,origin.x+2,mid,'defense');line(origin.x+2,mid,origin.x+2,coreY-2,'defense');line(origin.x+2,coreY-2,origin.x,coreY-2,'core');line(origin.x,coreY-2,origin.x,coreY,'core');
  line(origin.x-2,mid,origin.x-4,mid,'patrol');line(origin.x-4,mid,origin.x-4,coreY-2,'patrol');line(origin.x-4,coreY-2,origin.x,coreY-2,'core');
  const rooms=[room(origin.x-3,8,'nursery'),room(origin.x+3,mid,'store'),room(origin.x-3,mid+2,'military',2),room(origin.x+3,coreY-3,'mutation',n.role==='deep_forest'?3:2),room(origin.x,coreY,'royal',3)];
  line(origin.x-2,7,origin.x-3,8,'nursery');line(origin.x+2,mid,origin.x+3,mid,'store');line(origin.x-4,mid+2,origin.x-3,mid+2,'military');line(origin.x+2,coreY-3,origin.x+3,coreY-3,'mutation');
  for(const c of s.cells.filter(c=>!E.isSurface(s,c)&&c.nestId===undefined&&c.enemyZone&&Math.abs(c.x-origin.x)<=1&&c.y<=origin.y+1)){const old=c.k??E.key(c.x,c.y),dest=[...cells.values()].sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0].k;remap.set(old,dest);cells.get(dest).seen=!!c.seen;if(!s.rooms.some(r=>(r.cells||[]).includes(old))){c.open=false;c.seen=false;delete c.enemyZone;}}
  // Preserve ongoing raiders and cargo at old locations, even outside new corridors.
  const oldHome=n.home,oldQueen=n.queenK;n.home=k(origin.x,coreY);n.queenK=n.retreated?put(E.xy(oldQueen).x,E.xy(oldQueen).y,'core'):n.home;remap.set(oldHome,n.home);remap.set(oldQueen,n.queenK);
  n.entryK=k(origin.x,5);n.zones={entry:entrance,outer:k(origin.x,7),gathering:rooms[1].k,patrol:k(origin.x-2,mid),defense:k(origin.x+2,coreY-2),core:n.queenK,bufferRadius:4};
  const instance={id,role:n.role,entry:entrance,entryK:n.entryK,queenK:n.queenK,rooms,discovered:!!n.discovered};s.enemyNests.push(instance);s.cells.push(...cells.values());
 }
 const map=v=>remap.has(v)?remap.get(v):v;
 for(const a of s.ants){const old=a.k;a.k=map(a.k);if(old!==a.k)Object.assign(a,E.xy(a.k));for(const f of ['goal','chase','guardTarget','expeditionTarget','enemyFoodTarget'])if(a[f]!=null)a[f]=map(a[f]);a.path=(a.path||[]).map(map);if(a.primary?.k!=null)a.primary.k=map(a.primary.k);if(a.haulTask){a.haulTask.targetK=map(a.haulTask.targetK);a.haulTask.currentNode=map(a.haulTask.currentNode)}}
 for(const g of s.groups)for(const f of ['target','rally','via'])if(g[f]!=null)g[f]=map(g[f]);
 for(const r of s.resources)if(r.queenCorpse){r.k=map(r.k);const n=s.colonies.find(n=>n.id===r.colony);if(n)r.k=n.queenK;}
 for(const r of s.routes){r.k=map(r.k);if(r.kind==='queenCorpse'){const corpse=s.resources.find(q=>q.id===r.corpseId);if(corpse)r.k=corpse.k}}
 for(const e of s.events)e.k=map(e.k);if(s.uiNotice)s.uiNotice.k=map(s.uiNotice.k);
 s.enemyHome=s.colonies.find(n=>n.role==='deep_forest')?.home??s.enemyHome;s.nestInstancesVersion=1;s.perf.pathEpoch=(s.perf.pathEpoch||0)+1;
}
const api={upgrade};if(typeof module!=='undefined')module.exports=api;root.AntNestInstances=api;
})(typeof globalThis!=='undefined'?globalThis:this);
