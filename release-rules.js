/* V9.1 release additions: finite growth, shared ecology and post-war orders. */
(function(root){'use strict';
const PROFILES={near:{ratio:.68,cap:40,interval:22,workers:.52,special:.12,time:180},hunter:{ratio:.83,cap:52,interval:19,workers:.36,special:.4,time:150},armored:{ratio:.98,cap:64,interval:21,workers:.4,special:.55,time:135},deep_forest:{ratio:1.13,cap:76,interval:18,workers:.36,special:.6,time:120}};
const COOLDOWNS={seed:120,fungi:210,small:240,medium:420,large:720};
const ECO={minimum:900,maximum:2200,maxSources:28,maxWildlife:10};
function init(s,E){
 if(!s.surfaceOutpostsVersion){const preservedSeed=s.seed;
  const offset=(s.worldSeed??s.seed)%3-1,positions={near:[19+offset,-1],hunter:[29-offset,9],armored:[-11,-5+offset],deep_forest:[43,-6+offset]},remap=new Map();
  for(const n of s.colonies){const old=n.zones.entry,[x,y]=positions[n.role],target=E.surfaceKey(x,y),from=E.xy(old);E.ensureSurfaceChunk(s,x,y);
   let cx=from.x,cy=from.y;while(cx!==x||cy!==y){if(cy!==y)cy+=Math.sign(y-cy);else cx+=Math.sign(x-cx);E.ensureSurfaceChunk(s,cx,cy);const c=E.cell(s,E.surfaceKey(cx,cy));if(c){c.open=true;c.terrain='ground';c.elevation=0;c.climb=true;}}
   const habitat={near:'plant',hunter:'root',armored:'rock',deep_forest:'fungi'}[n.role];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){E.ensureSurfaceChunk(s,x+dx,y+dy);const c=E.cell(s,E.surfaceKey(x+dx,y+dy));if(!c)continue;c.outpost=n.id;if(Math.abs(dx)+Math.abs(dy)>1&&Math.abs(dx)!==Math.abs(dy)&&!s.resources.some(r=>r.k===(c.k??E.key(c.x,c.y)))){c.terrain=habitat;c.elevation=0;c.open=true;}}
   const entrance=E.cell(s,target);Object.assign(entrance,{open:true,terrain:'ground',elevation:0,climb:true});if(n.discovered)entrance.seen=true;
   n.zones.entry=target;n.outpostRegion={near:'東北前線',hunter:'東南濕地',armored:'西北側翼',deep_forest:'遠東深林'}[n.role];n.threatTier={near:1,hunter:2,armored:3,deep_forest:4}[n.role];s.enemyNests.find(t=>t.id===n.id).entry=target;remap.set(old,target);
  }
  for(const a of s.ants){a.path=[];a.goal=null;if(a.expeditionTarget!=null&&remap.has(a.expeditionTarget))a.expeditionTarget=remap.get(a.expeditionTarget);if(a.haulTask)a.haulTask.entranceK=s.colonies.find(n=>n.id===a.haulTask.nestId)?.zones.entry??a.haulTask.entranceK;}
  for(const r of s.routes)if(r.kind==='queenCorpse')r.entranceK=s.colonies.find(n=>n.id===r.nestId)?.zones.entry??r.entranceK;
  for(const g of s.groups)for(const f of ['target','rally','via'])if(remap.has(g[f]))g[f]=remap.get(g[f]);
  s.surfaceOutpostsVersion=1;s.seed=preservedSeed;
 }
 if(!s.growthVersion){for(const n of s.colonies){const p=PROFILES[n.role];n.populationCap=p.cap;n.growthInterval=p.interval;n.growthRate=1;n.targetPopulation=Math.max(n.initialPower||0,s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id).length);n.nextGrowthReview=s.time;}s.growthVersion=1;}
 for(const w of s.wildlife)w.sizeClass??='medium';for(const r of s.resources){r.id??=s.nextId++;r.known??=false;r.depletedAt??=null;r.height??=E.cell(s,r.k)?.elevation||0;}
 s.ecosystem??={lastCheck:s.time,next:Object.fromEntries(Object.entries(COOLDOWNS).map(([k,v])=>[k,s.time+v])),spawned:0};
}
function reviewGrowth(s,E){
 const active=E.workers(s).filter(a=>a.hp>0);s.playerActivePopulation=active.length;s.playerCombatStrength=active.reduce((n,a)=>n+(a.caste!=='soldier'?.25:({armor:1.5,jaw:1.25,acid:1.25,flyer:1.2}[a.soldierType]||1)),0);
 for(const n of s.colonies){if(n.fallen)continue;const p=PROFILES[n.role];if(s.time<(n.nextGrowthReview||0))continue;n.nextGrowthReview=s.time+90;n.targetPopulation=Math.min(n.populationCap,Math.max(n.initialPower||8,Math.round(active.length*p.ratio),(n.initialPower||8)+Math.floor(s.time/p.time)));n.workerShare=Math.max(.28,p.workers-(s.playerCombatStrength/Math.max(1,active.length)>.85?.08:0));n.specialShare=p.special;const rooms=s.enemyNests.find(t=>t.id===n.id)?.rooms||[];for(const r of rooms)if(!r.destroyed)r.maturity=Math.min(100,Math.max(r.maturity,s.time/24));}
}
function growthRate(n){const d=n.disabledRooms||[];return (d.includes('nursery')?.18:1)*(d.includes('store')?.55:1)*(d.includes('military')?.8:1);}
function birthJob(s,n,members){return members.filter(a=>a.caste!=='soldier').length<Math.ceil(n.targetPopulation*(n.workerShare??PROFILES[n.role].workers))||n.disabledRooms?.includes('military')?'forage':'combat';}
function guardTarget(s,n,a){const slots=[n.queenK,n.zones.defense,n.zones.patrol,n.zones.entry,s.enemyNests.find(t=>t.id===n.id)?.rooms.find(r=>r.type==='military')?.k??n.zones.defense];return slots[a.id%slots.length];}
function postWar(s,E){for(const n of s.colonies){if(!n.fallen)continue;n.clearedAt??=n.collapseAt??s.time;n.clearedOrderSerial??=s.commandSerial||0;for(const a of E.workers(s)){if(E.nestId(a.k)!==n.id)continue;const g=s.groups.find(g=>g.id===a.group),resource=s.resources.find(r=>r.amount>0&&(r.k===a.primary?.k||s.routes.some(t=>t.id===a.route&&t.k===r.k)));const aliveTarget=g&&(g.queenId!==undefined?s.colonies.some(c=>c.id===g.queenId&&!c.fallen):g.enemyRoomId!==undefined?false:g.wildlifeId!==undefined?s.wildlife.some(w=>w.id===g.wildlifeId&&!w.dead):false);
 if(a.carry||a.shellCarry||a.mineralCargo||a.pending||resource||a.project||a.roomProject||a.miningTask||aliveTarget)continue;
 // A later manual move/hold is valid until it completes. No TTL overrides it.
 if((a.manualOrderSerial??-1)>n.clearedOrderSerial&&(a.playerLocked||a.primary||a.job==='guard'))continue;
 if(a.returnHome)continue;E.clearWork(a);const core=s.queenK??E.HOME,room=s.rooms.find(r=>r.status==='active'&&r.type===(a.hp<a.maxHp*.7?'rest':a.caste==='soldier'?'military':'store')),anchor=room?.k??core,spots=[anchor,...E.neighbors(s,anchor)].filter(k=>!E.isSurface(s,k)&&E.nestId(k)===null);a.returnHome={nestId:n.id,target:spots[a.id%spots.length]??core,state:'RETURN_ENEMY_EXIT'};a.playerLocked=true;a.primary={kind:'postwarReturn'};
 }} }
