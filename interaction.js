/* Direct-world commands. Existing simulation IDs stay private. */
(function(root){
  'use strict';
  const E=typeof module!=='undefined'?require('./engine.js'):root.AntEngine;
  function release(a,job='idle'){a.job=job;a.project=null;a.roomProject=null;a.miningTask=null;a.scoutTarget=null;a.group=null;a.route=null;a.care=null;a.guardTarget=null;a.goal=null;a.path=[];a.rallied=true;a.viaDone=true;a.retreat=0;a.primary=null;a.pending=null;a.playerLocked=false;}
  function available(s,k,exclude=[]){const priority=a=>a.job==='idle'?0:a.action==='回巢'?1:a.job==='scout'?2:a.job==='forage'?3:a.job==='nurse'&&!a.care?3:9;return E.laborers(s).filter(a=>!exclude.includes(a.id)&&!a.carry&&!a.shellCarry&&!a.mineralCargo&&!a.playerLocked&&!a.project&&!a.roomProject&&!a.primary&&a.retreat<=0&&priority(a)<9&&E.path(s,a.k,k)!==null).sort((a,b)=>priority(a)-priority(b)||E.distance(a,E.xy(k))-E.distance(b,E.xy(k)));}
  function localAnts(s,id){const anchor=E.workers(s).find(a=>a.id===id);if(!anchor)return [];return E.workers(s).filter(a=>anchor.group?a.group===anchor.group:E.distance(a,anchor)<=1.8&&!a.group).map(a=>a.id);}
  function order(s,ids,k,stance='defend'){
    if(s.ended)return {error:'蟻后已死亡，這個族群無法繼續活動。'};
    if(!E.expandToward(s,k)||!E.passable(s,k))return {error:'這裡還不能通行，請先探索相鄰方向。'};
    const selected=E.workers(s).filter(a=>ids.includes(a.id));
    if(!selected.length)return {error:'先點選附近的己方工蟻。'};
    if(selected.some(a=>E.path(s,a.k,k)===null))return {error:'有工蟻無法抵達，請先打通相連的通道。'};
    const chosen=new Set(selected.map(a=>a.id));
    let g=s.groups.find(g=>!E.workers(s).some(a=>a.group===g.id&&!chosen.has(a.id)));
    if(!g){g={id:`moving-${s.nextGroup++}`};s.groups.push(g);}
    g.explore=!E.cell(s,k).seen;delete g.queenId;
    g.target=k;g.rally=stance==='retreat'?k:selected[0].k;g.via=null;g.stance=stance;
    for(const a of selected){if(a.carry||a.shellCarry){a.pending={kind:'group',group:g.id};a.playerLocked=true;continue;}release(a,'combat');a.group=g.id;a.primary={kind:'group',group:g.id};a.playerLocked=true;}return {count:selected.length};
  }
  function gather(s,k,delta=1){
    const food=s.resources.find(r=>r.k===k);
    if(!food||!E.cell(s,k)?.seen||food.amount<=0||E.path(s,E.HOME,k)===null)return {error:'這裡沒有可帶回的食物，或回巢通道尚未打通。'};
    let route=s.routes.find(r=>r.k===k),created=false;
    if(delta<0){const a=E.workers(s,'forage').find(a=>a.route===route?.id);if(a)release(a);return {count:a?1:0};}
    if(!route){E.establishRoute(s,k);route=s.routes.find(r=>r.k===k);created=true;}route.active=true;route.desired??=2;if(created)return {count:E.workers(s,'forage').filter(a=>a.route===route.id).length};
    const a=available(s,k).find(a=>a.route!==route.id);if(!a)return {error:'目前沒有可以派出的工蟻。'};
    release(a,'forage');a.route=route.id;return {count:1};
  }
  function setGatherMode(s,k,mode='auto'){const food=s.resources.find(r=>r.k===k);if(!food||food.amount<=0||E.path(s,E.HOME,k)===null)return {error:'這裡尚未連通，無法建立採集。'};let route=s.routes.find(r=>r.k===k);if(!route){E.establishRoute(s,k);route=s.routes.find(r=>r.k===k);}route.active=true;route.mode=mode;route.createdAt??=s.time;route.lastProgressAt??=s.time;const w=E.workforce(s),desired=mode==='small'?1:mode==='half'?Math.max(1,Math.floor(w.automaticGatherLimit/2)):mode==='queen'?10:mode==='large'?Math.max(1,w.automaticGatherLimit):Math.max(1,Math.ceil(w.automaticGatherLimit/Math.max(1,s.routes.filter(r=>r.active!==false).length)));route.desired=Math.min(desired,food.amount<10?1:desired);let current=E.laborers(s,'forage').filter(a=>a.route===route.id);for(const a of current.filter(a=>!a.playerLocked&&!a.carry&&!a.shellCarry).slice(route.desired))release(a);let assigned=E.laborers(s,'forage').filter(a=>a.route===route.id).length,newly=0;for(const a of available(s,k)){if(assigned>=route.desired)break;release(a,'forage');E.assignFood(s,a,food);a.action='準備前往採集';assigned++;newly++;}current=E.laborers(s,'forage').filter(a=>a.route===route.id);route.assigned=current.length;route.assignedWorkers=current.map(a=>a.id);route.pending=Math.max(0,route.desired-route.assigned);route.state=route.assigned?'WORKER_ASSIGNED':'WAITING_FOR_WORKER';route.lastStateAt=s.time;return {count:route.assigned,assigned:newly,pending:route.pending};}
  function stopGather(s,k){const route=s.routes.find(r=>r.k===k);if(!route)return {count:0};route.active=false;let count=0;for(const a of E.laborers(s,'forage').filter(a=>a.route===route.id)){a.primary=null;a.pending=null;if(!a.carry&&!a.shellCarry){release(a);count++;}else{a.route=null;count++;}}return {count};}
  function guarding(s,k){const guards=E.workers(s,'guard');return guards.filter((a,i)=>{const target=a.guardTarget??s.guardPoints[i%s.guardPoints.length]??s.mainExit;return E.distance(E.xy(target),E.xy(k))<=(E.isSurface(s,k)?2:0);});}
  function guard(s,k,delta=1){
    if(!E.cell(s,k)?.seen||!E.passable(s,k))return {error:'這裡還不能駐守。'};
    const guards=guarding(s,k);if(delta<0){if(guards.length)release(guards[0]);return {count:guards.length?1:0};}
    const a=available(s,k,guards.map(a=>a.id))[0];if(!a)return {error:'目前沒有可以派出的工蟻。'};
    release(a,'guard');a.guardTarget=k;return {count:1};
  }
  function dig(s,k){if(!E.queueDig(s,k))return {error:'請選擇與已知通道相鄰的土層。'};if(!E.workers(s,'dig').length){const edge=E.adjacent(k).find(n=>E.passable(s,n)),a=available(s,edge??E.HOME)[0];if(a)release(a,'dig');}return {count:E.workers(s,'dig').length};}
  function scout(s,k){
    if(!E.isSurface(s,k)||!E.expandToward(s,k)||!E.passable(s,k))return {error:'請選擇附近的地表探索方向。'};
    let a=E.workers(s,'scout').sort((a,b)=>E.distance(a,E.xy(k))-E.distance(b,E.xy(k)))[0];
    if(!a){a=available(s,k)[0];if(!a)return {error:'目前沒有可以派出的工蟻。'};release(a,'scout');}
    a.scoutTarget=k;a.goal=null;a.path=[];return {count:1};
  }
  function care(s,id,delta){const b=s.broods.find(b=>b.id===id);if(!b)return {error:'這批幼蟲已長大。'};const nurses=E.laborers(s,'nurse');if(delta<0){const a=nurses.find(a=>a.care===id);if(a){a.care=null;a.job='idle';}return {count:a?1:0};}let a=nurses.find(a=>a.care===null&&!a.primary&&!a.carry);if(!a){a=E.laborers(s,'idle').find(a=>!a.carry&&!a.shellCarry&&!a.primary&&a.retreat<=0);if(!a)return {error:'目前沒有可調派工蟻。'};release(a,'nurse');}a.care=id;return {count:1};}
  function recall(s,k=E.HOME){const ants=available(s,E.HOME).filter(a=>E.distance(a,E.xy(k))<7);for(const a of ants)release(a);return {count:ants.length};}
  function standby(s,ids){const ants=E.laborers(s).filter(a=>ids.includes(a.id));for(const a of ants)release(a);return {count:ants.length};}
  function assignSelected(s,ids,job,target){const ants=E.laborers(s).filter(a=>ids.includes(a.id));if(!ants.length)return {error:'請先選取工蟻。'};if(job==='dig'){if(!E.cell(s,target)?.open&&!E.queueDig(s,target)&&!s.digQueue.includes(target))return {error:'目前尚未連通；請從相鄰土層開始，或使用自動開挖連接。'};for(const a of ants){release(a,'dig');a.playerLocked=true;}return {count:ants.length};}if(job==='care'){const brood=s.broods.find(b=>b.id===target);if(!brood)return {error:'找不到這批幼體。'};for(const a of ants){release(a,'nurse');a.care=brood.id;a.playerLocked=true;}return {count:ants.length};}if(job==='build'){const room=s.rooms.find(r=>r.id===target&&['planned','excavating','shaping'].includes(r.status));if(!room)return {error:'這項工程目前不需要工蟻。'};for(const a of ants){release(a,'dig');a.roomProject=room.id;a.primary={kind:'room',room:room.id};a.playerLocked=true;}return {count:ants.length};}if(job==='guard'){for(const a of ants){release(a,'guard');a.guardTarget=target;a.playerLocked=true;}return {count:ants.length};}return standby(s,ids);}
  function pick(targets,x,y,{moving=false,digging=false}={}){
    if(moving){const hits=overlaps(targets,x,y),intent=hits.find(t=>t.kind==='enemyQueen')||hits.find(t=>t.kind==='wildlife')||hits.find(t=>t.kind==='food')||hits.find(t=>t.kind==='enemy')||hits.find(t=>['exit','enemyNest'].includes(t.kind));if(intent)return intent;}
    return targets.filter(t=>!digging||(t.kind==='soil'&&t.diggable!==false)).map(t=>{const radius=digging?Math.max(36,t.radius||24):t.radius||24,d=Math.hypot(t.x-x,t.y-y),hit=d<=radius||(t.box&&x>=t.box.x&&x<=t.box.x+t.box.w&&y>=t.box.y&&y<=t.box.y+t.box.h),bias=t.kind==='ground'||t.kind==='soil'?12:0;return {t,hit,score:d/radius*25+bias};}).filter(v=>v.hit).sort((a,b)=>a.score-b.score)[0]?.t||null;
  }
  function overlaps(targets,x,y){const seen=new Set();return targets.filter(t=>!['ground','soil'].includes(t.kind)&&((Math.hypot(t.x-x,t.y-y)<=t.radius)||(t.box&&x>=t.box.x&&x<=t.box.x+t.box.w&&y>=t.box.y&&y<=t.box.y+t.box.h))).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).filter(t=>{const id=t.kind==='ants'?'ants':t.kind+':'+t.k;if(seen.has(id))return false;seen.add(id);return true;});}
  function direct(s,ids,hit,k){
    if(s.ended)return {error:s.won?'第一關已勝利，請重新開始。':'蟻后已死亡，請重新開始。'};
    const ants=E.workers(s).filter(a=>ids.includes(a.id));if(!ants.length)return {error:hit?.kind==='enemyNest'?'至少選取一隻兵蟻，才能發動敵巢遠征。':'先選取工蟻。'};
    if(hit?.kind==='deadQueen'){const corpse=s.resources.find(r=>r.queenCorpse&&r.k===k&&r.amount>0);if(!corpse)return {error:'敵方蟻后已死亡，敵巢正在瓦解。'};hit={kind:'food',k};}
    if(hit?.kind==='soil'){const result=assignSelected(s,ids,'dig',k);return {...result,text:result.error?'':'投入挖掘'};}if(E.cell(s,k)?.open&&E.cell(s,k)?.deposit>0){const result=E.mine(s,k,ants.length,ids);return {...result,text:result.error?'':'開始採掘'};}
    if(hit?.kind==='room'){const room=s.rooms.find(r=>r.id===hit.id);if(room&&room.status!=='active'){const result=assignSelected(s,ids,'build',room.id);return {...result,text:result.error?'':'投入施工'};}}
    if(hit?.kind==='food'){const r=s.resources.find(r=>r.k===k&&r.amount>0),gatherers=ants.filter(a=>a.caste!=='soldier');if(!r)return {error:'食物已耗盡。'};if(!gatherers.length)return {error:'兵蟻不負責採集，請選工蟻。'};if(gatherers.some(a=>E.path(s,a.k,k)===null))return {error:'這裡尚未連通。'};for(const a of gatherers){if(a.carry||a.shellCarry){a.pending={kind:'food',k};a.playerLocked=true;}else{release(a,'forage');E.assignFood(s,a,r);a.primary={kind:'food',k};a.playerLocked=true;a.action='準備前往採集';}}return {count:gatherers.length,text:r.queenCorpse?'開始搬運蟻后遺骸':'開始採集'};}
    if(hit?.kind==='enemyNest'){
      const colony=s.colonies.find(n=>n.id===hit.colony&&!n.fallen)||s.colonies.find(n=>!n.fallen&&E.xy(n.home).x===E.xy(k).x),soldiers=ants.filter(a=>a.caste==='soldier');
      if(!colony)return {error:'這座敵巢已經瓦解。'};
      if(!soldiers.length)return {error:'至少選取一隻兵蟻，才能發動敵巢遠征。'};
      if(ants.some(a=>E.path(s,a.k,colony.queenK)===null))return {error:'敵巢入口受阻，部隊目前無法進入。'};
      colony.queenKnown=true;
      const result=order(s,ids,colony.queenK,'attack');
      if(result.error)return result;
      const group=s.groups.find(g=>g.id===ants.find(a=>a.group)?.group);
      if(group){group.enemyNestId=colony.id;group.entryK=k;group.queenId=colony.id;group.enteredIds=[];group.entryStartedAt=s.time;group.entryAnnounced=false;group.command='ENTER_ENEMY_NEST';}
      const workers=ants.length-soldiers.length,text=workers?`${soldiers.length} 隻兵蟻與 ${workers} 隻工蟻正在進入敵巢。`:`兵蟻 ${soldiers.length} 隻正在進入敵巢。`;
      return {...result,text,entering:true};
    }
    const crossing=hit?.kind==='exit',destination=crossing&&ants.every(a=>E.isSurface(s,a.k))?E.HOME:k;
    const result=order(s,ids,destination,['enemy','enemyQueen','enemyNest','wildlife'].includes(hit?.kind)?'attack':'defend');
    if(!result.error&&hit?.kind==='enemyQueen'){const n=s.colonies.find(n=>n.id===hit.colony),g=s.groups.find(g=>g.id===ants.find(a=>a.group)?.group);if(n&&g)g.queenId=n.id;}
    if(!result.error&&hit?.kind==='wildlife'){const g=s.groups.find(g=>g.id===ants.find(a=>a.group)?.group);if(g)g.wildlifeId=hit.id;}
    return {...result,text:crossing?(destination===E.HOME?'開始返回地下王巢':'開始前往地表'):hit?.kind==='enemyNest'?'開始進攻敵巢':['enemy','enemyQueen','wildlife'].includes(hit?.kind)?'開始攻擊':!E.cell(s,k)?.seen?'開始探索':'開始移動'};
  }
  function nearby(s,ids){const anchors=E.workers(s).filter(a=>ids.includes(a.id));return E.workers(s).filter(a=>anchors.some(b=>E.distance(a,b)<3)).map(a=>a.id);}
  const api={release,available,localAnts,order,gather,setGatherMode,stopGather,guard,guarding,dig,scout,care,recall,standby,assignSelected,pick,overlaps,direct,nearby};if(typeof module!=='undefined')module.exports=api;root.AntInteraction=api;
})(typeof globalThis!=='undefined'?globalThis:this);