function ecology(s,E){const eco=s.ecosystem;if(s.time-eco.lastCheck<30)return;eco.lastCheck=s.time;let sources=s.resources.filter(r=>r.amount>0&&E.isSurface(s,r.k)&&!r.queenCorpse),density=sources.reduce((n,r)=>n+r.amount,0);eco.surfaceFoodDensity=density;eco.foodSources=sources.length;
 const reachable=new Set([s.mainExit]),queue=[s.mainExit];for(let i=0;i<queue.length;i++)for(const k of E.neighbors(s,queue[i]))if(E.isSurface(s,k)&&!reachable.has(k)){reachable.add(k);queue.push(k)}
 const portals=[...(s.exits||[s.mainExit]),...s.enemyNests.map(n=>n.entry)],occupied=new Set([...s.resources.filter(r=>r.amount>0).map(r=>r.k),...s.wildlife.filter(w=>!w.dead).map(w=>w.k)]);
 const candidates=s.cells.filter(c=>E.isSurface(s,c)&&reachable.has(c.k??E.key(c.x,c.y))&&c.open&&!c.sealed&&['ground','plant','root','fungi'].includes(c.terrain)&&!occupied.has(c.k??E.key(c.x,c.y))&&!portals.some(k=>E.distance(c,E.xy(k))<2)&&!s.ants.some(a=>E.sameMap(s,a.k,c)&&E.distance(a,c)<5));
 const choose=type=>{const list=candidates.filter(c=>!occupied.has(c.k??E.key(c.x,c.y)));const poor=s.colonies.filter(n=>!n.fallen).sort((a,b)=>a.food-b.food)[0],origin=poor&&E.xy(poor.zones.entry);list.sort((a,b)=>(origin?(E.distance(a,origin)-E.distance(b,origin))*.1:0)+Number(a.seen)-Number(b.seen)+(type==='fungi'?(b.terrain==='root'||b.terrain==='fungi')-(a.terrain==='root'||a.terrain==='fungi'):0));if(!list.length)return null;return list[Math.floor(E.random(s)*Math.min(20,list.length))]};
 for(const type of ['seed','fungi']){if(s.time<eco.next[type]||density>=ECO.minimum||sources.length>=ECO.maxSources)continue;for(let batch=0;batch<2&&sources.length<ECO.maxSources&&density<ECO.maximum;batch++){const c=choose(type);if(!c)continue;const k=c.k??E.key(c.x,c.y),amount=Math.min(type==='seed'?140:100,ECO.maximum-density);s.resources.push({id:s.nextId++,k,name:type==='seed'?'新落種子':'新生菌簇',type,amount,max:amount,known:c.seen,depletedAt:null,height:c.elevation||0,bornAt:s.time,renewable:true});occupied.add(k);sources.push(s.resources.at(-1));density+=amount;eco.next[type]=s.time+COOLDOWNS[type];eco.spawned++;}}
 for(const size of ['small','medium','large']){const count=s.wildlife.filter(w=>!w.dead&&E.isSurface(s,w.k));if(s.time<eco.next[size]||count.length>=ECO.maxWildlife||count.filter(w=>w.sizeClass===size).length>=({small:5,medium:3,large:2}[size]))continue;const c=choose(size);if(!c)continue;const hp={small:8,medium:24,large:62}[size],k=c.k??E.key(c.x,c.y);s.wildlife.push({id:s.nextId++,k,x:c.x,y:c.y,sizeClass:size,kind:{small:'軟體幼蟲',medium:'森林甲蟲',large:'重甲兜蟲'}[size],hp,maxHp:hp,cooldown:0,dead:false,action:'覓食',height:c.elevation||0,bornAt:s.time});occupied.add(k);eco.next[size]=s.time+COOLDOWNS[size];eco.spawned++;}
 s.wildlife=s.wildlife.filter(w=>!w.dead||s.resources.some(r=>r.corpse&&r.k===w.k&&r.amount>0));s.resources=s.resources.filter(r=>r.amount>0||r.type==='sap'||s.routes.some(t=>t.k===r.k)||s.ants.some(a=>a.cargoTask===r.id));eco.surfaceFoodDensity=density;
}

function assault(s,a,E){const g=s.groups.find(g=>g.id===a.group);if(!g?.autoAssault||E.nestId(a.k)!==g.enemyNestId)return;const n=s.colonies.find(n=>n.id===g.enemyNestId);if(!n||n.fallen)return;
 const oldRoom=s.enemyNests.flatMap(n=>n.rooms).find(r=>r.id===g.enemyRoomId);if(s.time<(g.assaultReview||0)&&!oldRoom?.destroyed)return;g.assaultReview=s.time+.75;
 const known=new Set(),q=[a.k];known.add(a.k);let frontier=null;for(let i=0;i<q.length;i++)for(const k of E.neighbors(s,q[i])){if(E.nestId(k)!==n.id||known.has(k))continue;if(!E.cell(s,k).seen){frontier??=k;continue;}known.add(k);q.push(k);}
 const rooms=s.enemyNests.find(t=>t.id===n.id).rooms.filter(r=>r.type!=='royal'&&!r.destroyed&&known.has(r.k)).sort((r,t)=>E.distance(a,E.xy(r.k))-E.distance(a,E.xy(t.k)));delete g.enemyRoomId;delete g.queenId;
 if(rooms.length){g.enemyRoomId=rooms[0].id;g.target=rooms[0].k;}else if(known.has(n.queenK)){g.queenId=n.id;g.target=n.queenK;}else if(frontier!==null){g.target=frontier;}g.stance='attack';
}

function supply(s,E){for(const n of s.colonies){if(n.fallen||s.time<(n.nextSupply||0))continue;n.nextSupply=s.time+10;const workers=s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id&&a.caste!=='soldier').length;if(!workers||n.food>=60)continue;let budget=Math.min(60-n.food,3+workers*.4)*(n.disabledRooms?.includes('store')?.55:1);const entry=E.xy(n.zones.entry),sources=s.resources.filter(r=>r.amount>0&&!r.queenCorpse&&E.isSurface(s,r.k)&&E.distance(entry,E.xy(r.k))<18).sort((a,b)=>E.distance(entry,E.xy(a.k))-E.distance(entry,E.xy(b.k)));for(const r of sources){if(E.path(s,n.zones.entry,r.k)===null)continue;const amount=Math.min(r.amount,budget);r.amount-=amount;n.food+=amount;budget-=amount;n.supplyConsumed=(n.supplyConsumed||0)+amount;if(!r.amount)r.depletedAt=s.time;if(budget<=0)break;}}}
function tick(s,E){reviewGrowth(s,E);postWar(s,E);ecology(s,E);supply(s,E);}
const api={assault,init,tick,postWar,reviewGrowth,growthRate,birthJob,guardTarget,ecology,PROFILES,COOLDOWNS,ECO};if(typeof module!=='undefined')module.exports=api;root.AntReleaseRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
