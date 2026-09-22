/* Shared, deterministic simulation. Browser globals also allow opening index.html directly. */
(function (root) {
  'use strict';
  const W = 32, H = 23, JOBS = ['nurse', 'forage', 'dig', 'mine', 'scout', 'guard', 'combat'];
  const JOB_NAMES = {idle:'待命', nurse:'育幼', forage:'覓食', dig:'挖掘', mine:'採掘', scout:'偵察', guard:'警戒', combat:'作戰'};
  const ROOM_TYPES={nursery:{name:'育幼巢',color:'#b9c987'},store:{name:'儲食巢',color:'#c7a96c'},prey:{name:'獵物處理巢',color:'#b98163'},rest:{name:'休養巢',color:'#86aaa0'},military:{name:'軍事育成巢',color:'#b67563'},mutation:{name:'異變巢',color:'#8790ad'},royal:{name:'王室',color:'#d7c591'}};
  const SOLDIER_NAMES={normal:'普通兵蟻',armor:'重甲兵蟻',jaw:'巨顎兵蟻',acid:'吐酸兵蟻'};
  // Keep the original numeric keys readable in 0.1 saves; new chunks use coordinates.
  const key = (x,y) => x>=0&&x<W&&y>=0&&y<H?y*W+x:y<5?`s:${x},${y}`:`${x},${y}`;
  const surfaceKey = (x,y) => x>=0&&x<W&&y>=0&&y<5?key(x,y):`s:${x},${y}`;
  const xy = k => typeof k==='string'?{x:Number(k.replace(/^s:/,'').split(',')[0]),y:Number(k.replace(/^s:/,'').split(',')[1])}:{x:k%W,y:Math.floor(k/W)};
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const HOME = key(8,9), ENEMY_HOME = key(28,8);
  const CAMPAIGN={surface:{minX:-16,maxX:47,minY:-8,maxY:11},underground:{minX:-8,maxX:39,minY:5,maxY:44}};
  const MAP_RULES={playerEnemyMin:14,enemyEnemyMin:12,functionalNestRadius:9,enemyCoreBuffer:4};
  const ENEMY_ARCHETYPES=[
    {id:0,role:'deep_forest',name:'深林蟻族',x:39,y:34,queen:100,food:48,populationCap:28,initial:14,foragers:5,scouts:2,birthInterval:50,attackDelay:480,expeditionSize:9,cooldown:230,color:'#d89170',bias:'balanced'},
    {id:1,role:'near',name:'近鄰蟻族',x:22,y:12,queen:62,food:26,populationCap:15,initial:8,foragers:4,scouts:1,birthInterval:76,attackDelay:240,expeditionSize:4,cooldown:165,color:'#cfaa68',bias:'gather'},
    {id:2,role:'hunter',name:'獵殺蟻族',x:31,y:23,queen:80,food:32,populationCap:22,initial:12,foragers:3,scouts:2,birthInterval:58,attackDelay:330,expeditionSize:8,cooldown:150,color:'#d46f5d',bias:'attack'},
    {id:3,role:'armored',name:'甲殼蟻族',x:-6,y:23,queen:92,food:38,populationCap:20,initial:11,foragers:4,scouts:1,birthInterval:88,attackDelay:520,expeditionSize:6,cooldown:260,color:'#8f9e94',bias:'defend'}
  ];
  const ENEMY_LAYOUTS=[
    {near:[22,12],hunter:[31,23],armored:[-6,23],deep_forest:[39,34]},
    {near:[22,11],hunter:[32,22],armored:[-7,19],deep_forest:[38,34]},
    {near:[23,13],hunter:[32,26],armored:[-6,24],deep_forest:[39,34]}
  ];
  function validateEnemyLayout(layout,player=xy(HOME)){const entries=Object.entries(layout),errors=[],playerClearance=Math.max(MAP_RULES.playerEnemyMin,MAP_RULES.functionalNestRadius+MAP_RULES.enemyCoreBuffer);for(const [role,p] of entries){if(!inside(p[0],p[1],false))errors.push(`${role}:bounds`);if(distance(player,{x:p[0],y:p[1]})<playerClearance)errors.push(`${role}:player`);}for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(distance({x:entries[i][1][0],y:entries[i][1][1]},{x:entries[j][1][0],y:entries[j][1][1]})<MAP_RULES.enemyEnemyMin)errors.push(`${entries[i][0]}:${entries[j][0]}`);return {valid:!errors.length,errors};}
  function enemyLayout(seed){const start=(Number(seed)>>>0)%ENEMY_LAYOUTS.length;for(let i=0;i<ENEMY_LAYOUTS.length;i++){const layout=ENEMY_LAYOUTS[(start+i)%ENEMY_LAYOUTS.length];if(validateEnemyLayout(layout).valid)return layout;}throw new Error('No valid enemy colony layout');}
  const inside=(x,y,surface)=>{const b=surface?CAMPAIGN.surface:CAMPAIGN.underground;return x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY;};
  const tileKey=c=>c.k??key(c.x,c.y);
  function random(s) { s.seed = (Math.imul(s.seed,1664525)+1013904223)>>>0; return s.seed/4294967296; }
  function newWorldSeed(){try{const a=new Uint32Array(1);globalThis.crypto?.getRandomValues?.(a);if(a[0])return a[0];}catch{}return (Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;}
  const indices=new WeakMap(),pathCaches=new WeakMap(),activePathCache=new WeakSet();
  function isSurface(s,value){if(typeof value==='string'&&value.startsWith('s:'))return true;const c=typeof value==='object'?value:cell(s,value);return !!c&&(c.surface===true||c.surface===undefined&&c.y<5);}
  function adjacent(k) { const {x,y}=xy(k),surface=typeof k==='string'&&k.startsWith('s:')||typeof k==='number'&&y<5,out=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([,b])=>surface||b>=0).map(([a,b])=>surface?surfaceKey(a,b):key(a,b));if(surface&&y===4)out.push(key(x,5));return [...new Set(out)]; }
  function cell(s,k) {if(typeof k==='number'&&k<W*H)return s.cells[k];let i=indices.get(s);if(!i||i.length!==s.cells.length){i={length:s.cells.length,map:new Map(s.cells.map(c=>[c.k??key(c.x,c.y),c]))};indices.set(s,i);}return i.map.get(k);}
  function passable(s,k) { return !!cell(s,k)?.open && !cell(s,k).sealed; }
  function neighbors(s,k) {const here=cell(s,k);return adjacent(k).filter(n=>{const there=cell(s,n);return passable(s,n)&&(!isSurface(s,here)||Math.abs((here.elevation||0)-(there.elevation||0))<=1||here.climb||there.climb);});}
  function path(s,from,to,blocked) {
    if (from===to) return [];
    if (!passable(s,to)||!passable(s,from)) return null;
    const epoch=s.perf?.pathEpoch||0,cacheKey=blocked||!activePathCache.has(s)?null:`${typeof from}:${from}>${typeof to}:${to}`;let cache;
    if(cacheKey){cache=pathCaches.get(s);if(!cache||cache.epoch!==epoch){cache={epoch,map:new Map()};pathCaches.set(s,cache);}if(cache.map.has(cacheKey)){const saved=cache.map.get(cacheKey);return saved===null?null:[...saved];}}
    if(s.perf)s.perf.pathCalls=(s.perf.pathCalls||0)+1;
    const prev=new Map([[from,-1]]), queue=[from];
    for(let i=0;i<queue.length;i++) {
      for(const n of neighbors(s,queue[i])) {
        if(prev.has(n)||(blocked?.has(n)&&n!==to)) continue;
        prev.set(n,queue[i]);
        if(n===to) { const p=[]; for(let k=to;k!==from;k=prev.get(k)) p.unshift(k);if(cacheKey)cache.map.set(cacheKey,p); return [...p]; }
        queue.push(n);
      }
    }
    if(cacheKey)cache.map.set(cacheKey,null);return null;
  }
  const TASK={WAITING:'WAITING_FOR_WORKER',ASSIGNED:'WORKER_ASSIGNED',TRAVEL:'TRAVEL_TO_TARGET',WORKING:'WORKING',PICKUP:'PICKUP',CARRYING:'CARRYING',RETURNING:'RETURNING',DELIVERING:'DELIVERING',COMPLETE:'COMPLETE',BLOCKED:'BLOCKED'};
  function taskState(task,state,s,progress=task?.progress??0,reason=''){if(!task)return;task.state=state;task.progress=progress;task.updatedAt=s.time;if(progress>(task.lastProgress??-1)){task.lastProgress=progress;task.lastProgressAt=s.time;}if(reason)task.blockedReason=reason;else if(state!==TASK.BLOCKED)delete task.blockedReason;}
  function emit(s,text,urgent=false,k=HOME) {
    if(!text)return;
    if(/^(近期羽化|食物耗盡|王巢開始向|挖掘暫停|有螞蟻重傷|照護或食物不足)/.test(text))return;
    const strategic=/派出陌生|足跡|正在集結|遠征隊|勝利|覆滅|蟻后|王室|王國|階段|敵巢|特殊個體/.test(text),category=strategic?'important':/攻擊|接戰|交戰|敵蟻|傷亡|陣亡|重傷|退路|防線/.test(text)?'battle':/巢室|羽化|育幼|施工|擴建|採集|食物/.test(text)?'development':'exploration',ordinaryLoss=/隻己方螞蟻陣亡/.test(text),p=xy(k),battleZone=category==='battle'?(isSurface(s,k)?p.x<8?'西側採集區':p.x>18?'東側森林':'主巢入口':distance(p,xy(s.queenK??HOME))<5?'王室附近':'深層通道'):null;
    if(category==='battle'&&!ordinaryLoss){
      const ongoing=s.events.find(e=>e.category==='battle'&&e.battleZone===battleZone&&s.time-e.time<120);
      if(ongoing){ongoing.repeat=(ongoing.repeat||1)+1;ongoing.urgent=ongoing.urgent||urgent;ongoing.k=k;return;}
    }
    const repeatable=/派出陌生偵察蟻|在巢口外留下新鮮足跡|正在集結|遠征隊沿原路撤回|遠征隊遭到重創|食物供應開始吃緊|食物供應恢復穩定|短暫降雨|乾燥天氣|遷徙昆蟲/.test(text),same=s.events.find(e=>e.text.replace(/（重複 \d+ 次）$/,'')===text&&e.category===category&&(repeatable||s.time-e.time<35));
    if(same){same.repeat=(same.repeat||1)+1;same.urgent=same.urgent||urgent;same.k=k;return;}
    s.uiNotice={id:(s.nextNoticeId=(s.nextNoticeId||0)+1),time:s.time,text,urgent,k};
    const permanent=!ordinaryLoss&&(strategic||category==='battle'&&!s.events.some(e=>e.category==='battle'&&e.battleZone===battleZone)||/^近期王國摘要|功能巢|育幼巢|儲食巢|獵物處理巢|休養巢|軍事育成巢|異變巢|發現敵巢|地下發現敵國線索|地下發現可採掘|深處發現|第一條深層|主要敵國|食物供應開始|食物危機|食物供應瀕臨|食物供應恢復/.test(text));
    if(!permanent)return;
    const event={time:s.time,text,urgent,k,category,repeat:1};if(category==='battle')event.battleZone=battleZone;s.events.unshift(event);if(s.events.length>35)s.events.length=35;
  }
  function reveal(s,k,r=1) {const p=xy(k),surface=isSurface(s,k);for(let y=p.y-r;y<=p.y+r;y++)for(let x=p.x-r;x<=p.x+r;x++){if(!surface&&y<0)continue;const c=cell(s,surface?surfaceKey(x,y):key(x,y));if(c&&(surface||c.open&&Math.abs(x-p.x)+Math.abs(y-p.y)<=r||Math.abs(x-p.x)+Math.abs(y-p.y)<=1)){if(!c.seen)c.revealedAt=s.time;c.seen=true;}}}
  function ant(s,faction,k,job='idle',traits={pred:0,min:0}) {
    traits={jaw:0,shell:0,weight:traits.min*.5,acid:0,...traits};const p=xy(k),id=s.nextId++;return {id,faction,k,x:p.x,y:p.y,hp:10+traits.min*4,maxHp:10+traits.min*4,job,group:null,route:null,care:null,traits,goal:null,path:[],carry:0,mineralCargo:0,prey:false,action:'停留',cooldown:0,seen:[],retreat:0,age:0,exposure:0,colony:0,lifespan:900+(id*137%500),project:null,caste:'worker',soldierType:null,special:false,playerLocked:false};
  }
  function create(seed=72419) {
    seed=(Number(seed)>>>0)||72419;const s={version:1,seed,worldSeed:seed,time:0,speed:1,nextId:1,food:30,minerals:0,queen:100,enemyQueen:100,enemyFood:32,enemyQueensAlive:4,mobileBoxHintDone:false,eggsClock:0,enemyBirth:0,deaths:0,kills:0,births:0,preyMeals:0,wildlifeKills:0,battlePressure:0,discoveredMineral:false,discoveredBlack:false,won:false,ended:false,cells:[],ants:[],colonies:[],broods:[],routes:[],digQueue:[],miningTasks:[],wildlife:[],surfaceChunks:[],chunks:['0:s','1:s'],guardPoints:[key(8,6)],mainExit:key(8,4),scoutTargets:[key(5,3),key(15,3),key(24,3)],groups:[],events:[],regions:[{name:'主巢周邊',x:6,y:2,seen:true,ours:18,theirs:0},{name:'外圍覓食區',x:12,y:2,seen:false,ours:0,theirs:0},{name:'潮濕林緣',x:18,y:2,seen:false,ours:0,theirs:0},{name:'石塊狹道',x:23,y:2,seen:false,ours:0,theirs:12},{name:'遠方蟻群活動區',x:28,y:2,seen:false,ours:0,theirs:25}],resources:[]};
    s.perf={pathCalls:0};s.economy={income:0,consumption:0,recentIncome:0,recentConsumption:0,lastMinute:0,lastSummary:0,history:[],lastBirths:0,lastDeaths:0,lastRooms:0,lastDiscoveries:0,lastWorkers:9,lastSoldiers:0};
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
      const layer=y<8?'表土':y<13?'濕土':y<18?'黏土':'碎石';
      s.cells.push({x,y,open:y<5,seen:y<5&&x>=6&&x<=10,sealed:false,layer,work:0,ours:0,theirs:0,mark:false,deposit:0,feature:null});
    }
    // Every world keeps a safe lane, while terrain silhouettes and food locations vary by seed.
    const templates=[[[14,0],[14,1],[14,3],[21,0],[21,1],[21,3],[25,1],[25,2]],[[13,1],[13,2],[17,0],[17,3],[22,1],[22,2],[26,0],[26,3]],[[12,0],[12,2],[16,1],[16,3],[20,0],[20,2],[25,2],[27,3]]],template=templates[Math.floor(random(s)*templates.length)];
    for(const [x,y] of template)cell(s,key(x,y)).open=false;
    const layout=enemyLayout(s.worldSeed),deepPosition=layout.deep_forest;s.enemyHome=key(deepPosition[0],deepPosition[1]);s.regions[s.regions.length-1].x=deepPosition[0];
    function carve(points,seen=true){for(const [x,y]of points){cell(s,key(x,y)).open=true;cell(s,key(x,y)).seen=seen;}}
    carve([[8,5],[8,6],[8,7],[8,8],[8,9],[7,8],[7,9],[9,8],[9,9],[10,9],[10,10],[9,10],[8,10],[7,10],[6,9],[6,10],[6,11],[5,11],[8,11],[8,12],[9,12]]);
    for(const [x,y]of [[12,12],[13,12],[13,13],[14,13],[14,14],[15,14],[6,16],[7,16],[7,17]]){cell(s,key(x,y)).open=true;cell(s,key(x,y)).feature='天然小空洞';}
    cell(s,key(13,13)).strategicClue='被啃食的材料與陌生氣味';cell(s,key(7,17)).strategicClue='通往遠處的廢棄蟻道';
    for(const [x,y]of [[10,12],[11,13],[13,15],[7,15],[16,16]]) {cell(s,key(x,y)).deposit=12;cell(s,key(x,y)).feature='深灰色異常碎屑';}
    cell(s,key(12,18)).feature='黑色硬質碎片';
    for(let x=15;x<24;x++){cell(s,key(x,21)).feature='不明黑色表面';cell(s,key(x,21)).hard=true;}
    const safeSpots=[[3,2],[4,3],[11,2],[12,3],[17,2],[18,3]],foodTypes=[['seed','種子與植物碎屑',false],['insect','落葉下的小型獵物',true],['sap','植物汁液',false],['fruit','熟落的野果',false]];
    for(let i=0;i<5;i++){const spot=safeSpots.splice(Math.floor(random(s)*safeSpots.length),1)[0],kind=i===0?foodTypes[0]:i===1?foodTypes[2]:foodTypes[Math.floor(random(s)*foodTypes.length)],k=key(...spot),amount=80+Math.floor(random(s)*130);cell(s,k).open=true;s.resources.push({k,name:kind[1],amount,max:amount,type:kind[0],prey:kind[2],known:i<2,safeStart:i<2,depletedAt:null});}
    s.groups=['A','B','C'].map(id=>({id,target:key(8,6),rally:key(8,9),via:null,stance:'defend',preference:'any'}));
    if(s.worldSeed===72419)s.resources=[{k:key(4,3),name:'落葉下的小型獵物',amount:90,max:90,type:'insect',prey:true,known:false,depletedAt:null},{k:key(12,3),name:'腐木旁的昆蟲屍體',amount:180,max:180,type:'insect',prey:true,known:false,depletedAt:null},{k:key(18,2),name:'植物汁液',amount:250,max:250,type:'sap',prey:false,known:false,depletedAt:null},{k:key(23,3),name:'石縫中的小型獵物',amount:130,max:130,type:'insect',prey:true,known:false,depletedAt:null},{k:key(30,2),name:'未知食物碎屑',amount:150,max:150,type:'seed',prey:false,known:false,depletedAt:null}];
    s.seed=s.worldSeed;
    for(let i=0;i<9;i++)s.ants.push(ant(s,'player',HOME,['nurse','nurse','forage','forage','forage','dig','dig','scout','guard'][i]));
    for(const profile of ENEMY_ARCHETYPES){const [x,y]=layout[profile.role],adjusted={...profile,x,y};addColony(s,x,adjusted);}
    s.broods=[newBrood(s,3),newBrood(s,2)];s.broods[1].progress=12;
    for(const [x,y,name,amount] of [[21,3,'大型昆蟲殘骸',220],[26,2,'高蛋白獵物群',260],[30,3,'敵境邊緣食物堆',300]]){const k=surfaceKey(x,y),c=cell(s,k);if(c){c.open=true;c.climb=true;s.resources.push({k,name,amount,max:amount,type:'insect',prey:true,large:true,known:false,depletedAt:null,height:c.elevation||0});}}
    const initiallyKnown=s.cells.filter(c=>c.open&&c.seen).map(c=>key(c.x,c.y));
    for(const k of initiallyKnown)reveal(s,k,1);
    emit(s,'蟻后安定下來。九隻工蟻，開始建立第一條生存路線。');
    return upgrade(s);
  }
  function newBrood(s,count=2) {const adults=workers(s),inherit=adults.length?adults.reduce((n,a)=>n+a.traits.pred,0)/adults.length:0,qp=s.queenProfile||{protein:0,mutation:0,shell:0,maturity:0},nursery=s.rooms?.find(r=>r.id===s.formalNursery&&r.status==='active');
    const military=s.rooms?.find(r=>r.type==='military'&&r.status==='active'),committed=soldiers(s).length+(s.broods||[]).filter(b=>b.breed!=='worker').reduce((n,b)=>n+b.count,0),population=adults.length+(s.broods||[]).reduce((n,b)=>n+b.count,0);let breed='worker';
    if(military&&!['crisis','emergency'].includes(s.foodSafetyLevel)&&committed<Math.ceil(population*.28)){const focus=military.militaryFocus||'soldier',canSpecial=focus==='armor'||focus==='jaw'?s.shells>=1:focus==='acid'?s.minerals>=1&&roomEffect(s,'mutation')>0:true;if(focus==='soldier'){breed='soldier';s.protein=Math.max(0,s.protein-.25);}else if(canSpecial&&s.protein>=.5){breed=focus;s.protein=Math.max(0,s.protein-.5);if(focus==='armor'||focus==='jaw')s.shells=Math.max(0,s.shells-1);if(focus==='acid')s.minerals=Math.max(0,s.minerals-1);}else breed='soldier';}
    return {id:s.nextId++,count,stage:0,progress:0,feed:'normal',add:'none',wet:'normal',breed,pred:inherit*.1+Math.min(.12,qp.protein*.004),min:Math.min(.1,qp.mutation*.003),shell:Math.min(.08,qp.shell*.003),health:100,observed:false,autoCare:true,careNote:'尚未指定專屬照護。',k:nursery?.k??s.queenK??HOME,genetics:.78+random(s)*(.52-Math.min(.2,qp.maturity*.002))};}
  function workers(s,job) {return s.ants.filter(a=>a.faction==='player'&&(!job||a.job===job));}
  function laborers(s,job){return workers(s,job).filter(a=>a.caste!=='soldier');}
  function soldiers(s,type){return workers(s).filter(a=>a.caste==='soldier'&&(!type||a.soldierType===type));}
  function roomAt(s,k){return (s.rooms||[]).find(r=>r.cells?.includes(k)||r.k===k);}
  function roomEffect(s,type){return (s.rooms||[]).filter(r=>r.type===type&&r.status==='active').reduce((n,r)=>n+r.size*(.7+Math.min(1,r.maturity/100)*.3)*(r.policy==='capacity'?1.2:1),0);}
  function foodCapacity(s){return Math.floor(60+roomEffect(s,'store')*90);}
  function broodCapacity(s){return Math.floor(8+roomEffect(s,'nursery')*12+roomEffect(s,'military')*5);}
  function foodSafety(s){
    const pop=workers(s).length,larvae=s.broods.filter(b=>b.stage===1).reduce((n,b)=>n+b.count,0),burn=.035+workers(s).reduce((n,a)=>n+.011+a.traits.pred*.006+(a.caste==='soldier'?.006:0),0)+larvae*.03,seconds=s.food/Math.max(.01,burn),known=s.resources.filter(r=>r.amount>0&&r.known&&cell(s,r.k)?.seen&&path(s,HOME,r.k)!==null).reduce((n,r)=>n+r.amount,0),incomeRate=(s.economy?.recentIncome||0)/60,working=laborers(s,'forage').filter(a=>{const route=s.routes.find(r=>r.id===a.route),resource=route&&s.resources.find(r=>r.k===route.k&&r.amount>0);return !!resource&&(a.carry||a.shellCarry||a.k===resource.k||a.path?.length);}).length;
    let level=s.food<=Math.max(4,pop*.2)||seconds<22?'emergency':s.food<=Math.max(10,pop*.48)||seconds<50?'crisis':s.food<=Math.max(20,pop*.95)||seconds<105?'attention':'normal';const order=['normal','attention','crisis','emergency'];if(s.time>75&&incomeRate<burn*.9&&working<Math.max(2,Math.ceil(laborers(s).length*.3)))level=order[Math.max(order.indexOf(level),s.food<pop*.7?2:1)];
    return {level,pop,burn,seconds,known,working,incomeRate,trend:(s.economy?.recentIncome||0)-(s.economy?.recentConsumption||0)};
  }
  function nestStage(s){const pop=workers(s).length,rooms=(s.rooms||[]).filter(r=>r.status==='active').length,area=pressure(s).space,depth=Math.max(0,...s.cells.filter(c=>c.open&&c.seen&&!isSurface(s,c)).map(c=>c.y)),territory=s.regions.filter(r=>r.ours>r.theirs+8).length;if(pop>=100&&rooms>=6&&area>=120)return '蟻都';if(pop>=80&&rooms>=5&&depth>=28)return '深層王巢';if(pop>=50&&rooms>=4&&territory>=2)return '王巢';if(pop>=20&&rooms>=2&&area>=35)return '主巢';return '初生蟻巢';}
  function roomFootprint(s,k,radius=1){const p=xy(k),out=[];for(let y=p.y-radius;y<=p.y+radius;y++)for(let x=p.x-radius;x<=p.x+radius;x++){const q=key(x,y),c=cell(s,q);if(c?.open&&c.seen&&!c.sealed&&!isSurface(s,c))out.push(q);}return out;}
  function clearWork(a,job='idle'){a.job=job;a.group=null;a.route=null;a.care=null;a.project=null;a.roomProject=null;a.miningTask=null;a.primary=null;a.pending=null;a.goal=null;a.path=[];a.guardTarget=null;a.haulTask=null;a.rallied=true;a.viaDone=true;a.playerLocked=false;return a;}
  function careNeed(s){const efficiency=1+roomEffect(s,'nursery')*.55;return s.broods.filter(b=>b.stage<2&&b.autoCare!==false).reduce((n,b)=>n+Math.max(1,Math.ceil(b.count*.35/efficiency)),0);}
  function workforce(s){const all=laborers(s),counts={idle:0,nurse:0,forage:0,dig:0,mine:0,build:0,scout:0,guard:0,combat:0,returning:0,carrying:0,rest:0};for(const a of all){if(a.roomProject)counts.build++;else if(a.mineralCargo&&!a.miningTask){counts.returning++;counts.carrying++;}else if((a.carry||a.shellCarry)&&a.job==='forage'){counts.returning++;counts.carrying++;}else if(a.hp/a.maxHp<=.3)counts.rest++;else counts[a.job]=(counts[a.job]||0)+1;}const requiredCare=careNeed(s),standby=Math.max(1,Math.ceil(all.length*.12)),committed=counts.nurse+counts.dig+counts.mine+counts.build+counts.scout+counts.guard+counts.combat+counts.returning;return {total:all.length,...counts,requiredCare,standby,available:all.filter(a=>a.job==='idle'&&!a.primary&&!a.carry&&!a.shellCarry&&!a.mineralCargo&&a.retreat<=0).length,automaticGatherLimit:Math.max(0,all.length-requiredCare-standby-counts.dig-counts.mine-counts.build-counts.scout-counts.guard-counts.combat-counts.returning)};}
  function dispatchable(s,target,{includeGuards=false}={}){const protectedNurses=new Set(),nurses=laborers(s,'nurse'),efficiency=1+roomEffect(s,'nursery')*.55;for(const b of s.broods.filter(b=>b.stage<2&&b.autoCare!==false)){const need=Math.max(1,Math.ceil(b.count*.35/efficiency)),assigned=nurses.filter(a=>a.care===b.id);for(const a of assigned.slice(0,need))protectedNurses.add(a.id);}const rank=a=>a.job==='idle'?0:a.action==='回巢'?1:a.job==='scout'?2:a.job==='forage'?3:a.job==='nurse'&&!a.care?3:includeGuards&&a.job==='guard'?4:9;
    const pool=laborers(s).filter(a=>!a.carry&&!a.shellCarry&&!a.mineralCargo&&!a.playerLocked&&!a.primary&&!a.project&&!a.roomProject&&a.retreat<=0&&(a.manualCooldownUntil||0)<=s.time&&!protectedNurses.has(a.id)&&rank(a)<9);
    if(!pool.length||!passable(s,target))return [];
    // A single flood answers reachability for every candidate; repeated per-ant BFS became costly in a large nest.
    const reached=new Set([target]),queue=[target];for(let i=0;i<queue.length;i++)for(const k of neighbors(s,queue[i]))if(!reached.has(k)){reached.add(k);queue.push(k);}
    const destination=xy(target);return pool.filter(a=>reached.has(a.k)).sort((a,b)=>rank(a)-rank(b)||distance(a,destination)-distance(b,destination));}
  function roomPattern(center,size=1){const p=xy(center),radius=size===1?1:size,out=[];for(let y=p.y-radius;y<=p.y+radius;y++)for(let x=p.x-radius;x<=p.x+radius;x++)if(Math.abs(x-p.x)+Math.abs(y-p.y)<=radius+1)out.push(key(x,y));return out;}
  function roomSite(s,direction='auto',anchor=HOME){
    const origin=xy(anchor),vectors={left:[-1,.18],right:[1,.18],deep:[.12,1],core:[0,.65],entrance:[0,-1],auto:[s.rooms.length%2?-1:1,.65]};
    for(const [pass,v] of [vectors[direction]||vectors.auto,vectors.deep,vectors.right,vectors.left].entries()){
      for(let d=5;d<=30;d++){
        const x=Math.round(origin.x+v[0]*d+(d%3-1)),y=Math.max(7,Math.round(origin.y+v[1]*d));
        if(!inside(x,y,false)||!ensureChunk(s,x,y))continue;
        const k=key(x,y),pattern=roomPattern(k,1);
        if(pattern.some(q=>{const c=cell(s,q);return !c||c.hard||isSurface(s,c);})){continue;}
        if(s.colonies.some(n=>!n.fallen&&distance(xy(n.queenK??n.home),xy(k))<MAP_RULES.enemyCoreBuffer+2))continue;
        if(s.rooms.some(r=>distance(xy(r.k),xy(k))<7))continue;
        return k;
      }
    }
    return null;
  }
  function connectPlan(s,target){const open=s.cells.filter(c=>c.open&&c.seen&&!c.sealed&&!isSurface(s,c)&&!s.colonies.some(n=>distance(c,xy(n.home))<4)).sort((a,b)=>distance(a,xy(target))-distance(b,xy(target)))[0];if(!open)return [];const from={x:open.x,y:open.y},to=xy(target),cells=[];let x=from.x,y=from.y,flip=0;while(x!==to.x||y!==to.y){if((flip++%2===0&&x!==to.x)||y===to.y)x+=Math.sign(to.x-x);else y+=Math.sign(to.y-y);const k=key(x,y);ensureChunk(s,x,y);cells.push(k);}return cells;}
  function prepareRoomPlan(s,room){const planned=[...connectPlan(s,room.k),...roomPattern(room.k,room.targetSize||1)];room.planCells=[...new Set(planned)];for(const k of room.planCells){const c=cell(s,k);if(!c)continue;c.seen=true;c.hard=false;}room.cells=room.planCells.filter(k=>cell(s,k)?.open);room.status=room.planCells.every(k=>cell(s,k)?.open)?'shaping':'excavating';}
  function assignRoomWorkers(s,room,count=1){if(!room||!['planned','excavating','shaping'].includes(room.status))return 0;const pending=room.planCells?.find(k=>!cell(s,k)?.open&&adjacent(k).some(n=>passable(s,n))),target=room.status==='shaping'?room.k:pending!==undefined?adjacent(pending).find(n=>passable(s,n)):room.planCells?.find(k=>cell(s,k)?.open)??HOME,limit=Math.max(1,Math.floor(laborers(s).length*.35)),active=laborers(s).filter(a=>a.roomProject).length,pool=dispatchable(s,target).slice(0,Math.min(count,Math.max(0,limit-active)));for(const a of pool){clearWork(a,'dig');a.roomProject=room.id;a.primary={kind:'room',room:room.id};}return pool.length;}
  function requestRoom(s,type,direction='auto',anchor=HOME){if(!ROOM_TYPES[type])return {error:'未知的功能巢室。'};const safety=foodSafety(s),reserve=Math.max(5,workers(s).length*.32);if(['crisis','emergency'].includes(safety.level))return {error:'食物危機中，蟻群暫不接受新的非必要建設。'};if(s.food<5||s.food-5<reserve)return {error:`需要保留至少 ${Math.ceil(reserve)} 食物作為王國安全庫存。`};const k=roomSite(s,direction,anchor);if(k===null)return {error:'目前找不到安全的發展區域。'};const room={id:s.nextId++,k,type,cells:[],size:1,targetSize:1,status:'planned',progress:0,maturity:0,use:0,direction,policy:'balanced',lastGrowth:s.time};s.rooms.push(room);s.food-=5;s.economy.consumption+=5;prepareRoomPlan(s,room);const builders=Math.min(3,Math.max(1,Math.floor(laborers(s).length/8)));assignRoomWorkers(s,room,builders);emit(s,`${ROOM_TYPES[type].name}已列入建設，工蟻會自行開路與塑形。`,false,k);return room;}
  function requestRoyalAt(s,k){
    const c=cell(s,k);if(!c||isSurface(s,c)||!c.seen||!c.open||c.sealed)return {error:'請選擇已探索且可通行的地下空腔。'};
    if(path(s,s.queenK??HOME,k)===null)return {error:'蟻后與這裡之間沒有可通行的巢道。'};
    if((s.exits||[s.mainExit]).some(exit=>distance(xy(exit),xy(k))<5))return {error:'這裡太接近巢口，無法保護蟻后。'};
    if(s.rooms.some(r=>distance(xy(r.k),xy(k))<4))return {error:'這裡太靠近既有功能巢，請選另一個空腔。'};
    if(s.food<12)return {error:'建立新王室需要至少 12 食物。'};
    const room={id:s.nextId++,k,type:'royal',cells:[],size:1,targetSize:1,status:'planned',progress:0,maturity:0,use:0,direction:'chosen',policy:'quality',lastGrowth:s.time};s.rooms.push(room);s.food-=12;s.economy.consumption+=12;prepareRoomPlan(s,room);assignRoomWorkers(s,room,Math.min(4,Math.max(2,Math.floor(laborers(s).length/7))));emit(s,'新王室位置已確定，遷移路線正在形成。',true,k);return room;
  }
  function buildRoom(s,k,type){const c=cell(s,k);if(!ROOM_TYPES[type]||!c?.open||!c.seen||isSurface(s,c))return requestRoom(s,type,'auto',HOME);if(roomAt(s,k))return {error:'這裡已經屬於功能巢室。'};if(s.rooms.some(r=>distance(xy(r.k),xy(k))<4))return requestRoom(s,type,'auto',HOME);if(s.food<5)return {error:'塑形需要至少 5 食物。'};const cells=roomFootprint(s,k);if(cells.length<4)return requestRoom(s,type,'auto',k);const room={id:s.nextId++,k,type,cells:cells.slice(0,6),planCells:cells.slice(0,6),size:1,targetSize:1,status:'shaping',progress:0,maturity:0,use:0,policy:'balanced',lastGrowth:s.time};s.rooms.push(room);s.food-=5;assignRoomWorkers(s,room);emit(s,`${ROOM_TYPES[type].name}開始塑形。`,false,k);return room;}
  function expandRoom(s,id){const r=s.rooms.find(r=>r.id===id);if(!r||r.status!=='active')return {error:'巢室尚未完成。'};if(r.size>=3)return requestRoom(s,r.type,'auto',r.k);if(s.food<8*r.size)return {error:`需要 ${8*r.size} 食物提升${ROOM_TYPES[r.type].name}能力。`};const nextSize=r.size+1,planned=roomPattern(r.k,nextSize),blocked=planned.some(k=>{ensureChunk(s,...Object.values(xy(k)));const c=cell(s,k);return !c||c.hard||s.rooms.some(o=>o.id!==r.id&&distance(xy(o.k),xy(k))<2);});if(blocked){const alternative=requestRoom(s,r.type,'auto',r.k);if(!alternative.error){alternative.alternative=true;alternative.replacementFor=r.id;}return alternative;}s.food-=8*r.size;r.targetSize=nextSize;r.planCells=planned;r.progress=0;prepareRoomPlan(s,r);assignRoomWorkers(s,r,3);emit(s,`${ROOM_TYPES[r.type].name}開始自動擴大，工蟻會處理周邊空間。`,false,r.k);return r;}
  function recycleRoom(s,id){const room=s.rooms.find(r=>r.id===id&&r.status==='active');if(!room)return {error:'只能回收已完成的巢室。'};if(room.type==='royal'&&(s.queenK===room.k||s.royalTarget===room.id))return {error:'蟻后正在使用或前往這座王室，無法回收。'};if(room.id===s.formalNursery){const other=s.rooms.find(r=>r.id!==id&&r.type==='nursery'&&r.status==='active');s.formalNursery=other?.id??null;for(const brood of s.broods)brood.k=other?.k??s.queenK??HOME;s.temporaryNurseryRetired=!!other;}s.rooms=s.rooms.filter(r=>r.id!==id);emit(s,`${ROOM_TYPES[room.type].name}已回收，原地成為普通空腔。`,false,room.k);return {room};}
  function cancelRoom(s,id){const room=s.rooms.find(r=>r.id===id&&r.status!=='active');if(!room)return {error:'這項建設已經完成，無法取消施工。'};for(const a of laborers(s).filter(a=>a.roomProject===room.id))clearWork(a);s.rooms=s.rooms.filter(r=>r.id!==room.id);if(s.royalTarget===room.id)s.royalTarget=null;const refund=room.type==='royal'?6:2;s.food+=refund;emit(s,`${ROOM_TYPES[room.type].name}施工已取消，工蟻返回待命。`,false,room.k);return {room,refund};}
  function assign(s,job,delta) {
    if(!JOBS.includes(job))return false;
    const a=workers(s,delta>0?'idle':job).find(a=>delta<0||job!=='scout'||workers(s,'scout').length<3);
    if(!a)return false;
    a.job=delta>0?job:'idle';a.group=null;a.route=null;a.care=null;a.goal=null;a.path=[];return true;
  }
  function groupAdjust(s,id,delta) {
    const g=s.groups.find(g=>g.id===id);if(!g)return false;
    const available=workers(s,'combat').filter(a=>delta>0?!a.group:a.group===id);
    if(delta>0)available.sort((a,b)=>g.preference==='armor'?b.traits.min-a.traits.min:g.preference==='jaw'?b.traits.pred-a.traits.pred:a.id-b.id);
    const a=available[0];if(!a)return false;a.group=delta>0?id:null;a.goal=null;a.path=[];a.rallied=false;return true;
  }
  function allocateRoute(s,id,delta) {const a=workers(s,'forage').find(a=>delta>0?a.route===null:a.route===id);if(!a)return false;a.route=delta>0?id:null;a.path=[];a.goal=null;return true;}
  function establishRoute(s,k) {
    if(!s.resources.some(r=>r.k===k)||!cell(s,k).seen||!path(s,HOME,k))return false;
    let r=s.routes.find(r=>r.k===k);if(!r){const food=s.resources.find(food=>food.k===k);r={id:s.nextId++,k,state:TASK.WAITING,createdAt:s.time,lastProgressAt:s.time,assignedWorkers:[],pickedUp:0,delivered:0};if(food?.queenCorpse)Object.assign(r,{kind:'queenCorpse',corpseId:food.id,nestId:food.colony,targetLayer:'enemy_nest_underground',entranceK:surfaceKey(xy(k).x,4),phase:'TRAVEL_TO_ENTRANCE'});s.routes.push(r);emit(s,`已標記${food?.name||'食物'}，正在確認可用工蟻。`,false,k);}
    const free=workers(s,'forage').filter(a=>a.route===null);for(const a of free)a.route=r.id;
    return true;
  }
  function queueDig(s,k) {
    if(!cell(s,k))ensureChunk(s,...Object.values(xy(k)));
    const c=cell(s,k);if(!c||isSurface(s,c)||c.y<5||c.open||c.hard||s.digQueue.includes(k))return false;
    if(!adjacent(k).some(n=>(passable(s,n)&&cell(s,n).seen)||s.digQueue.includes(n)))return false;
    s.digQueue.push(k);c.seen=true;return true;
  }
  function seal(s,k) {
    const c=cell(s,k);if(!c?.seen||!c.open||c.y<4||k===HOME||s.colonies.some(n=>n.queenK===k))return '只能封閉或重開已知通道。';
    if(s.ants.some(a=>a.k===k||a.path[0]===k))return '通道內仍有螞蟻，請先撤離再封閉。';
    if(s.food<2)return '需要 2 食物維持封道作業。';
    c.sealed=!c.sealed;s.food-=2;if((s.exits||[]).includes(k)){c.wasExit=true;s.exits=s.exits.filter(q=>q!==k);}else if(!c.sealed&&c.wasExit)s.exits.push(k);for(const a of s.ants){a.path=[];a.goal=null;}
    emit(s,c.sealed?'通道已封閉。留意被切斷的退路。':'通道已重新開啟。');return null;
  }
  function createExit(s,k,kind='exit'){
    const c=cell(s,k),entrance=key(xy(k).x,4);
    if(!c?.exitCandidate||!c.open||c.sealed)return {error:'這裡還不是可整理的地表通道。'};
    if(kind==='exit'&&((s.exits?.length||1)>=3||(s.exits||[]).some(q=>Math.abs(xy(q).x-c.x)<5)))return {error:'副巢口至多兩處，且需與現有出口保持距離。'};
    c.exitCandidate=false;c.vent=kind==='vent';c.closedSurface=kind==='closed';
    if(kind==='exit'){if(!cell(s,entrance))ensureSurfaceChunk(s,c.x,4);const surface=cell(s,entrance);if(!surface)return {error:'地表邊界無法建立出口。'};s.exits??=[s.mainExit];s.exits.push(entrance);surface.seen=true;surface.open=true;emit(s,'新的副巢口已建立。',false,entrance);}
    else emit(s,kind==='vent'?'地表通氣孔已整理完成。':'通道保持封閉，沒有形成新巢口。',false,k);
    return {kind};
  }
  function move(s,a,target,dt,avoid=false) {
    if(target==null||!passable(s,target))return;
    if(a.k===target&&Math.abs(a.x-xy(target).x)<.01&&Math.abs(a.y-xy(target).y)<.01){a.goal=target;return;}
    if(a.goal!==target||!a.path.length||!passable(s,a.path[0])) {
      let blocked;
      if(avoid)blocked=new Set(s.ants.filter(b=>b.faction!==a.faction&&distance(a,b)<4).map(b=>b.k));
      a.path=path(s,a.k,target,blocked)||path(s,a.k,target)||[];a.goal=target;
    }
    if(!a.path.length)return;
    const next=a.path[0],p=xy(next);
    if(s.ants.some(b=>b.hp>0&&b.faction!==a.faction&&b.k===next&&distance(b,p)<.6)){
      a.action='戰鬥';if(avoid){a.path=[];a.goal=null;}return;
    }
    const health=a.hp/a.maxHp,injury=health<=.3?.58:health<=.7?.82:1,d=distance(a,p),terrain=cell(s,a.k)?.terrain,surfaceSpeed=terrain==='rock'?.82:terrain==='root'?.9:1,narrowSpeed=(cell(s,a.k)?.narrow||cell(s,next)?.narrow)?.72:1,speed=(1.05+a.traits.pred*.13-a.traits.min*.16-(a.traits.weight||0)*.06)*(a.carry?.83:1)*(a.retreat>0?1.18:1)*(cell(s,a.k).mark?1.15:1)*injury*surfaceSpeed*narrowSpeed;
    const step=dt*Math.max(.5,speed);
    if(d<=step){const wasSurface=isSurface(s,a.k),crossed=wasSurface!==isSurface(s,next);a.x=p.x;a.y=p.y;a.k=next;a.path.shift();if(crossed){a.layerTransitions??=[];a.layerTransitions.push({time:s.time,cargo:(a.carry||0)+(a.mineralCargo||0),task:a.cargoTask??a.miningTask??a.route??null});a.layerTransitions=a.layerTransitions.filter(t=>s.time-t.time<12);const same=a.layerTransitions.filter(t=>t.cargo===((a.carry||0)+(a.mineralCargo||0))&&t.task===(a.cargoTask??a.miningTask??a.route??null));const task=s.miningTasks.find(t=>t.id===(a.cargoTask??a.miningTask))||s.routes.find(t=>t.id===(a.cargoTask??a.route));if(a.haulTask&&task?.kind==='queenCorpse'){if(wasSurface&&!a.carry){a.haulTask.phase='TRAVEL_TO_CORPSE';task.phase='TRAVEL_TO_CORPSE';}else if(!wasSurface&&a.carry){a.haulTask.returnSurfaceReached=true;a.haulTask.phase='TRANSITIONING_HOME';task.phase='TRANSITIONING_HOME';}else if(wasSurface&&a.carry){a.haulTask.phase='RETURN_TO_STORAGE';task.phase='RETURN_TO_STORAGE';}a.haulTask.currentNode=next;}if(same.length>=3){a.path=[];a.goal=null;a.action='重新解析跨層路徑';if(task){task.stuckReason='portal_loop';task.portalLoopCount=(task.portalLoopCount||0)+1;task.retries=(task.retries||0)+1;task.lastPortalLoopAt=s.time;taskState(task,TASK.ASSIGNED,s,task.progress||0);if(a.haulTask){a.haulTask.phase=a.carry?'RETURN_TO_ENTRANCE':'TRAVEL_TO_ENTRANCE';a.haulTask.currentNode=next;}}}const group=s.groups.find(g=>g.id===a.group&&g.command==='ENTER_ENEMY_NEST');if(group&&wasSurface&&!isSurface(s,next)){group.enteredIds??=[];if(!group.enteredIds.includes(a.id))group.enteredIds.push(a.id);const alive=workers(s).filter(w=>w.group===group.id),inside=alive.filter(w=>!isSurface(s,w.k));group.entryState=inside.length===alive.length?'ENTERED':'ENTERING';if(inside.length===alive.length&&!group.entryAnnounced){group.entryAnnounced=true;const soldiers=inside.filter(w=>w.caste==='soldier').length,others=inside.length-soldiers;emit(s,others?`${soldiers} 隻兵蟻與 ${others} 隻工蟻已進入敵巢。`:`兵蟻 ${soldiers} 隻已進入敵巢。`,false,next);}}}}else{a.x+=(p.x-a.x)/d*step;a.y+=(p.y-a.y)/d*step;}
    a.action=a.retreat>0?'撤退':a.carry?'搬運':'行走';
  }
  function visible(s,a,b) {
    if(distance(a,b)> (a.job==='scout'?5:3.1))return false;
    const line=path(s,a.k,b.k);return line!==null&&line.length<=(a.job==='scout'?6:3);
  }
  function region(s,k) {const p=xy(k);return s.regions.reduce((r,n)=>distance(p,n)<distance(p,r)?n:r);}
  function width(s,k) {return cell(s,k).narrow?1:neighbors(s,k).length>=3?3:1;}
  function retreatThreat(s,a) {
    const home=a.faction==='player'?HOME:colony(s,a).home;
    const blocked=new Set(s.ants.filter(b=>b.faction!==a.faction&&b.hp>0).map(b=>b.k));
    return a.k!==home&&path(s,a.k,home,blocked)===null;
  }
  function updateBrood(s,dt) {
    const ns=laborers(s,'nurse'),free=ns.filter(a=>a.care===null&&distance(a,xy(HOME))<2),active=s.broods.filter(b=>b.stage<3),broodLoad=active.reduce((n,b)=>n+b.count,0),capacityFactor=Math.min(1,broodCapacity(s)/Math.max(1,broodLoad)),safety=foodSafety(s),ration={normal:1,attention:.82,crisis:.52,emergency:.18}[safety.level];
    for(const b of active){
      const carers=ns.filter(a=>a.care===b.id&&distance(a,xy(b.k??HOME))<2).length+free.filter(a=>distance(a,xy(b.k??HOME))<2).length/Math.max(1,active.length);
      const care=Math.min(1.5,carers/Math.max(.7,b.count*.35));
      const fed=s.food>0,wet=b.wet==='normal'?1:b.wet==='wet'?.93:.88;
      const nursery=roomAt(s,b.k??HOME)?.type==='nursery'?1+roomEffect(s,'nursery')*.22:1;b.progress+=dt*(fed?1:.12)*(b.stage===1?care:1)*wet*capacityFactor*nursery*ration/Math.max(1,s.pressure||1);
      if(b.stage===1){
        const broodFood=Math.min(s.food,dt*b.count*(b.feed==='protein'?.065:.03)*(.45+.55*ration));s.food=Math.max(0,s.food-broodFood);s.economy.consumption+=broodFood;
        if(!fed||care<.45)b.health-=dt*(fed?.25:1)/(1+roomEffect(s,'nursery')*.5);else b.health=Math.min(100,b.health+dt*(.08+roomEffect(s,'nursery')*.035));
        let refined=0;if(b.feed==='protein'&&s.protein>0){const need=dt*b.count*.018,used=Math.min(s.protein,need);s.protein-=used;refined=need?used/need:0;}
        b.pred+=dt*(b.feed==='protein'?.013:0)*(1+Math.min(.5,s.preyMeals/80)+Math.min(.3,s.battlePressure/50)+refined*.45)*(b.wet==='dry'?1.1:1);
        if(b.add==='mineral'&&s.minerals>dt*.02*b.count){s.minerals-=dt*.02*b.count;b.min+=dt*.015*(b.wet==='wet'?1.15:1);}
        if(b.add==='shell'&&s.shells>dt*.02*b.count){s.shells-=dt*.02*b.count;b.shell=(b.shell||0)+dt*.014;}
        if(!b.observed&&(b.min>.2||b.pred>.2)){b.observed=true;emit(s,`第 ${b.id} 批幼蟲出現細微外觀差異，育幼室已有觀察紀錄。`);}
        if(b.health<=0){b.count--;b.health=55;emit(s,'照護或食物不足，一隻幼蟲未能存活。',true);}
      }
      const duration=[28,48,32][b.stage];
      if(b.progress>=duration){b.progress=0;b.stage++;
        if(b.stage===2){for(const a of ns)if(a.care===b.id)a.care=null;b.lastCarers=0;b.careNote='本批幼蟲已蛹化，專屬照護結束。';}
        if(b.stage===3){let workerBorn=0,soldierBorn=0;const bornTypes=new Set();for(let i=0;i<b.count;i++){const genes=b.genetics||1,variant=random(s),min=Math.min(1.2,b.min*(.25+random(s)*1.25)*genes),pred=Math.min(1.2,b.pred*(.4+random(s))*genes),shell=(b.shell||0)*(.4+random(s));let traits={pred,min,jaw:(pred+min+shell)*(.1+variant*.55),shell,weight:min*(1-variant)+shell*.2,acid:0},type=null;
          const military=roomEffect(s,'military')>0,mutation=roomEffect(s,'mutation')>0;if(b.breed==='soldier'&&(military||random(s)<.3))type='normal';if(b.breed==='armor'&&military&&b.add==='shell')type='armor';if(b.breed==='jaw'&&military&&b.feed==='protein')type='jaw';if(b.breed==='acid'&&mutation&&b.add==='mineral')type='acid';
          if(type==='armor'){traits.min+=.55;traits.shell+=.65;traits.weight+=.45;}else if(type==='jaw'){traits.pred+=.45;traits.jaw+=.8;}else if(type==='acid'){traits.acid=.85;traits.pred+=.2;}else if(type==='normal'){traits.pred+=.25;traits.jaw+=.25;}
          const born=ant(s,'player',b.k??HOME,'idle',traits);if(type){born.caste='soldier';born.soldierType=type;born.maxHp*=1.35;born.hp=born.maxHp;soldierBorn++;bornTypes.add(type);}else workerBorn++;
          const specialChance=.018+Math.min(.06,s.births*.0007)+Math.min(.08,(b.min+b.pred+(b.shell||0))*.025)+roomEffect(s,'mutation')*.018;if(random(s)<specialChance){born.special=true;born.specialTrait=traits.acid>.6?'酸腺過度發育':traits.shell>.8?'雙重甲殼':traits.jaw>.8?'異常巨大巨顎':'異常大型個體';emit(s,`特殊個體羽化：${born.specialTrait}。`,true,b.k??HOME);}
          s.ants.push(born);s.births++;}
          s.hatchSummary.workers+=workerBorn;s.hatchSummary.soldiers+=soldierBorn;for(const type of bornTypes)if(!s.milestones['soldier-'+type]){s.milestones['soldier-'+type]=s.time;emit(s,`第一隻${SOLDIER_NAMES[type]}羽化。`,true,b.k??HOME);}}
      }
    }
    s.broods=s.broods.filter(b=>b.count>0&&b.stage<3);
    const broodIds=new Set(s.broods.map(b=>b.id));for(const a of ns)if(a.care!==null&&!broodIds.has(a.care))a.care=null;
    s.eggsClock+=dt*(s.queenRate??1);
    if(s.eggsClock>=48&&s.food>=7&&s.queen>0){s.eggsClock=0;s.food-=2;s.economy.consumption+=2;s.broods.push(newBrood(s));}
  }
  function finalizeResource(s,resource,route){
    if(!resource||resource.amount>0)return false;route??=s.routes.find(r=>r.k===resource.k);const routeId=route?.id,carrying=routeId!==undefined&&laborers(s).some(w=>(w.route===routeId||w.cargoTask===routeId)&&(w.carry||w.shellCarry));if(carrying)return false;
    if(routeId!==undefined)for(const w of laborers(s).filter(w=>w.route===routeId||w.cargoTask===routeId)){if(!w.carry&&!w.shellCarry){if(w.k===HOME){clearWork(w);w.idleSince=s.time+30;w.manualCooldownUntil=s.time+30;}else{w.primary=null;w.haulTask=null;w.goal=null;w.path=[];}}else{w.route=null;w.cargoTask=null;}}
    if(route){route.active=false;route.phase='COMPLETE';route.sourceCleared=true;taskState(route,TASK.COMPLETE,s,route.delivered||0);s.routes=s.routes.filter(r=>r!==route);}
    if(resource.type!=='sap')s.resources=s.resources.filter(r=>r!==resource);return true;
  }
  function finalizeMiningTask(s,task){
    if(!task)return;const c=cell(s,task.k);task.status='complete';task.completedAt=s.time;taskState(task,TASK.COMPLETE,s,task.delivered||0);for(const w of laborers(s).filter(w=>w.miningTask===task.id||w.cargoTask===task.id)){if(!(w.mineralCargo>0))clearWork(w);}
    if(c){c.deposit=0;c.depositPending=false;if(/碎屑/.test(c.feature||''))c.feature=null;}
  }
  function depositCargo(s,a){if(!a.carry&&!a.shellCarry)return;const amount=a.carry||0,processing=a.largePrey&&roomEffect(s,'prey')>0,queen=a.cargoType==='queen',gain=processing?amount*(queen?.9:.65):amount,capacity=foodCapacity(s);if(s.food<=capacity&&s.food+gain>capacity)s.foodOverflow=true;if(processing){s.protein+=amount*(queen?.7:.45);s.tissues+=amount*(queen?.22:.12);s.shells+=(a.shellCarry||0)+amount*(queen?.32:.18);s.preyProcessed=(s.preyProcessed||0)+amount;}else s.shells+=a.shellCarry||0;s.food+=gain;s.economy.income+=gain;s.stock??={};s.stock[a.cargoType||'other']=(s.stock[a.cargoType||'other']||0)+amount;if(a.prey)s.preyMeals+=amount;const route=s.routes.find(r=>r.id===a.route||r.id===a.cargoTask),resource=route&&s.resources.find(r=>r.k===route.k);if(route){route.delivered=(route.delivered||0)+amount;route.phase='DELIVERING';if(a.haulTask)a.haulTask.phase='DELIVERING';taskState(route,TASK.DELIVERING,s,route.delivered);}a.carry=0;a.shellCarry=0;a.prey=false;a.largePrey=false;a.cargoType=null;a.cargoTask=null;if(resource?.amount<=0)finalizeResource(s,resource,route);else if(route?.kind==='queenCorpse'){route.phase='TRAVEL_TO_ENTRANCE';if(a.haulTask){a.haulTask.phase='TRAVEL_TO_ENTRANCE';a.haulTask.returnSurfaceReached=false;}}}
  function cargoTarget(s,a){if(a.largePrey){const prey=(s.rooms||[]).filter(r=>r.type==='prey'&&r.status==='active'&&path(s,a.k,r.k)!==null).sort((r,q)=>distance(a,xy(r.k))-distance(a,xy(q.k)))[0];if(prey)return prey.k;}return HOME;}
  function restTarget(s,a){return (s.rooms||[]).filter(r=>r.type==='rest'&&r.status==='active'&&path(s,a.k,r.k)!==null).sort((r,q)=>distance(a,xy(r.k))-distance(a,xy(q.k)))[0]?.k??s.queenK??HOME;}
  function emergencyDefense(s,a,dt){if(a.faction!=='player'||a.hp/a.maxHp<=.3||a.carry||a.job==='nurse'&&a.care!==null)return false;const queenK=s.queenK??HOME,intruders=s.ants.filter(b=>b.faction==='enemy'&&isSurface(s,b.k)===isSurface(s,queenK)&&distance(b,xy(queenK))<6),foes=intruders.filter(b=>isSurface(s,a.k)===isSurface(s,b.k)&&distance(a,b)<(distance(b,xy(queenK))<2.5?6:3.5));if(!foes.length)return false;const allies=workers(s).filter(w=>isSurface(s,w.k)===isSurface(s,foes[0].k)&&w.hp/w.maxHp>.3&&!w.carry&&distance(w,foes[0])<4).sort((x,y)=>(y.caste==='soldier')-(x.caste==='soldier')||distance(x,foes[0])-distance(y,foes[0])),limit=Math.min(allies.length,Math.max(2,foes.length*2));if(!allies.slice(0,limit).some(w=>w.id===a.id))return false;const target=foes.sort((x,y)=>distance(a,x)-distance(a,y))[0];a.supporting=target.k;move(s,a,target.k,dt);a.action='巢穴防衛';return true;}
  function localDefense(s,a,dt){
    if(a.faction!=='player'||a.playerLocked||a.primary||a.carry||a.shellCarry||a.job==='nurse'||a.hp/a.maxHp<=.3)return false;
    const foes=s.ants.filter(b=>b.faction==='enemy'&&isSurface(s,b.k)===isSurface(s,a.k)&&distance(a,b)<(a.caste==='soldier'?4:2.2));
    if(!foes.length){a.defenseOrigin=null;return false;}
    const target=foes.sort((x,y)=>distance(a,x)-distance(a,y))[0];
    if(a.defenseOrigin&&distance(xy(a.defenseOrigin),target)>5){a.defenseOrigin=null;return false;}
    a.defenseOrigin??=a.k;move(s,a,target.k,dt);a.action='就近防衛';return true;
  }
  function playerJob(s,a,dt) {
    if(a.mineralCargo>0&&!a.miningTask){const core=s.queenK??HOME,task=s.miningTasks.find(t=>t.id===a.cargoTask);if(a.k===core&&s.time>=(a.mineralReadyAt||0)){const carried=a.mineralCargo;s.minerals+=carried;a.mineralCargo=0;a.mineralReadyAt=0;a.action='碎屑入庫';if(task){task.delivered=(task.delivered||0)+carried;const stillCarrying=laborers(s).some(w=>w.id!==a.id&&w.cargoTask===task.id&&(w.mineralCargo||0)>0);if(task.sourceDepleted&&!stillCarrying)finalizeMiningTask(s,task);else taskState(task,task.sourceDepleted?TASK.DELIVERING:TASK.WAITING,s,task.delivered);}a.cargoTask=null;}else if(a.k===core){if(task)taskState(task,TASK.DELIVERING,s,task.delivered||0);a.action='整理碎屑';return;}else{if(task)taskState(task,TASK.RETURNING,s,task.delivered||0);move(s,a,core,dt);a.action='搬運碎屑';return;}}
    if((a.carry||a.shellCarry)&&a.k===cargoTarget(s,a))depositCargo(s,a);
    if(a.carry||a.shellCarry){move(s,a,cargoTarget(s,a),dt);a.action='搬往獵物處理巢';return;}
    if(a.pending&&!a.carry&&!a.shellCarry&&(a.k===HOME||roomAt(s,a.k)?.type==='prey')){const pending=a.pending;a.pending=null;if(pending.kind==='group'){a.job='combat';a.group=pending.group;a.route=null;a.project=null;a.primary={kind:'group',group:pending.group};}else if(pending.kind==='food'){const r=s.resources.find(r=>r.k===pending.k&&r.amount>0);if(r){assignFood(s,a,r);a.primary={kind:'food',k:r.k};}}}
    const enemies=s.ants.filter(b=>b.faction==='enemy'&&visible(s,a,b));
    const g=s.groups.find(g=>g.id===a.group);
    if(a.playerLocked&&a.retreat>0&&a.hp/a.maxHp>.3&&!enemies.length)a.retreat=0;
    const directCombat=a.playerLocked&&a.job==='combat'&&g?.stance==='attack';
    if(a.retreat>0&&!directCombat){move(s,a,restTarget(s,a),dt,true);return;}
    const famineRunner=s.foodSafetyLevel==='emergency'&&s.food<=0&&a.job==='forage'&&a.k===HOME&&s.resources.some(r=>r.amount>0&&r.known&&cell(s,r.k)?.seen&&path(s,HOME,r.k)!==null&&!s.ants.some(e=>e.faction==='enemy'&&distance(e,xy(r.k))<3));
    if(a.hp/a.maxHp<=.3&&!a.playerLocked&&!famineRunner){a.retreat=Math.max(a.retreat,8);a.action='重傷回巢';move(s,a,restTarget(s,a),dt,true);return;}
    if(!a.playerLocked&&emergencyDefense(s,a,dt))return;
    if(!a.playerLocked&&localDefense(s,a,dt))return;
    if(!a.playerLocked&&reaction(s,a,dt))return;
    if(!['combat','guard'].includes(a.job)&&enemies.some(b=>distance(a,b)<1.45)){a.retreat=6;move(s,a,HOME,dt,true);return;}
    if(a.job==='forage'){
      const route=s.routes.find(r=>r.id===a.route),r=route&&s.resources.find(r=>r.k===route.k);
      if((a.carry||a.shellCarry)&&a.k===cargoTarget(s,a))depositCargo(s,a);
      if((!route||route.active===false)&&!a.carry&&!a.shellCarry){if(a.k===HOME){clearWork(a);a.idleSince=s.time+30;a.manualCooldownUntil=s.time+30;}else{move(s,a,HOME,dt);a.action='返回王巢待命';}return;}
      if(r&&!a.carry&&a.k===r.k&&r.amount>0){if(route?.kind==='queenCorpse'){route.phase='PICKUP';if(a.haulTask)a.haulTask.phase='PICKUP';}useFood(s,a,r);a.cargoTask=route.id;route.pickedUp=(route.pickedUp||0)+(a.carry||0);if(route?.kind==='queenCorpse'){route.phase='CARRYING';if(a.haulTask){a.haulTask.phase='CARRYING';a.haulTask.returnSurfaceReached=false;}}taskState(route,TASK.CARRYING,s,route.pickedUp);}
      if((!r||r.amount<=0)&&!a.carry&&a.k===HOME){clearWork(a);a.idleSince=s.time+30;a.manualCooldownUntil=s.time+30;return;}
      let destination=a.carry||a.shellCarry?cargoTarget(s,a):r&&r.amount>0?r.k:HOME;
      if(route?.kind==='queenCorpse'&&a.haulTask){if(a.carry||a.shellCarry){a.haulTask.phase=a.haulTask.returnSurfaceReached?'RETURN_TO_STORAGE':'RETURN_TO_ENTRANCE';route.phase=a.haulTask.phase;}else{a.haulTask.phase=isSurface(s,a.k)?'TRAVEL_TO_ENTRANCE':'TRAVEL_TO_CORPSE';route.phase=a.haulTask.phase;}a.haulTask.currentNode=a.k;}
      if(route)taskState(route,a.carry||a.shellCarry?TASK.RETURNING:a.k===r?.k?TASK.PICKUP:TASK.TRAVEL,s,route.pickedUp||0);move(s,a,destination,dt);return;
    }
    if(a.job==='scout'){
      const list=workers(s,'scout'),index=list.indexOf(a),t=a.scoutTarget??s.scoutTargets[index%s.scoutTargets.length];
      if(a.k===t){a.job='idle';a.scoutTarget=null;emit(s,'偵察蟻已查看這片區域。',false,t);return;}
      move(s,a,t,dt,true);return;
    }
    if(a.job==='mine'){
      const task=s.miningTasks.find(t=>t.id===a.miningTask&&t.status==='working'),c=task&&cell(s,task.k);
      if(!task||!c||c.deposit<=0){if(a.mineralCargo>0){a.miningTask=null;a.primary=null;a.playerLocked=false;}else clearWork(a);return;}
      taskState(task,a.k===task.k?TASK.WORKING:TASK.TRAVEL,s,task.collected||0);move(s,a,task.k,dt);if(a.k===task.k){a.action='採掘碎屑';const mined=Math.min(c.deposit,dt*(.22+(a.traits.min||0)*.08+(a.traits.jaw||0)*.05));c.deposit-=mined;task.collected=(task.collected||0)+mined;a.mineralCargo=(a.mineralCargo||0)+mined;a.cargoTask=task.id;taskState(task,TASK.WORKING,s,task.collected);s.discoveredMineral=true;if(a.mineralCargo>=3||c.deposit<=.01){a.miningTask=null;a.primary=null;a.playerLocked=false;a.mineralReadyAt=s.time+2.5;taskState(task,TASK.CARRYING,s,task.collected);}if(c.deposit<=.01){c.deposit=0;c.depositPending=true;task.sourceDepleted=true;for(const w of laborers(s).filter(w=>w.miningTask===task.id)){w.miningTask=null;w.primary=null;w.playerLocked=false;if((w.mineralCargo||0)>0){w.cargoTask=task.id;w.mineralReadyAt=s.time+2.5;}}const carrying=laborers(s).some(w=>w.cargoTask===task.id&&(w.mineralCargo||0)>0);if(!carrying)finalizeMiningTask(s,task);else taskState(task,TASK.CARRYING,s,task.delivered||0);emit(s,'異常碎屑已採掘完畢，工蟻正在搬回王巢。',false,task.k);}}
      return;
    }
    if(a.roomProject){const room=s.rooms.find(r=>r.id===a.roomProject&&['planned','excavating','shaping'].includes(r.status));if(!room){clearWork(a);return;}if(room.status==='planned')prepareRoomPlan(s,room);if(room.status==='excavating'){const target=room.planCells.find(k=>!cell(s,k)?.open&&adjacent(k).some(n=>passable(s,n)&&path(s,a.k,n)!==null));if(target!==undefined){const options=adjacent(target).filter(n=>passable(s,n)).map(n=>({k:n,p:path(s,a.k,n)})).filter(v=>v.p!==null).sort((b,c)=>b.p.length-c.p.length);if(options.length){move(s,a,options[0].k,dt);if(a.k===options[0].k){a.action='開挖巢室';const c=cell(s,target);c.work+=dt*(1+(a.traits.min||0)*.18+(a.traits.jaw||0)*.15);const needed={表土:8,濕土:13,黏土:21,碎石:32}[c.layer]||12;if(c.work>=needed){c.open=true;c.sealed=false;reveal(s,target,1);room.cells.push(target);}}}return;}if(room.planCells.every(k=>cell(s,k)?.open)){room.status='shaping';room.cells=[...room.planCells];room.progress=0;}else return;}move(s,a,room.k,dt);if(distance(a,xy(room.k))<1.4){a.action='塑形巢室';room.progress+=dt*(1+(a.traits.min||0)*.12);if(room.progress>=14*(room.targetSize||room.size)){room.size=room.targetSize||room.size;room.status='active';room.progress=100;if(room.replacementFor){const old=s.rooms.find(r=>r.id===room.replacementFor);if(old){if(s.formalNursery===old.id){s.formalNursery=room.id;for(const brood of s.broods)brood.k=room.k;}if(old.type==='royal'&&s.queenK===old.k)s.royalTarget=room.id;s.rooms=s.rooms.filter(r=>r.id!==old.id);emit(s,`${ROOM_TYPES[room.type].name}已搬遷接管，舊巢室成為普通空腔。`,false,room.k);}}for(const w of laborers(s).filter(w=>w.roomProject===room.id))clearWork(w);if(room.type==='nursery'&&!s.formalNursery){s.formalNursery=room.id;for(const b of s.broods)b.k=room.k;s.temporaryNurseryRetired=true;emit(s,'幼體已由工蟻移入正式育幼巢，原臨時育幼區恢復為普通空腔。',true,room.k);}emit(s,`${room.size>1?'大型':''}${ROOM_TYPES[room.type].name}形成。`,true,room.k);}}return;}
    if(a.job==='dig'){
      const own=s.projects.find(p=>p.id===a.project&&p.status==='working');if(own&&own.next==null)planProject(s,own);const target=own?own.next:s.digQueue.find(k=>!s.projects.some(p=>p.status==='working'&&p.next===k)&&adjacent(k).some(n=>passable(s,n)&&path(s,a.k,n)!==null));
      if(target!==undefined&&target!==null){const options=adjacent(target).filter(n=>passable(s,n)).map(n=>({k:n,p:path(s,a.k,n)})).filter(v=>v.p!==null).sort((a,b)=>a.p.length-b.p.length);if(options.length){move(s,a,options[0].k,dt);if(a.k===options[0].k){a.action='挖掘';const c=cell(s,target);c.work+=dt*(1+a.traits.min*.18+(a.traits.jaw||0)*.15);const needed={表土:8,濕土:13,黏土:21,碎石:32}[c.layer];if(c.work>=needed){c.open=true;s.digQueue=s.digQueue.filter(k=>k!==target);reveal(s,target,1);if(c.deposit){s.discoveredMineral=true;emit(s,'地下發現可採掘的異常碎屑。',false,target);}else if(c.feature){s.discoveredBlack||=c.feature.includes('黑');emit(s,`挖掘發現：${c.feature}。`,false,target);}finishedDig(s,target);if(c.y===5&&target!==s.mainExit){c.exitCandidate=true;emit(s,'通道接近地表，可選擇是否建立副巢口。',false,target);}}}}}else move(s,a,HOME,dt);return;
    }
    if(a.job==='combat'&&g){
      if(g.queenId!==undefined){const n=s.colonies.find(n=>n.id===g.queenId);if(n&&n.queen>0)g.target=n.queenK;}
      if(g.wildlifeId!==undefined){const prey=s.wildlife.find(w=>w.id===g.wildlifeId&&!w.dead);if(prey)g.target=prey.k;else delete g.wildlifeId;}
      if(g.stance==='retreat'){move(s,a,g.rally,dt,true);return;}
      if(!a.rallied){move(s,a,g.rally,dt);if(a.k===g.rally)a.rallied=true;return;}
      if(g.via!==null&&!a.viaDone){move(s,a,g.via,dt,g.stance==='avoid');if(a.k===g.via)a.viaDone=true;return;}
      const enteringEnemyNest=g.command==='ENTER_ENEMY_NEST'&&isSurface(s,a.k);if(g.stance==='attack'&&enemies.length&&!enteringEnemyNest){enemies.sort((b,c)=>distance(a,b)-distance(a,c));move(s,a,enemies[0].k,dt);a.action='追擊';}else{move(s,a,g.target,dt,g.stance==='avoid');if(enteringEnemyNest)a.action='前往敵巢入口';}
      if(a.k===g.target&&(g.stance==='defend'||g.stance==='attack'&&!enemies.length&&g.queenId===undefined&&g.wildlifeId===undefined)){clearWork(a);a.idleSince=s.time+30;a.manualCooldownUntil=s.time+30;}
      return;
    }
    if(a.job==='guard'){const gs=workers(s,'guard'),target=a.guardTarget??s.guardPoints[gs.indexOf(a)%s.guardPoints.length]??s.mainExit;move(s,a,target,dt);return;}
    if(a.job==='idle'){a.idleSince??=s.time;if(s.time-a.idleSince<6){a.action='待命';return;}const core=s.queenK??HOME,cp=xy(core),standPoints=[[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0]].map(([dx,dy])=>key(cp.x+dx,cp.y+dy)).filter(k=>passable(s,k)&&!isSurface(s,k)),rally=standPoints[a.id%Math.max(1,standPoints.length)]??core;move(s,a,rally,dt);a.action=a.k===rally?'安全區待命':'返回待命區';return;}
    a.idleSince=null;move(s,a,a.job==='nurse'?(s.broods.find(b=>b.id===a.care)?.k??HOME):s.queenK??HOME,dt);a.action=a.job==='nurse'?'育幼':'回巢';
  }
  function enemyJob(s,a,dt){
    const n=colony(s,a),home=n.home,entry=n.zones?.entry??surfaceKey(xy(home).x,4),nearPlayer=workers(s).some(b=>isSurface(s,b.k)===isSurface(s,a.k)&&distance(a,b)<8),active=a.expeditionTarget!=null||nearPlayer||n.threatUntil>s.time;
    if(!active&&s.time<(a.aiNextAt||0))return;if(!active){dt=Math.min(1.25,Math.max(dt,s.time-(a.lastAiAt??s.time-dt)));a.aiNextAt=s.time+1+(a.id%4)*.08;}a.lastAiAt=s.time;
    const seen=s.ants.filter(b=>b.faction==='player'&&visible(s,a,b)),friends=s.ants.filter(b=>b.faction==='enemy'&&b.colony===n.id&&distance(a,b)<3).length;
    const plannedFood=s.resources.find(r=>r.k===a.enemyFoodTarget&&r.amount>0),safeWindow=n.attackDelay??(n.role==='deep_forest'?480:300),safeRadius=a.job==='forage'?4.5:3.25,localForage=a.job==='forage'&&(Math.abs(a.x-xy(home).x)<=2||distance(a,xy(entry))<9||plannedFood&&distance(xy(entry),xy(plannedFood.k))<24);if(s.time<safeWindow&&distance(a,xy(home))>safeRadius&&!localForage){move(s,a,home,dt,true);a.action='留守敵國周邊';return;}
    if(n.fallen){a.action='逃離';const p=xy(home),escape=key(p.x+(a.id%2?6:-6),2);move(s,a,passable(s,escape)?escape:home,dt,true);return;}
    if(a.hp<a.maxHp*.35||seen.length>friends*1.6&&seen.length>2)a.retreat=6;
    if(a.retreat>0){move(s,a,home,dt,true);return;}
    if(n.threatUntil>s.time||n.strategy==='防守'&&distance(a,xy(home))>7&&!seen.length){move(s,a,n.queenK,dt);a.action='回防';return;}
    if(reaction(s,a,dt))return;
    if(a.expeditionTarget!=null){move(s,a,a.expeditionTarget,dt,true);a.action='遠征中';if(a.k===a.expeditionTarget){if(a.expeditionTarget===home)a.expeditionTarget=null;else a.expeditionTarget=home;}return;}
    if(seen.length){const target=seen.sort((b,c)=>distance(a,b)-distance(a,c))[0];if(a.job!=='forage'||seen.length<friends){a.chase=target.k;a.chaseUntil=s.time+8;move(s,a,target.k,dt);a.action='追擊';return;}move(s,a,home,dt,true);return;}
    if(a.chaseUntil>s.time){move(s,a,a.chase,dt);a.action='追擊';return;}
    if(a.job==='forage'){
      if(a.carry&&a.k===home){n.food+=a.carry;a.carry=0;}
      let r=s.resources.find(r=>r.k===a.enemyFoodTarget&&r.amount>0&&!(r.safeStart&&s.time<180));
      if(!r||s.time-(a.enemyFoodChoiceAt??-99)>8){
        const candidates=s.resources.filter(r=>r.amount>0&&!(r.safeStart&&s.time<180)&&distance(xy(entry),xy(r.k))<24).sort((b,c)=>distance(xy(entry),xy(b.k))-distance(xy(entry),xy(c.k)));
        r=candidates.find(candidate=>path(s,a.k,candidate.k)!==null);
        a.enemyFoodTarget=r?.k??null;a.enemyFoodChoiceAt=s.time;
      }
      if(r&&a.k===r.k&&!a.carry)useFood(s,a,r);move(s,a,a.carry?home:r?.k??home,dt,true);return;
    }
    const p=xy(home),exit=key(p.x,4);
    if(a.job==='scout'){move(s,a,key(p.x-5+(Math.floor(s.time/30)%2)*8,2),dt,true);return;}
    if(a.job==='combat'&&(n.strategy!=='進攻'||a.id%3!==0)){move(s,a,n.strategy==='恢復'?n.queenK:exit,dt);a.action=n.strategy==='恢復'?'補充兵力':'守衛敵巢外圍';return;}
    const food=s.resources.filter(r=>r.amount>0&&distance(xy(home),xy(r.k))<16).sort((b,c)=>cell(s,c.k).ours-cell(s,b.k).ours)[0];move(s,a,food?.k??exit,dt,true);a.action='爭奪資源';
  }
  function combat(s,dt) {
    const used=new Map();let clash=false;
    for(const a of s.ants){
      if(a.hp<=0||a.cooldown>0)continue;
      const g=s.groups.find(g=>g.id===a.group);
      const attackRange=a.traits.acid>.4?2.45:1.05,targets=s.ants.filter(b=>b.faction!==a.faction&&b.hp>0&&distance(a,b)<attackRange&&(a.traits.acid>.4?(path(s,a.k,b.k)?.length??99)<=3:b.k===a.k||neighbors(s,a.k).includes(b.k)));
      if(!targets.length)continue;
      const b=targets.sort((b,c)=>distance(a,b)-distance(a,c))[0],capacity=Math.min(width(s,a.k),width(s,b.k));
      const contact=`${a.faction}:${b.k}`;if((used.get(contact)||0)>=capacity)continue;used.set(contact,(used.get(contact)||0)+1);
      a.action='戰鬥';clash=true;a.cooldown=.9+random(s)*.35;
      const support=s.ants.filter(c=>c.faction===a.faction&&c.id!==a.id&&distance(c,a)<1.7).length;
      const attackers=s.ants.filter(c=>c.faction===a.faction&&distance(c,b)<1.5);
      const directions=new Set(attackers.map(c=>Math.abs(c.x-b.x)>Math.abs(c.y-b.y)?c.x>b.x?'E':'W':c.y>b.y?'S':'N'));
      const encircled=directions.size>=2&&retreatThreat(s,b);
      const familiarity=Math.min(.12,(a.faction==='player'?cell(s,a.k).ours:cell(s,a.k).theirs)*.004);
      let damage=(.65+a.traits.pred*.55+a.traits.acid*.5)*(1+Math.min(.3,support*.06)+familiarity)*(encircled?1.8:1)*(a.hp/a.maxHp*.65+.35)/(1+b.traits.min*.6+b.traits.shell*.35);
      if(a.traits.acid>.4&&distance(a,b)<1.1)damage*=.62;
      if(g?.stance==='avoid'||g?.stance==='retreat'||a.retreat>0)damage*=.45;
      damage*=(a.caste==='soldier'?1.22:1)/(b.caste==='soldier'?1.18:1);damage*=(1+(a.traits.jaw||0)*.25)/(1+(b.traits.shell||0)*.25);
      b.hp-=damage;b.lastHit=s.time;a.lastHit=s.time;a.exposure+=.01;s.battlePressure+=dt*.08;
      if(encircled&&b.faction==='player'&&s.time-(s.lastSurround||-99)>15){emit(s,'己方退路受到威脅！側後接敵的工蟻正承受更大傷亡。',true,b.k);s.lastSurround=s.time;}
    }
    if(clash&&s.time-(s.lastClash||-99)>18){const external=s.ants.find(a=>a.faction==='player'&&a.job==='forage'&&a.action==='戰鬥'),fight=external||s.ants.find(a=>a.faction==='player'&&a.action==='戰鬥');emit(s,external?'採集隊遭攻擊！請調整路線或派遣護衛。':'接戰發生。留意通道寬度、側路與撤退方向。',true,fight?.k??HOME);s.lastClash=s.time;}
    let fallenPlayer=0,fallenEnemy=0,lossK=HOME;for(const a of s.ants){if(a.hp>0)continue;if(a.faction==='player'){s.deaths++;fallenPlayer++;lossK=a.k;}else{s.kills++;fallenEnemy++;}}
    if(fallenPlayer)emit(s,`${fallenPlayer} 隻己方螞蟻陣亡，附近防線失去兵力。`,true,lossK);
    if(fallenEnemy&&s.kills%3<fallenEnemy)emit(s,'敵蟻受損，倖存者可能撤向巢穴。',false);
    s.ants=s.ants.filter(a=>a.hp>0);
  }
  function updateWildlife(s,dt){
    for(const w of s.wildlife){if(w.dead)continue;w.cooldown=Math.max(0,w.cooldown-dt);const hunters=workers(s,'combat').filter(a=>{const g=s.groups.find(g=>g.id===a.group);return g?.wildlifeId===w.id&&distance(a,w)<1.25&&(a.k===w.k||neighbors(s,a.k).includes(w.k));});
      if(hunters.length){w.action='防衛';for(const a of hunters.slice(0,Math.min(3,hunters.length)))if(a.cooldown<=0){w.hp-=((.45+a.traits.pred*.5+(a.traits.jaw||0)*.25)*(a.hp/a.maxHp*.65+.35));a.cooldown=.9;a.action='狩獵';}}
      const near=workers(s).filter(a=>distance(a,w)<1.3);if(near.length&&w.cooldown<=0){const a=near.sort((a,b)=>a.hp-b.hp)[0];a.hp-=1.15;w.cooldown=1.2;a.lastHit=s.time;w.action='反擊';}
      if(w.hp<=0){w.hp=0;w.dead=true;w.action='已死亡';s.wildlifeKills=(s.wildlifeKills||0)+1;const amount=55;s.resources.push({k:w.k,name:w.kind+'屍體',amount,max:amount,type:'insect',prey:true,large:true,known:true,depletedAt:null,height:w.height});const first=!s.milestones.firstHunt;s.milestones.firstHunt??=s.time;emit(s,first?'首次成功獵殺大型昆蟲，屍體現在可以採集。':'大型昆蟲倒下，屍體現在可以採集。',true,w.k);continue;}
      if(!hunters.length&&s.time-(w.lastMove||0)>4){let options=neighbors(s,w.k).filter(k=>isSurface(s,k)===isSurface(s,w.k));if(w.attractedTarget!=null){const toward=path(s,w.k,w.attractedTarget);if(toward?.length)options=[toward[0]];else if(w.k===w.attractedTarget)w.attractedTarget=null;}if(options.length){w.k=options[Math.floor(random(s)*options.length)];Object.assign(w,xy(w.k));w.height=cell(s,w.k).elevation||0;}w.lastMove=s.time;w.action=w.attractedTarget!=null?'循著氣味接近':'活動中';}
    }
  }
  function updateWorld(s,dt){
    const w=s.world,pop=workers(s).length,activeRoutes=s.routes.filter(r=>r.active!==false).length,surface=workers(s).filter(a=>isSurface(s,a.k)).length,deep=s.cells.filter(c=>c.open&&c.seen&&!isSurface(s,c)).reduce((m,c)=>Math.max(m,c.y),0);
    w.pressure=Math.max(0,pop/28+activeRoutes*.16+Math.max(0,s.food-70)/110+deep/90);w.attraction=Math.max(0,surface*.13+activeRoutes*.2+s.resources.filter(r=>r.amount<=0&&r.large).length*.25);w.hostility=Math.max(0,s.kills*.05+s.colonies.filter(n=>n.fallen).length*.65+s.battlePressure*.03);w.visibility=Math.min(3,s.regions.filter(r=>r.seen).length*.16+surface*.08);
    const risk=w.pressure+w.hostility+w.visibility*.25;
    w.expeditions??=w.expedition?[w.expedition]:[];w.clues??=[];w.clues=w.clues.filter(clue=>clue.until>s.time);
    if(s.time>180&&pop>=16&&risk>1.0&&w.expeditions.length<2){const candidates=s.colonies.filter(n=>!n.fallen&&n.strategy!=='恢復'&&s.time>(n.attackDelay??300)&&!w.expeditions.some(ex=>ex.source===n.id)&&s.time-(n.lastExpedition||-999)>=(n.cooldown??190)).sort((a,b)=>(a.lastExpedition||-999)-(b.lastExpedition||-999)||(a.bias==='attack'?-1:1));for(const n of candidates){if(w.expeditions.length>=2)break;const members=s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id);if(!passable(s,n.home)||members.length<4)continue;const scout=members.find(a=>a.job==='scout'&&!a.expeditionTarget)||members.find(a=>a.job==='forage'&&!a.expeditionTarget)||members.find(a=>!a.expeditionTarget);if(!scout)continue;scout.expeditionTarget=s.mainExit;n.lastExpedition=s.time;n.attackState='scouting';const ex={phase:'scout',started:s.time,source:n.id,ids:[scout.id],initialSize:1};w.expeditions.push(ex);w.lastThreat=s.time;emit(s,`${n.name||'敵方蟻群'}派出陌生偵察蟻，牠正沿活動痕跡接近。`,false,scout.k);}}
    for(const ex of [...w.expeditions]){const age=s.time-ex.started,n=s.colonies.find(n=>n.id===ex.source),alive=s.ants.filter(a=>ex.ids.includes(a.id)).length;
      if(ex.phase==='scout'&&age>22){ex.phase='tracks';w.clues.push({k:s.mainExit,source:ex.source,kind:'tracks',until:s.time+100});emit(s,`${n?.name||'敵方蟻群'}在巢口外留下新鮮足跡與陌生氣味。`,true,s.mainExit);}
      if(ex.phase==='tracks'&&age>43&&n&&!n.fallen){ex.phase='gathering';const available=s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id&&a.job!=='forage'&&!a.expeditionTarget),count=Math.min(n.expeditionSize??5,Math.max(2,Math.floor((available.length+ex.ids.length)*(n.bias==='attack'?.7:.55))));for(const a of available.slice(0,Math.max(0,count-ex.ids.length))){a.expeditionTarget=s.routes.find(r=>r.active!==false)?.k??s.mainExit;ex.ids.push(a.id);}ex.initialSize=ex.ids.length;n.attackState='gathering';w.clues.push({k:n.home,source:ex.source,kind:'gathering',until:s.time+90});emit(s,`${n.name||'敵方蟻群'}正在集結，採集區與巢口需要防備。`,true,n.home);}
      if(ex.phase==='gathering'&&age>65){ex.phase='advance';if(n)n.attackState='attacking';for(const a of s.ants.filter(a=>ex.ids.includes(a.id)))a.expeditionTarget=s.mainExit;emit(s,`${n?.name||'敵方蟻群'}的遠征隊開始逼近王巢。`,true,s.mainExit);}
      const routed=ex.initialSize>=3&&alive<=Math.floor(ex.initialSize*.45);if(routed&&n&&!n.fallen){n.recoveryUntil=Math.max(n.recoveryUntil||0,s.time+180);n.strategy='恢復';}
      if(age>155||!alive||n?.fallen||routed){for(const ant of s.ants.filter(a=>ex.ids.includes(a.id)))ant.expeditionTarget=n?.home??null;w.expeditions=w.expeditions.filter(q=>q!==ex);if(n&&!n.fallen){n.attackState='cooldown';w.clues.push({k:n.home,source:ex.source,kind:'retreat',until:s.time+140});}emit(s,routed?`${n?.name||'敵方蟻群'}的遠征隊遭到重創，正退回巢域恢復。`:`${n?.name||'敵方蟻群'}的遠征隊沿原路撤回。`,routed,s.mainExit);}}
    w.expedition=w.expeditions[0]||null;
    if(w.attraction>.8&&s.time-(w.lastWild||-160)>130){let creature=s.wildlife.find(q=>!q.dead&&isSurface(s,q.k));if(creature){creature.attractedTarget=s.routes.find(r=>r.active!==false)?.k??s.mainExit;w.lastWild=s.time;emit(s,`${creature.kind}正被食物與蟻群活動吸引過來。`,true,creature.k);}}
    if(s.time-w.lastEvent>150&&risk>.65){w.lastEvent=s.time;const choices=activeRoutes>1?['短暫降雨使植物汁液增加。','乾燥天氣讓露天食物更快變質。','遷徙昆蟲在森林邊緣留下大型屍體。']:['地下傳來輕微坍塌聲。','根系滲水改變了附近土層。'],text=choices[Math.floor(random(s)*choices.length)];w.event={text,until:s.time+55};if(text.includes('汁液'))for(const r of s.resources.filter(r=>r.type==='sap'))r.amount=Math.min(r.max,r.amount+18);if(text.includes('大型屍體')){const k=surfaceKey(2+Math.floor(random(s)*9),1+Math.floor(random(s)*3)),c=cell(s,k);if(c){c.open=true;s.resources.push({k,name:'遷徙昆蟲屍體',amount:65,max:65,type:'insect',prey:true,large:true,known:c.seen,depletedAt:null});}}emit(s,text,false,s.mainExit);}
  }
  function tick(s,dt=.25) {
    if(s.ended)return;
    s.time+=dt;s.perf??={pathCalls:0};s.perf.pathEpoch=(s.perf.pathEpoch||0)+1;activePathCache.add(s);s.battlePressure=Math.max(0,s.battlePressure-dt*.005);
    const royal=s.rooms.find(r=>r.type==='royal'&&r.status==='active'&&r.k===(s.royalTarget? s.rooms.find(q=>q.id===s.royalTarget)?.k:s.queenK));
    if(royal&&s.time-(s.lastRoyalGuard||-99)>8){
      s.lastRoyalGuard=s.time;const guards=workers(s,'guard').filter(a=>a.guardTarget===royal.k);
      const availableSoldiers=workers(s,'idle').filter(a=>a.caste==='soldier'&&!a.playerLocked&&path(s,a.k,royal.k)!==null);
      const reserve=[...availableSoldiers,...dispatchable(s,royal.k).filter(a=>a.job==='idle')];
      for(const a of reserve.slice(0,Math.max(0,2-guards.length))){clearWork(a,'guard');a.guardTarget=royal.k;}
    }
    if(s.royalTarget&&s.time-(s.lastQueenStep||0)>=4){const room=s.rooms.find(r=>r.id===s.royalTarget);if(room?.status==='active'){const steps=path(s,s.queenK??HOME,room.k);if(steps?.length){s.queenK=steps[0];for(const guard of workers(s,'guard').slice(0,3))guard.guardTarget=s.queenK;s.lastQueenStep=s.time;}else if(s.queenK===room.k){s.royalTarget=null;for(const guard of workers(s,'guard').slice(0,3))guard.guardTarget=room.k;emit(s,'蟻后已進入新王室，產卵與防衛核心一同轉移。',true,room.k);}}}
    s.economy??={income:0,consumption:0,recentIncome:0,recentConsumption:0,lastMinute:s.time,history:[]};maintain(s,dt);
    updateWorld(s,dt);
    const upkeep=Math.min(s.food,dt*(.035+workers(s).reduce((n,a)=>n+.011+a.traits.pred*.006+(a.caste==='soldier'?.006:0),0)));s.food=Math.max(0,s.food-upkeep);s.economy.consumption+=upkeep;
    if(s.foodOverflow){const capacity=foodCapacity(s);if(s.food>capacity)s.food=Math.max(capacity,s.food-dt*(s.food-capacity)*.004);else s.foodOverflow=false;}
    for(const n of s.colonies)n.food=Math.max(0,n.food-dt*(.035+s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id).length*.012));
    updateBrood(s,dt);
    for(const c of s.cells){c.ours=Math.max(0,c.ours-dt*.05);c.theirs=Math.max(0,c.theirs-dt*.05);if(c.bait)c.bait=Math.max(0,c.bait-dt*.04);}
    for(const r of s.regions){r.ours=Math.max(0,r.ours-dt*.08);r.theirs=Math.max(0,r.theirs-dt*.08);}
    for(const a of s.ants){
      a.cooldown=Math.max(0,a.cooldown-dt);a.retreat=Math.max(0,a.retreat-dt);a.age+=dt;
      if(a.faction==='player'){
        if(isSurface(s,a.k)&&(a.job==='scout'||s.groups.find(g=>g.id===a.group)?.explore)){const b=bounds(s,true);if(a.x>b.maxX-2)ensureSurfaceChunk(s,b.maxX+1,a.y);if(a.x<b.minX+2)ensureSurfaceChunk(s,b.minX-1,a.y);if(a.y>b.maxY-2)ensureSurfaceChunk(s,a.x,b.maxY+1);if(a.y<b.minY+2)ensureSurfaceChunk(s,a.x,b.minY-1);}
        playerJob(s,a,dt);reveal(s,a.k,a.job==='scout'?3:1);
        if(s.food<=0){s.foodZeroSince??=s.time;const hungryFor=s.time-s.foodZeroSince;if(hungryFor>90){const protectedForager=a.job==='forage'||a.carry,rate=hungryFor>260?.024:.007;a.hp-=dt*rate*(protectedForager?.45:a.caste==='soldier'?1.05:1);}}else{delete s.foodZeroSince;if(a.k===HOME&&a.age<a.lifespan)a.hp=Math.min(a.maxHp,a.hp+dt*.09);}
        if(isSurface(s,a.k)){const r=region(s,a.k);r.seen=true;r.ours=Math.min(100,r.ours+dt*.3);}
      }else {enemyJob(s,a,dt);const n=colony(s,a);if(n.food<=0)a.hp-=dt*.035;else if(a.k===n.home&&a.age<a.lifespan)a.hp=Math.min(a.maxHp,a.hp+dt*.09);if(isSurface(s,a.k)){const r=region(s,a.k);r.theirs=Math.min(100,r.theirs+dt*(n.fallen?0:.25));}}
      const c=cell(s,a.k);if(c)c[a.faction==='player'?'ours':'theirs']=Math.min(60,c[a.faction==='player'?'ours':'theirs']+dt*(a.job==='guard'?1.8:1));
    }
    updateWildlife(s,dt);combat(s,dt);
    const intruders=s.ants.filter(a=>a.faction==='enemy'&&a.k===(s.queenK??HOME)),raiders=s.ants.filter(a=>a.faction==='player'&&a.job==='combat'&&a.k===ENEMY_HOME);
    const defenders=s.ants.filter(a=>a.faction==='player'&&distance(a,xy(s.queenK??HOME))<1.5);
    const enemyDefenders=s.ants.filter(a=>a.faction==='enemy'&&distance(a,xy(ENEMY_HOME))<1.5);
    if(intruders.length){s.queen-=dt*intruders.length/(1+defenders.length);if(s.time-(s.lastQueen||-99)>12){emit(s,'蟻后區域受威脅！敵蟻已深入育幼室。',true);s.lastQueen=s.time;}if(s.broods.length)s.broods[0].health-=dt*intruders.length*.6;}
    for(const n of s.colonies){
      if(n.fallen){n.destroyed=true;n.alive=false;n.aiState='COLLAPSE';n.strategy='崩潰';continue;}
      const attackers=workers(s,'combat').filter(a=>distance(a,xy(n.queenK))<1.2&&(a.k===n.queenK||neighbors(s,a.k).includes(n.queenK))),defenders=s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id&&distance(a,xy(n.queenK))<2);
      if(attackers.length){n.queen-=dt*attackers.length*1.2/(1+defenders.length*.3);n.threatUntil=s.time+10;for(const a of attackers)a.action='攻擊蟻后';
        if(!n.retreated&&n.queen<60){const retreat=neighbors(s,n.queenK).find(k=>distance(xy(k),xy(n.home))<=2&&!workers(s).some(a=>a.k===k));if(retreat){n.queenK=retreat;n.retreated=true;}}
      }
      if(n.queen<=0){n.queen=0;n.fallen=true;n.destroyed=true;n.alive=false;n.collapseAt=s.time;n.aiState='COLLAPSE';n.strategy='崩潰';n.attackState='stopped';n.recoveryState='destroyed';s.world.expeditions=s.world.expeditions.filter(ex=>ex.source!==n.id);for(const a of s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id))a.expeditionTarget=null;s.milestones.firstEnemyNest??=s.time;if(!s.resources.some(r=>r.queenCorpse&&r.colony===n.id)){const corpse={id:s.nextId++,k:n.queenK,name:`${n.name}蟻后遺骸`,amount:120,max:120,type:'queen',prey:true,large:true,queenCorpse:true,colony:n.id,freshness:100,known:true,depletedAt:null};s.resources.push(corpse);n.corpseResourceK=n.queenK;n.corpseResourceId=corpse.id;}emit(s,`${n.name}蟻后已死亡，該蟻國開始崩潰。`,true,n.queenK);for(const r of s.regions)if(Math.abs(r.x-xy(n.home).x)<7)r.theirs*=.2;continue;}
      let members=s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id);if(members.length)delete n.zeroPopulationSince;else n.zeroPopulationSince??=s.time;
      if(!members.length&&(n.losses||0)>0&&s.time-(n.zeroPopulationSince??s.time)>=180&&s.time-(n.lastEmergencyBrood??-999)>=180){
        const entry=n.zones?.entry??surfaceKey(xy(n.home).x,4),reserve=s.resources.filter(r=>r.amount>=8&&!r.queenCorpse&&distance(xy(entry),xy(r.k))<=24&&path(s,n.home,r.k)!==null).sort((a,b)=>distance(xy(entry),xy(a.k))-distance(xy(entry),xy(b.k)))[0];
        if(reserve){reserve.amount-=8;if(reserve.amount<=0){reserve.amount=0;reserve.depletedAt=s.time;}const born=ant(s,'enemy',n.home,'forage');born.colony=n.id;s.ants.push(born);members=[born];n.lastEmergencyBrood=s.time;n.recoveryUntil=s.time+180;n.food=Math.max(n.food,4);delete n.zeroPopulationSince;}
      }
      const enemyWorkers=members.filter(a=>a.caste!=='soldier'),enemySoldiers=members.filter(a=>a.caste==='soldier'),combatants=members.filter(a=>a.job!=='forage').length,recovering=(n.recoveryUntil||0)>s.time,weak=members.length<Math.max(4,(n.populationCap||18)*.45);n.population=members.length;n.workers=enemyWorkers.length;n.soldiers=enemySoldiers.length;n.combatStrength=members.reduce((sum,a)=>sum+a.hp*(1+a.traits.pred*.25+a.traits.min*.2+a.traits.shell*.15),0);n.economicState=n.food<8?'shortage':n.food<20?'strained':'stable';n.knownTerritory=s.regions.filter(r=>Math.abs(r.x-xy(n.home).x)<7&&r.theirs>5).length;n.resourceRoutes=[...new Set(enemyWorkers.map(a=>a.enemyFoodTarget).filter(k=>k!=null))];n.losses=Math.max(n.losses||0,(n.initialPower||members.length)-members.length);n.defenseState=n.threatUntil>s.time?'mobilized':n.bias==='defend'?'fortified':'guarding';n.recoveryState=recovering?'recovering':weak?'weakened':'stable';
      n.aiState=recovering?'RECOVER':n.threatUntil>s.time?'DEFEND':n.food<8?'GATHER':weak?'GROW':n.role==='hunter'?'ATTACK':n.bias==='defend'?'DEFEND':combatants>=Math.max(5,(n.populationCap||18)*.45)?'PRESSURE':'PATROL';n.strategy={RECOVER:'恢復',DEFEND:'防守',GATHER:'採集',GROW:'成長',ATTACK:'進攻',PRESSURE:'施壓',PATROL:'巡邏'}[n.aiState]||'活動中';
      n.birth+=dt;n.brood??={workers:0,soldiers:0,progress:0};n.brood.progress=Math.min(1,n.birth/(n.birthInterval||72));if(n.birth>=(n.birthInterval||72)&&n.food>10&&members.length<(n.populationCap||18)){n.birth=0;n.brood.progress=0;n.food-=5;const workerShare=n.bias==='attack'?.28:n.bias==='defend'?.42:.48,job=enemyWorkers.length<Math.ceil(n.populationCap*workerShare)?'forage':'combat',born=ant(s,'enemy',n.home,job);born.colony=n.id;if(job==='combat'){born.caste='soldier';born.soldierType='normal';born.maxHp+=n.role==='armored'?8:n.role==='hunter'?3:n.role==='deep_forest'?4:1;born.hp=born.maxHp;born.traits.pred+=n.role==='hunter'?.32:n.role==='deep_forest'?.18:.08;born.traits.min+=n.role==='armored'?.55:n.role==='deep_forest'?.18:.05;born.traits.shell+=n.role==='armored'?.5:.08;n.brood.soldiers++;}else n.brood.workers++;s.ants.push(born);}
    }
    if(s.food<=0&&s.time-(s.foodZeroSince||s.time)>180)s.queen-=dt*.018;else if(!intruders.length&&workers(s,'nurse').length&&s.queen<100)s.queen=Math.min(100,s.queen+dt*(.035+roomEffect(s,'rest')*.01));
    if(s.queen<=0){s.queen=0;s.ended=true;s.speed=0;emit(s,'蟻后死亡，這個族群的故事在此結束。可以重新開局嘗試另一種策略。',true);}
    const mainEnemy=s.colonies.find(n=>n.role==='deep_forest')||s.colonies[0];s.enemyQueen=mainEnemy?.queen||0;s.enemyFood=mainEnemy?.food||0;s.enemyQueensAlive=s.colonies.filter(n=>!n.fallen&&n.queen>0).length;
    if(s.enemyQueensAlive===0&&!s.won){s.enemyQueen=0;s.won=true;s.ended=true;s.speed=0;emit(s,'四個敵對蟻國的蟻后皆已死亡。這片森林地下，再沒有能與你的王國抗衡的蟻群。',true,mainEnemy?.queenK??HOME);}
    if(!s.ended&&!workers(s).length){const recoverable=s.broods.some(b=>b.stage===2&&b.progress>=16&&b.count>0)&&s.food>=2;if(!recoverable){s.ended=true;s.speed=0;s.failureReason='族群失去全部可工作成蟻，且沒有短期恢復人口的可能。';emit(s,'王國失去恢復能力，族群覆滅。',true,s.queenK??HOME);}}
    if(s.time-(s.economy.lastMinute||0)>=60){const row={time:s.time,food:s.food,income:s.economy.income,consumption:s.economy.consumption,population:workers(s).length,workers:laborers(s).length,soldiers:soldiers(s).length,forage:laborers(s,'forage').length,nurse:laborers(s,'nurse').length,construction:laborers(s).filter(a=>a.job==='dig'||a.roomProject).length,safety:s.foodSafetyLevel};s.economy.history.push(row);if(s.economy.history.length>60)s.economy.history.shift();s.economy.recentIncome=s.economy.income;s.economy.recentConsumption=s.economy.consumption;s.economy.income=0;s.economy.consumption=0;s.economy.lastMinute=s.time;}
    if(s.time-(s.economy.lastSummary||0)>=180){const newWorkers=s.hatchSummary.workers||0,newSoldiers=s.hatchSummary.soldiers||0,losses=s.deaths-(s.economy.lastDeaths||0),rooms=s.rooms.filter(r=>r.status==='active').length-(s.economy.lastRooms||0),discoveries=s.resources.filter(r=>r.known).length-(s.economy.lastDiscoveries||0);if(newWorkers||newSoldiers||losses||rooms||discoveries)emit(s,`近期王國摘要：羽化工蟻 ${newWorkers}、兵蟻 ${newSoldiers}，死亡 ${Math.max(0,losses)}，發現資源 ${Math.max(0,discoveries)}，完成巢室 ${Math.max(0,rooms)}。`,false,HOME);s.economy.lastSummary=s.time;s.economy.lastDeaths=s.deaths;s.economy.lastRooms=s.rooms.filter(r=>r.status==='active').length;s.economy.lastDiscoveries=s.resources.filter(r=>r.known).length;s.hatchSummary={workers:0,soldiers:0,last:s.time};}
    const currentWorkers=laborers(s).length,currentSoldiers=soldiers(s).length,previousWorkers=s.economy.lastWorkers??currentWorkers,previousSoldiers=s.economy.lastSoldiers??currentSoldiers;s.milestones.forceAlerts??={worker:[],soldier:[]};for(const threshold of [10,5,2]){if(previousWorkers>threshold&&currentWorkers<=threshold&&!s.milestones.forceAlerts.worker.includes(threshold)){s.milestones.forceAlerts.worker.push(threshold);emit(s,`工蟻只剩 ${currentWorkers} 隻，採集、育幼與施工能力正在崩落。`,true,s.queenK??HOME);}if(previousSoldiers>threshold&&currentSoldiers<=threshold&&!s.milestones.forceAlerts.soldier.includes(threshold)){s.milestones.forceAlerts.soldier.push(threshold);emit(s,`兵蟻只剩 ${currentSoldiers} 隻，王國防線已明顯削弱。`,true,s.mainExit);}}s.economy.lastWorkers=currentWorkers;s.economy.lastSoldiers=currentSoldiers;
    s.enemyBirth+=dt;
    if(s.time-(s.lastEntrance||-99)>25&&s.ants.some(a=>a.faction==='enemy'&&isSurface(s,a.k)===isSurface(s,s.mainExit)&&distance(a,xy(s.mainExit))<3)){s.lastEntrance=s.time;emit(s,'敵蟻接近巢口。警戒隊與外層通道已成為第一道防線。',true,s.mainExit);}activePathCache.delete(s);
  }
  function upgrade(s){
    const previousVersion=s.version||1;s.version=12;s.worldSeed??=s.seed;s.queenK??=HOME;s.exits??=[s.mainExit];s.shells??=0;s.protein??=0;s.tissues??=0;s.preyProcessed??=0;s.wildlifeKills??=0;s.stock??={};s.projects??=[];s.miningTasks??=[];s.rooms??=[];s.chunks??=['0:s','1:s'];s.surfaceChunks??=[];s.wildlife??=[];s.milestones??={};s.perf??={pathCalls:0};s.economy??={income:0,consumption:0,recentIncome:0,recentConsumption:0,lastMinute:s.time,lastSummary:s.time,history:[],lastDeaths:s.deaths||0,lastRooms:s.rooms.filter(r=>r.status==='active').length,lastDiscoveries:s.resources.filter(r=>r.known).length,lastWorkers:laborers(s).length,lastSoldiers:soldiers(s).length};s.economy.lastSummary??=s.time;s.economy.lastDiscoveries??=s.resources.filter(r=>r.known).length;s.economy.lastWorkers??=laborers(s).length;s.economy.lastSoldiers??=soldiers(s).length;s.foodSafetyLevel??='normal';s.nextGroup??=1;s.queenRate??=1;s.pressure??=1;s.hatchSummary??={workers:0,soldiers:0,last:s.time};s.growthDirection??='deep';s.queenProfile??={maturity:0,protein:0,shell:0,mutation:0,tissue:0,tendency:'原生穩定'};s.world??={pressure:0,attraction:0,hostility:0,visibility:0,expedition:null,expeditions:[],clues:[],lastThreat:-180,lastEvent:-120,event:null};s.world.expeditions??=s.world.expedition?[s.world.expedition]:[];s.world.clues??=[];s.mobileBoxHintDone??=false;
    s.colonies??=[{id:0,home:s.enemyHome??ENEMY_HOME,queenK:s.enemyHome??ENEMY_HOME,queen:s.enemyQueen,food:s.enemyFood,birth:s.enemyBirth||0,fallen:s.enemyQueen<=0,discovered:false}];
    const main=s.colonies[0];main.role??='deep_forest';if(main.role==='main')main.role='deep_forest';if(main.name==='深林主巢')main.name='深林蟻族';for(const n of s.colonies)if(n.role==='rival'){n.role='near';n.name='近鄰蟻族';}
    ensureEnemyCampaign(s);s.rivalPending=false;
    for(const a of s.ants){a.colony??=0;a.lifespan??=900+(a.id*137%500);a.traits.jaw??=0;a.traits.shell??=0;a.traits.weight??=a.traits.min*.5;a.traits.acid??=0;a.project??=null;a.miningTask??=null;a.primary??=null;a.injuryNotified??=false;a.caste??='worker';a.soldierType??=null;a.special??=false;a.roomProject??=null;a.playerLocked??=false;a.cargoType??=null;a.mineralCargo??=0;a.cargoTask??=null;a.layerTransitions??=[];}
    for(const b of s.broods){b.autoCare??=true;b.careNote??='尚未指定專屬照護。';b.k??=HOME;b.shell??=0;b.genetics??=1;b.breed??='worker';}
    for(const r of s.rooms){r.targetSize??=r.size||1;r.planCells??=[...(r.cells||[])];r.policy??='balanced';r.lastGrowth??=s.time;}
    const nursery=s.rooms.find(r=>r.type==='nursery'&&r.status==='active');if(nursery){s.formalNursery??=nursery.id;s.temporaryNurseryRetired=true;for(const b of s.broods)b.k=nursery.k;}
    for(const r of s.routes){r.mode??='auto';r.desired??=2;r.active??=true;r.state??=TASK.WAITING;r.createdAt??=s.time;r.lastProgressAt??=s.time;r.assignedWorkers??=[];r.pickedUp??=0;r.delivered??=0;}
    for(const task of s.miningTasks){task.state??=(task.status==='complete'?TASK.COMPLETE:TASK.WAITING);task.createdAt??=task.started??s.time;task.lastProgressAt??=task.createdAt;task.assignedWorkers??=[];task.delivered??=0;}
    for(const c of s.cells)if(isSurface(s,c)&&c.terrain===undefined){const pattern=Math.abs(c.x*7+c.y*11);c.terrain=c.open?(pattern%13===0?'plant':pattern%9===0?'root':'ground'):pattern%2?'rock':'log';c.elevation=c.terrain==='rock'?2:['log','root','plant'].includes(c.terrain)?1:0;c.climb=c.open&&c.elevation>0;}
    s.resources.forEach((r,i)=>{r.id??=s.nextId++;r.type??=r.prey?'insect':r.name.includes('汁液')?'sap':i%2?'fruit':'seed';r.known??=false;r.depletedAt??=null;const c=cell(s,r.k);r.height??=c?.elevation||0;if(c&&isSurface(s,c)&&r.height>0)c.climb=true;});
    for(const route of s.routes){const corpse=s.resources.find(r=>r.k===route.k&&r.queenCorpse);if(!corpse)continue;Object.assign(route,{kind:'queenCorpse',corpseId:corpse.id,nestId:corpse.colony,targetLayer:'enemy_nest_underground',entranceK:surfaceKey(xy(corpse.k).x,4),phase:route.phase||'TRAVEL_TO_ENTRANCE'});for(const a of laborers(s,'forage').filter(a=>a.route===route.id&&!a.haulTask))a.haulTask={taskId:route.id,corpseId:corpse.id,nestId:corpse.colony,targetK:corpse.k,targetLayer:'enemy_nest_underground',entranceK:route.entranceK,phase:isSurface(s,a.k)?'TRAVEL_TO_ENTRANCE':'TRAVEL_TO_CORPSE',currentNode:a.k,returnSurfaceReached:false};}
    for(const r of s.regions){r.y??=2;}
    // A few local discoveries extend the existing terrain, not a replacement map.
    if(!s.ecologyReady){for(const [x,y,feature]of [[5,14,'潮濕層'],[4,16,'昆蟲殘骸'],[10,17,'普通礦物'],[14,18,'硬質碎石層']]){const c=cell(s,key(x,y));if(c&&!c.feature)c.feature=feature;}s.ecologyReady=true;}
    s.nestStage??=nestStage(s);
    return s;
  }
  function colony(s,a){return s.colonies.find(n=>n.id===a.colony)||s.colonies[0];}
  function bounds(s,surface=false){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const c of s.cells){if(surface!==isSurface(s,c))continue;minX=Math.min(minX,c.x);maxX=Math.max(maxX,c.x);minY=Math.min(minY,c.y);maxY=Math.max(maxY,c.y);}return {minX,maxX,minY,maxY};}
  function ensureSurfaceChunk(s,x,y){
    if(!inside(x,y,true))return false;
    const cx=Math.floor(x/16),cy=Math.floor(y/8),id=`surface:${cx}:${cy}`;if(s.surfaceChunks.includes(id)&&cell(s,surfaceKey(x,y)))return true;
    const terrainNames=['草根區','倒木區','岩縫','植物密集區','潮濕區'];
    for(let yy=cy*8;yy<cy*8+8;yy++)for(let xx=cx*16;xx<cx*16+16;xx++){
      if(!inside(xx,yy,true))continue;const k=surfaceKey(xx,yy);if(cell(s,k))continue;const n=random(s),terrain=n<.12?'rock':n<.24?'log':n<.38?'root':n<.52?'plant':'ground',elevation=terrain==='rock'?2:terrain==='log'||terrain==='plant'?1:0;
      const trail=yy===cy*8+4||xx===cx*16||xx===cx*16+8||xx===cx*16+15;s.cells.push({k,x:xx,y:yy,surface:true,open:trail||n>.07,seen:false,sealed:false,layer:'地表',terrain:trail?'ground':terrain,elevation:trail?0:elevation,climb:trail||['log','root','plant'].includes(terrain),work:0,ours:0,theirs:0,mark:false,deposit:0,feature:null});
    }
    if(!s.surfaceChunks.includes(id))s.surfaceChunks.push(id);
    const spots=[[cx*16+4,cy*8+2],[cx*16+11,cy*8+5]],types=['insect','fruit','sap','seed'];for(const [rx,ry] of spots){if(!inside(rx,ry,true))continue;const k=surfaceKey(rx,ry),type=types[Math.floor(random(s)*types.length)],amount=55+Math.floor(random(s)*100),c=cell(s,k);c.open=true;c.climb=true;s.resources.push({k,name:{insect:'昆蟲屍體',fruit:'果實碎片',sap:'植物汁液',seed:'種子與植物碎屑'}[type],amount,max:amount,type,prey:type==='insect',known:false,depletedAt:null,height:c.elevation});}
    if((Math.abs(cx)+Math.abs(cy))%3===2){const k=surfaceKey(cx*16+8,cy*8+4),c=cell(s,k);if(c){c.open=true;s.wildlife.push({id:s.nextId++,k,x:c.x,y:c.y,hp:24,maxHp:24,kind:'甲蟲',action:'覓食',cooldown:0,dead:false,height:c.elevation});}}
    s.regions.push({name:terrainNames[Math.abs(cx*3+cy)%terrainNames.length],x:cx*16+8,y:cy*8+4,seen:false,ours:0,theirs:0});emit(s,'發現新的森林區域。',false,surfaceKey(x,y));return true;
  }
  function ensureChunk(s,x,y){
    if(y<5)return ensureSurfaceChunk(s,x,y);
    if(!inside(x,y,false))return false;const cx=Math.floor(x/16),cy=Math.floor((y-5)/10),id=`${cx}:${cy}`;
    if(s.chunks.includes(id)&&cell(s,key(x,y)))return true;
    const startY=cy==='s'?0:5+cy*10,endY=cy==='s'?5:startY+10;
    for(let yy=startY;yy<endY;yy++)for(let xx=cx*16;xx<cx*16+16;xx++){
      if(!inside(xx,yy,false)||cell(s,key(xx,yy)))continue;const n=random(s),layer=yy<8?'表土':yy<14?'濕土':yy<23?'黏土':n>.86?'碎石':'黏土';
      const c={x:xx,y:yy,open:yy<5,seen:false,sealed:false,layer,work:0,ours:0,theirs:0,mark:false,deposit:0,feature:null};
      if(yy<5){c.open=yy===2||xx%16===0||xx%16===15||n>.14;}
      const tier=yy<15?'shallow':yy<28?'middle':yy<42?'deep':'mutated';
      if(n<.025){c.open=true;c.feature=tier==='shallow'?'天然小洞穴':tier==='middle'?'廢棄昆蟲洞':tier==='deep'?'古老蟻族遺跡':'異變空洞';}
      else if(n<.045)c.feature=tier==='shallow'?'樹根纖維':tier==='middle'?'真菌斑':tier==='deep'?'遠古甲殼殘跡':'異變生物巢';
      else if(n<.065)c.feature=tier==='deep'?'古老蟻族遺跡':'普通礦物';else if(n<.085)c.feature=tier==='shallow'?'潮濕層':tier==='middle'?'地下水脈':'有毒氣隙';
      else if(n<.11+Math.min(.08,yy*.0015)){c.feature=tier==='mutated'?'外星材質碎片':'深灰色異常碎屑';c.deposit=8+Math.floor(random(s)*12)+(tier==='deep'?5:0);}
      else if(n>.975&&yy>30){c.feature=yy>45?'巨大未知黑色表面':'黑色硬質碎片';c.hard=true;}
      c.depthTier=tier;
      s.cells.push(c);
    }
    if(!s.chunks.includes(id))s.chunks.push(id);
    if(cy==='s'){
      const types=['insect','fruit','sap','seed'],names={insect:'落葉間的昆蟲屍體',fruit:'熟落的野果',sap:'樹根植物汁液',seed:'種子與植物碎屑'};
      for(const offset of [4,11]){const type=types[Math.floor(random(s)*4)],k=key(cx*16+offset,2),amount=70+Math.floor(random(s)*110);cell(s,k).open=true;s.resources.push({k,name:names[type],amount,max:amount,type,prey:type==='insect',known:false,depletedAt:null});}
      s.regions.push({name:['落葉林地','草根空地','腐木邊緣'][Math.abs(cx)%3],x:cx*16+8,seen:false,ours:0,theirs:0});
      emit(s,'前方出現新的森林區域。',false,key(x,2));
    }
    return true;
  }
  function expandToward(s,k){const p=xy(k),surface=typeof k==='string'&&k.startsWith('s:')||p.y<5;if(!inside(p.x,p.y,surface))return false;if(cell(s,k))return true;const b=bounds(s,surface);if(p.x<b.minX-16||p.x>b.maxX+16||p.y<b.minY-8||p.y>b.maxY+8)return false;return surface?ensureSurfaceChunk(s,p.x,p.y):ensureChunk(s,p.x,p.y);}
  function addColony(s,x,profile={}){
    const homeY=Math.max(10,Math.min(CAMPAIGN.underground.maxY-2,profile.y??12));s.surfaceChunks??=[];s.chunks??=['0:s','1:s'];if(!cell(s,surfaceKey(x,4)))ensureSurfaceChunk(s,x,4);for(let y=5;y<=homeY+1;y++)if(!cell(s,key(x,y)))ensureChunk(s,x,y);const id=profile.id??s.nextId++,home=key(x,homeY),entry=surfaceKey(x,4),outer=key(x,6),gathering=key(x,Math.max(7,homeY-6)),patrol=key(x,Math.max(8,homeY-4)),defense=key(x,Math.max(9,homeY-2)),initial=profile.initial??7,foragers=profile.foragers??3,scouts=profile.scouts??0,nest={id,home,queenK:home,queen:profile.queen??80,food:profile.food??25,birth:0,brood:{workers:0,soldiers:0,progress:0},fallen:false,destroyed:false,alive:true,discovered:false,queenKnown:false,role:profile.role??'near',name:profile.name??'敵對蟻族',populationCap:profile.populationCap??18,initialPower:initial,birthInterval:profile.birthInterval??72,attackDelay:profile.attackDelay??320,expeditionSize:profile.expeditionSize??5,cooldown:profile.cooldown??190,color:profile.color??'#d89170',bias:profile.bias??'balanced',strategy:'採集',aiState:'GATHER',losses:0,knownTerritory:0,resourceRoutes:[],attackState:'idle',defenseState:'guarding',recoveryState:'stable',zones:{entry,outer,gathering,patrol,defense,core:home,bufferRadius:MAP_RULES.enemyCoreBuffer}};
    const zoneY={outer:xy(outer).y,gathering:xy(gathering).y,patrol:xy(patrol).y,defense:xy(defense).y};for(let y=4;y<=homeY;y++){const k=y<5?surfaceKey(x,y):key(x,y),c=cell(s,k);if(c){c.open=true;c.feature=null;c.hard=false;c.enemyZone=y===homeY?'core':y>=zoneY.defense?'defense':y>=zoneY.patrol?'patrol':y>=zoneY.gathering?'gathering':'outer';}}
    for(const [dx,dy,zone] of [[-1,0,'core'],[1,0,'core'],[-1,-1,'defense'],[1,-1,'defense'],[-1,zoneY.patrol-homeY,'patrol'],[1,zoneY.patrol-homeY,'patrol'],[-1,zoneY.gathering-homeY,'gathering'],[1,zoneY.gathering-homeY,'gathering']]){const k=key(x+dx,homeY+dy);if(!cell(s,k))ensureChunk(s,x+dx,homeY+dy);const c=cell(s,k);if(c){c.open=true;c.feature=null;c.hard=false;c.enemyZone=zone;}}
    s.colonies.push(nest);for(let i=0;i<initial;i++){const job=i<foragers?'forage':i<foragers+scouts?'scout':'combat',a=ant(s,'enemy',home,job);a.colony=id;if(job==='combat'){a.caste='soldier';a.soldierType='normal';a.maxHp+=profile.role==='armored'?8:profile.role==='hunter'?3:profile.role==='deep_forest'?4:1;a.hp=a.maxHp;a.traits.pred+=profile.role==='hunter'?.32:profile.role==='deep_forest'?.18:.08;a.traits.min+=profile.role==='armored'?.55:profile.role==='deep_forest'?.18:.05;a.traits.shell+=profile.role==='armored'?.5:.08;}s.ants.push(a);}return nest;
  }
  function ensureEnemyCampaign(s){
    s.colonies??=[];const used=new Set(s.colonies.map(n=>n.id));for(const profile of ENEMY_ARCHETYPES){let n=s.colonies.find(n=>n.role===profile.role);if(!n){const id=used.has(profile.id)?Math.max(-1,...used)+1:profile.id;n=addColony(s,profile.x,{...profile,id});used.add(id);}n.name=profile.name;n.role=profile.role;n.populationCap??=profile.populationCap;n.initialPower??=Math.max(profile.initial,s.ants.filter(a=>a.faction==='enemy'&&a.colony===n.id).length);n.birthInterval??=profile.birthInterval;n.attackDelay??=profile.attackDelay;n.expeditionSize??=profile.expeditionSize;n.cooldown??=profile.cooldown;n.color??=profile.color;n.bias??=profile.bias;n.brood??={workers:0,soldiers:0,progress:0};n.destroyed=!!(n.destroyed||n.fallen||n.queen<=0);n.fallen=n.destroyed;n.alive=!n.destroyed;n.queenKnown??=false;n.strategy??=n.destroyed?'崩潰':'採集';n.aiState??=n.destroyed?'COLLAPSE':'GATHER';n.losses??=0;n.knownTerritory??=0;n.resourceRoutes??=[];n.attackState??='idle';n.defenseState??='guarding';n.recoveryState??=n.destroyed?'destroyed':'stable';const p=xy(n.home);n.zones??={entry:surfaceKey(p.x,4),outer:key(p.x,6),gathering:key(p.x,Math.max(7,p.y-6)),patrol:key(p.x,Math.max(8,p.y-4)),defense:key(p.x,Math.max(9,p.y-2)),core:n.queenK??n.home,bufferRadius:MAP_RULES.enemyCoreBuffer};n.zones.gathering??=key(p.x,Math.max(7,p.y-6));}
    s.enemyQueensAlive=s.colonies.filter(n=>!n.fallen&&n.queen>0).length;return s.colonies;
  }
  function safeFood(s,origin=HOME){return s.resources.filter(r=>r.amount>0&&cell(s,r.k)?.seen&&distance(xy(origin),xy(r.k))<=35&&!s.ants.some(a=>a.faction==='enemy'&&distance(a,xy(r.k))<4)&&cell(s,r.k).theirs<8&&path(s,origin,r.k)!==null).sort((a,b)=>distance(xy(origin),xy(a.k))-distance(xy(origin),xy(b.k)))[0];}
  function useFood(s,a,r){const injury=a.hp/a.maxHp<=.7?.75:1;a.carry=Math.min(r.amount,(4.5+a.traits.pred*1.5)*injury);r.amount=Math.max(0,r.amount-a.carry);a.prey=r.prey;a.largePrey=!!r.large;a.cargoType=r.type||'other';if(r.amount===0&&r.depletedAt===null){r.depletedAt=s.time;const route=s.routes.find(q=>q.k===r.k);if(route){route.sourceDepleted=true;route.active=false;for(const w of laborers(s,'forage').filter(w=>w.id!==a.id&&w.route===route.id&&!w.carry&&!w.shellCarry))clearWork(w);}if(r.type==='insect'||r.type==='queen')a.shellCarry=(a.shellCarry||0)+(r.type==='queen'?6:3);emit(s,'食物耗盡，採集蟻將回巢尋找其他已知食物。',false,r.k);}}
  function assignFood(s,a,r){let route=s.routes.find(t=>t.k===r.k);if(!route){route={id:s.nextId++,k:r.k};s.routes.push(route);}if(r.queenCorpse){Object.assign(route,{kind:'queenCorpse',corpseId:r.id,nestId:r.colony,targetLayer:'enemy_nest_underground',entranceK:surfaceKey(xy(r.k).x,4),phase:route.phase||'TRAVEL_TO_ENTRANCE'});a.haulTask={taskId:route.id,corpseId:r.id,nestId:r.colony,targetK:r.k,targetLayer:'enemy_nest_underground',entranceK:route.entranceK,phase:isSurface(s,a.k)?'TRAVEL_TO_ENTRANCE':'TRAVEL_TO_CORPSE',currentNode:a.k,returnSurfaceReached:false};}else a.haulTask=null;a.job='forage';a.route=route.id;a.goal=null;a.path=[];}
  function pressure(s){const space=s.cells.filter(c=>c.open&&!c.sealed&&c.seen&&!isSurface(s,c)&&!s.colonies.some(n=>distance(c,xy(n.home))<4)).length;const pop=workers(s).length+s.broods.reduce((n,b)=>n+b.count*.6,0),capacity=Math.max(8,space*1.4),crowd=pop/capacity;return {space,capacity,crowd,rate:Math.min(1,s.food/15)*Math.min(1,(workers(s,'nurse').length+1)/Math.max(1,s.broods.length)) /Math.max(1,crowd*crowd*2)};}
  function maintain(s,dt){
    const safety=foodSafety(s),previousSafety=s.foodSafetyLevel||'normal';s.foodSafetyLevel=safety.level;
    if(previousSafety!==safety.level){const worsening=['normal','attention','crisis','emergency'].indexOf(safety.level)>['normal','attention','crisis','emergency'].indexOf(previousSafety);if(safety.level==='attention'&&worsening)emit(s,'食物供應開始吃緊。',true,HOME);else if(safety.level==='crisis'&&worsening)emit(s,'食物危機：蟻國已提高採集優先級。',true,HOME);else if(safety.level==='emergency'&&worsening)emit(s,'食物供應瀕臨中斷。',true,HOME);else if(safety.level==='normal')emit(s,'食物供應恢復穩定。',false,HOME);}
    if(['crisis','emergency'].includes(safety.level)){
      for(const a of laborers(s).filter(a=>!a.playerLocked&&!a.carry&&!a.shellCarry&&((safety.level==='emergency'&&a.roomProject)||a.project||a.job==='scout'||a.job==='mine'))){clearWork(a);a.action='轉往糧食工作';}
    }
    const formalNursery=s.rooms.find(r=>r.id===s.formalNursery&&r.status==='active');if(formalNursery){for(const b of s.broods)b.k=formalNursery.k;s.temporaryNurseryRetired=true;}
    // Reserve minimum brood care before construction or routine collection takes idle workers.
    for(const b of s.broods.filter(b=>b.stage<2&&b.autoCare!==false)){
      const need=Math.max(1,Math.ceil(b.count*.35/(1+roomEffect(s,'nursery')*.55)));
      let assigned=laborers(s,'nurse').filter(a=>a.care===b.id).length;
      for(const a of laborers(s,'idle')){if(assigned>=need)break;if(a.primary||a.carry||a.shellCarry||path(s,a.k,b.k??HOME)===null)continue;clearWork(a,'nurse');a.care=b.id;assigned++;}
    }
    const broodIds=new Set(s.broods.map(b=>b.id)),groupIds=new Set(s.groups.map(g=>g.id)),projectIds=new Set(s.projects.filter(p=>p.status==='working').map(p=>p.id)),roomProjectIds=new Set(s.rooms.filter(r=>['planned','excavating','shaping'].includes(r.status)).map(r=>r.id)),miningIds=new Set(s.miningTasks.filter(t=>t.status==='working').map(t=>t.id));
    for(const a of laborers(s)){if(a.primary?.kind==='group'&&!groupIds.has(a.primary.group)||a.job==='combat'&&!groupIds.has(a.group)||a.project&&!projectIds.has(a.project)||a.roomProject&&!roomProjectIds.has(a.roomProject)||a.miningTask&&!miningIds.has(a.miningTask)){clearWork(a);continue;}if(a.job==='nurse'&&a.care!==null&&!broodIds.has(a.care)){a.care=null;a.job='idle';a.primary=null;}if(a.job==='forage'){const route=s.routes.find(r=>r.id===a.route);if((!route||route.active===false)&&a.k===HOME&&!a.carry&&!a.shellCarry){clearWork(a);a.idleSince=s.time+30;a.manualCooldownUntil=s.time+30;}}if(a.job==='dig'&&!a.project&&!a.roomProject&&!s.digQueue.length)clearWork(a);if(a.primary?.kind==='group'){const g=s.groups.find(g=>g.id===a.group);if(g?.stance==='retreat'&&a.k===HOME)clearWork(a);}}
    for(const p of s.projects.filter(p=>p.status==='working')){let assigned=laborers(s,'dig').filter(a=>a.project===p.id);if(!assigned.length){p.waiting=true;if(['crisis','emergency'].includes(safety.level)&&!p.selectedIds?.length)continue;const wanted=(p.selectedIds||[]).map(id=>laborers(s).find(a=>a.id===id)).filter(a=>a&&a.hp/a.maxHp>.3&&!a.carry),pool=wanted.length?wanted:dispatchable(s,p.tip).slice(0,p.count||1);for(const a of pool){clearWork(a,'dig');a.project=p.id;a.primary={kind:'project',project:p.id};a.playerLocked=!!p.selectedIds?.length;}assigned=pool;}if(assigned.length)p.waiting=false;}
    for(const task of s.miningTasks.filter(t=>t.status==='working')){const c=cell(s,task.k);if(!c||c.deposit<=0){task.sourceDepleted=true;const carrying=laborers(s).some(w=>w.cargoTask===task.id&&(w.mineralCargo||0)>0);if(!carrying)finalizeMiningTask(s,task);else taskState(task,TASK.RETURNING,s,task.delivered||0);continue;}let assigned=laborers(s,'mine').filter(a=>a.miningTask===task.id);if(assigned.length<(task.count||1)){const wanted=(task.selectedIds||[]).map(id=>laborers(s).find(a=>a.id===id)).filter(a=>a&&!a.carry&&path(s,a.k,task.k)!==null),pool=wanted.length?wanted:dispatchable(s,task.k);for(const a of pool){if(assigned.length>=task.count)break;clearWork(a,'mine');a.miningTask=task.id;a.primary={kind:'mining',task:task.id};a.playerLocked=!!task.selectedIds?.length;a.action='準備前往採掘';assigned.push(a);}}task.assignedWorkers=assigned.map(a=>a.id);task.waiting=!assigned.length;if(!assigned.length){const reachable=laborers(s).some(a=>path(s,a.k,task.k)!==null);taskState(task,reachable?TASK.WAITING:TASK.BLOCKED,s,task.collected||0,reachable?'':'無法抵達');}else if([TASK.WAITING,TASK.ASSIGNED,undefined].includes(task.state))taskState(task,TASK.ASSIGNED,s,task.collected||0);if(assigned.length&&s.time-(task.lastProgressAt??task.started)>10){for(const a of assigned){a.goal=null;a.path=[];}task.lastProgressAt=s.time;task.retries=(task.retries||0)+1;if(task.retries>3&&!assigned.some(a=>path(s,a.k,task.k)!==null))taskState(task,TASK.BLOCKED,s,task.collected||0,'無法抵達');}}
    if(s.food<8){for(const room of s.rooms.filter(r=>['planned','excavating','shaping'].includes(r.status))){const builders=laborers(s).filter(a=>a.roomProject===room.id&&!a.playerLocked);for(const a of builders.slice(1))clearWork(a);}}
    for(const room of s.rooms){if(room.status!=='active')continue;const nearby=workers(s).filter(a=>distance(a,xy(room.k))<2),usage=room.type==='nursery'?s.broods.filter(b=>room.cells.includes(b.k??HOME)).reduce((n,b)=>n+b.count,0):room.type==='store'?s.food/Math.max(1,foodCapacity(s)):room.type==='prey'?s.protein+s.tissues:room.type==='rest'?nearby.filter(a=>a.hp<a.maxHp).length:room.type==='military'?s.broods.filter(b=>b.breed!=='worker'&&b.breed!=='acid').length:s.broods.filter(b=>b.breed==='acid'||b.add==='mineral').length;room.use+=dt*usage;room.maturity=Math.min(100,room.maturity+dt*Math.min(1,usage)*.045);}
    for(const r of s.resources){if(cell(s,r.k)?.seen&&!r.known){r.known=true;emit(s,'發現食物：'+r.name,false,r.k);}if(r.type==='sap'&&r.amount===0&&s.time-r.depletedAt>120){r.amount=Math.min(30,r.max);r.depletedAt=null;emit(s,'植物汁液再次滲出。',false,r.k);}if(r.queenCorpse&&r.amount>0){r.freshness=Math.max(0,(r.freshness??100)-dt*.08);if(r.freshness<=0){r.amount=Math.max(0,r.amount-dt*.16);r.name='敵方蟻后殘殼';}}}
    if(Math.floor(s.time)%8===0&&s.time-(s.lastAutoRoutes??-10)>=7){s.lastAutoRoutes=s.time;for(const resource of s.resources){if(resource.amount<=0||!cell(s,resource.k)?.seen||!resource.known||resource.queenCorpse||distance(xy(HOME),xy(resource.k))>45)continue;if(s.ants.some(a=>a.faction==='enemy'&&distance(a,xy(resource.k))<4))continue;if(path(s,HOME,resource.k)!==null&&!s.routes.some(r=>r.k===resource.k)){s.routes.push({id:s.nextId++,k:resource.k,mode:'auto',active:true,desired:1,state:TASK.WAITING,createdAt:s.time,lastProgressAt:s.time});}}}
    if(safety.level!=='normal'&&safety.known<Math.max(80,workers(s).length*4)&&!laborers(s,'scout').some(a=>a.scoutTarget!=null)){
      const target=s.resources.filter(r=>r.amount>0&&!r.known&&cell(s,r.k)?.open&&path(s,HOME,r.k)!==null).sort((a,b)=>distance(xy(HOME),xy(a.k))-distance(xy(HOME),xy(b.k)))[0],scout=laborers(s,'idle').find(a=>!a.playerLocked&&!a.primary);
      if(target&&scout){clearWork(scout,'scout');scout.scoutTarget=target.k;scout.action='追蹤食物氣味';if(s.time-(s.lastFoodClue||-999)>100){s.lastFoodClue=s.time;emit(s,`遠處傳來食物氣味，偵察蟻正朝${xy(target.k).x>xy(HOME).x?'東側':'西側'}森林追蹤。`,true,scout.k);}}
    }
    for(const w of s.wildlife)if(!w.dead&&cell(s,w.k)?.seen&&!w.discovered){w.discovered=true;emit(s,'偵察蟻發現大型活體昆蟲。',true,w.k);}
    for(const n of s.colonies){const entry=key(xy(n.home).x,4);if(!n.discovered&&cell(s,entry)?.seen){n.discovered=true;emit(s,'發現敵巢入口。',false,entry);}}
    for(const c of s.cells.filter(c=>c.seen&&c.strategicClue&&!c.clueNotified)){c.clueNotified=true;emit(s,`地下發現敵國線索：${c.strategicClue}。`,true,c.k??key(c.x,c.y));}
    for(const b of s.broods){
      const assigned=workers(s,'nurse').filter(a=>a.care===b.id);
      if(b.lastCarers!==undefined&&assigned.length<b.lastCarers&&b.stage<2){b.careNote=assigned.length===0?'照護工蟻已被調往其他工作或死亡。':'部分照護工蟻已離開。';}
      if(b.autoCare&&b.stage<2){const need=Math.max(1,Math.ceil(b.count*.35/(1+roomEffect(s,'nursery')*.55)));let count=assigned.length;for(const a of laborers(s,'idle').filter(a=>!a.primary&&!a.carry&&!a.shellCarry&&path(s,a.k,b.k??HOME)!==null)){if(count>=need)break;clearWork(a,'nurse');a.care=b.id;count++;b.careNote='工蟻已加入自動照護。';}}
      b.lastCarers=workers(s,'nurse').filter(a=>a.care===b.id).length;
    }
    for(const a of laborers(s,'nurse').filter(a=>a.care===null&&!a.primary))clearWork(a);
    for(const room of s.rooms.filter(r=>['planned','excavating','shaping'].includes(r.status))){const current=laborers(s).filter(a=>a.roomProject===room.id).length,desired=safety.level==='emergency'?0:safety.level==='crisis'?1:safety.level==='attention'?1:Math.min(3,Math.max(1,Math.floor(laborers(s).length/8)));if(current<desired)assignRoomWorkers(s,room,desired-current);}
    let summary=workforce(s),routes=s.routes.filter(route=>route.active!==false&&s.resources.some(r=>r.k===route.k&&r.amount>0)),expeditionActive=soldiers(s).filter(a=>isSurface(s,a.k)||a.playerLocked&&distance(a,xy(HOME))>8).length>=5,gatherShare={normal:expeditionActive ? .3 : .24,attention:.4,crisis:.56,emergency:.72}[safety.level],gatherFloor=Math.min(laborers(s).length,Math.max(routes.length,Math.ceil(laborers(s).length*gatherShare)));for(const route of routes){route.active??=true;route.mode??='auto';route.desired??=2;route.createdAt??=s.time;route.lastProgressAt??=s.time;const resource=s.resources.find(r=>r.k===route.k&&r.amount>0);let assigned=laborers(s,'forage').filter(a=>a.route===route.id),scarcity=resource.amount<10?1:Infinity,balanced=Math.max(1,Math.ceil(gatherFloor/Math.max(1,routes.length))),want=Math.min(scarcity,route.mode==='small'?Math.max(1,safety.level==='normal'?1:balanced):route.mode==='half'?Math.max(balanced,Math.floor(summary.automaticGatherLimit/2)):route.mode==='queen'?Math.min(10,Math.max(balanced,summary.automaticGatherLimit)):route.mode==='large'?Math.max(balanced,summary.automaticGatherLimit):balanced);route.desired=want;for(const a of assigned.filter(a=>!a.playerLocked&&!a.carry&&!a.shellCarry).slice(want))clearWork(a);assigned=laborers(s,'forage').filter(a=>a.route===route.id);route.assigned=assigned.length;route.assignedWorkers=assigned.map(a=>a.id);route.pending=Math.max(0,want-assigned.length);if(!assigned.length)taskState(route,path(s,HOME,route.k)===null?TASK.BLOCKED:TASK.WAITING,s,route.pickedUp||0,path(s,HOME,route.k)===null?'無法抵達':'');else if(!assigned.some(a=>a.carry||a.shellCarry)&&s.time-(route.lastProgressAt||route.createdAt)>10){for(const a of assigned){a.goal=null;a.path=[];}route.retries=(route.retries||0)+1;route.lastProgressAt=s.time;taskState(route,TASK.ASSIGNED,s,route.pickedUp||0);}else if(![TASK.TRAVEL,TASK.PICKUP,TASK.CARRYING,TASK.RETURNING,TASK.DELIVERING].includes(route.state))taskState(route,TASK.ASSIGNED,s,route.pickedUp||0);}
    let gathering=laborers(s,'forage').length,budget=Math.max(0,summary.automaticGatherLimit-gathering);
    while(budget>0){let progressed=false;for(const route of routes.sort((a,b)=>(b.pending||0)-(a.pending||0)||distance(xy(HOME),xy(a.k))-distance(xy(HOME),xy(b.k)))){if(budget<=0||route.pending<=0)continue;const resource=s.resources.find(r=>r.k===route.k&&r.amount>0),a=dispatchable(s,route.k)[0];if(!resource||!a)continue;clearWork(a,'forage');assignFood(s,a,resource);a.action='準備前往採集';route.pending--;route.assigned=(route.assigned||0)+1;budget--;progressed=true;}if(!progressed)break;}
    const p=pressure(s);s.pressure=p.crowd;const qp=s.queenProfile;qp.maturity=Math.min(100,qp.maturity+dt*(s.food>12?.018:.004));qp.protein+=dt*Math.min(1,s.protein/20)*.01;qp.shell+=dt*Math.min(1,s.shells/16)*.008;qp.mutation+=dt*Math.min(1,s.minerals/14)*.008;qp.tissue+=dt*Math.min(1,s.tissues/10)*.006;qp.tendency=qp.mutation>qp.protein+3?'礦化適應':qp.protein>qp.mutation+3?'獵食傾向':qp.shell>4?'厚甲傾向':'原生穩定';s.queenRate=p.rate*(1+qp.maturity*.0025)*({normal:1,attention:.62,crisis:.2,emergency:0}[safety.level]);if(safety.level==='normal'&&(p.crowd>.72||workers(s).length>=20)&&s.time-(s.lastAutoGrowth??-99)>90){s.lastAutoGrowth=s.time;autoGrowNest(s);}if(p.crowd>1.05&&s.time-(s.lastCrowding||-99)>90){s.lastCrowding=s.time;emit(s,'巢穴空間開始擁擠，育幼成長與產卵正在放慢。',false,HOME);}
    if(safety.level==='normal')for(const room of s.rooms.filter(r=>r.status==='active'&&r.size<3)){const load=room.type==='nursery'?s.broods.reduce((n,b)=>n+b.count,0)/Math.max(1,broodCapacity(s)):room.type==='store'?s.food/Math.max(1,foodCapacity(s)):room.type==='military'?s.broods.filter(b=>b.breed!=='worker').length/4:room.type==='rest'?workers(s).filter(a=>a.hp<a.maxHp*.7).length/3:room.maturity/100;if((load>.72||room.maturity>82)&&s.food>=8*room.size&&s.time-(room.lastGrowth||0)>150){room.lastGrowth=s.time;expandRoom(s,room.id);}}
    for(const a of s.ants){a.lifespan??=900+(a.id*137%500);if(a.age>a.lifespan)a.hp-=dt*.06;if((a.carry||a.shellCarry)&&a.faction==='player'&&a.k===cargoTarget(s,a))depositCargo(s,a);if(a.faction==='player'&&a.hp/a.maxHp<=.3&&!a.injuryNotified){a.injuryNotified=true;if(s.time-(s.lastInjuryNotice||-99)>15){s.lastInjuryNotice=s.time;emit(s,'有螞蟻重傷，正嘗試返回巢穴休養。',true,a.k);}}const rest=roomAt(s,a.k)?.type==='rest'&&roomAt(s,a.k)?.status==='active';if(a.faction==='player'&&(a.k===(s.queenK??HOME)||rest)&&a.hp<a.maxHp&&s.food>.1){const bonus=rest?3+roomEffect(s,'rest')*.35:1,rate=(a.hp/a.maxHp<=.3?.045:.1)*bonus;a.hp=Math.min(a.maxHp,a.hp+dt*rate);s.food=Math.max(0,s.food-dt*.006);a.action='休養';if(a.hp/a.maxHp>.55)a.injuryNotified=false;}}
    for(const n of [20,50,100])if(workers(s).length>=n&&!s.milestones['population'+n]){s.milestones['population'+n]=s.time;emit(s,n===20?'蟻群跨過二十隻，更多巢室與空間開始變得重要。':n===50?'族群已能維持分離的經濟與軍事人口，王巢輪廓逐漸形成。':'龐大族群正在把整片地下改造成蟻都。',true,HOME);}
    const stage=nestStage(s),stages=['初生蟻巢','主巢','王巢','深層王巢','蟻都'];if(stages.indexOf(stage)>stages.indexOf(s.nestStage)){s.nestStage=stage;emit(s,`蟻巢規模已進入${stage}階段。`,true,HOME);}
    s.groups=s.groups.filter(g=>s.ants.some(a=>a.group===g.id||a.pending?.kind==='group'&&a.pending.group===g.id));
    for(const resource of [...s.resources])if(resource.amount<=0)finalizeResource(s,resource);
    s.routes=s.routes.filter(r=>s.resources.some(food=>food.k===r.k)||laborers(s).some(a=>a.cargoTask===r.id&&(a.carry||a.shellCarry)));
    s.miningTasks=s.miningTasks.filter(t=>t.status==='working');
    s.wildlife=s.wildlife.filter(w=>!w.dead);
    s.digQueue=s.digQueue.filter(k=>!cell(s,k)?.open);
    for(const c of s.cells)if(c.open&&c.seen&&!isSurface(s,c)){const k=c.k??key(c.x,c.y);if(s.broods.some(b=>b.k===k))c.use='育幼區';else if(workers(s,'guard').some(a=>a.k===k))c.use='防守區';else if(c.x===8&&c.y===9)c.use='蟻后區';else if(workers(s,'forage').some(a=>a.k===k&&a.carry))c.use='儲食區';}
  }
  function project(s,start,direction,count=2,length=Infinity,selectedIds=[]){
    const c=cell(s,start);if(!c?.seen||!passable(s,start)||isSurface(s,c))return {error:'請從已知通道開始。'};
    const continuous=!Number.isFinite(length),p={id:s.nextId++,start,tip:start,direction,remaining:continuous?null:length,continuous,status:'working',next:null,count,reason:'',waiting:false,selectedIds:selectedIds.length?[...selectedIds]:null};s.projects.push(p);
    const selected=selectedIds.map(id=>laborers(s).find(a=>a.id===id)).filter(a=>a&&path(s,a.k,start)!==null),pool=selected.length?selected:dispatchable(s,start);
    if(!pool.length){s.projects.pop();return {error:'目前沒有可調派工蟻。'};}
    for(const a of pool.slice(0,count)){clearWork(a,'dig');a.project=p.id;a.primary={kind:'project',project:p.id};a.playerLocked=selected.length>0;}
    planProject(s,p);return p;
  }
  function mine(s,k,count=2,selectedIds=[]){
    const c=cell(s,k);if(!c?.open||!c.seen||isSurface(s,c)||!(c.deposit>0))return {error:'這裡沒有可採掘的碎屑。'};
    let task=s.miningTasks.find(t=>t.k===k&&t.status==='working');if(!task){task={id:s.nextId++,k,status:'working',state:TASK.WAITING,count:Math.max(1,count),collected:0,delivered:0,started:s.time,createdAt:s.time,lastProgressAt:s.time,selectedIds:selectedIds.length?[...selectedIds]:null,assignedWorkers:[]};s.miningTasks.push(task);}
    const selected=selectedIds.map(id=>laborers(s).find(a=>a.id===id)).filter(a=>a&&path(s,a.k,k)!==null),pool=selected.length?selected:dispatchable(s,k);let assigned=laborers(s,'mine').filter(a=>a.miningTask===task.id).length;
    for(const a of pool){if(assigned>=task.count)break;clearWork(a,'mine');a.miningTask=task.id;a.primary={kind:'mining',task:task.id};a.playerLocked=selected.length>0;a.action='準備前往採掘';assigned++;}
    task.assignedWorkers=laborers(s,'mine').filter(a=>a.miningTask===task.id).map(a=>a.id);task.waiting=assigned===0;taskState(task,assigned?TASK.ASSIGNED:TASK.WAITING,s,task.collected);return assigned?{count:assigned,task}:{count:0,waiting:true,task};
  }
  function stopProject(s,p,reason){p.status='stopped';p.reason=reason;if(p.next!==null)s.digQueue=s.digQueue.filter(k=>k!==p.next);for(const a of workers(s,'dig'))if(a.project===p.id)clearWork(a);emit(s,'挖掘暫停：'+reason,false,p.tip);}
  function planProject(s,p){
    if(!p.continuous&&p.remaining<=0){stopProject(s,p,'已到達指定距離');return;}
    const t=xy(p.tip);let next;
    if(p.direction==='chamber'){const o=xy(p.start),choices=[];for(let y=o.y-1;y<=o.y+1;y++)for(let x=o.x-1;x<=o.x+1;x++){if(y<5||!inside(x,y,false))continue;const k=key(x,y);if(!cell(s,k))ensureChunk(s,x,y);if(cell(s,k)&&!cell(s,k).open&&adjacent(k).some(n=>passable(s,n)))choices.push(k);}next=choices[0];if(next===undefined){stopProject(s,p,'空腔擴大完成');return;}}
    else {const trend=p.direction==='left'?[-1,0]:p.direction==='right'?[1,0]:[0,1],side=trend[0]?[0,random(s)<.5?-1:1]:[random(s)<.5?-1:1,0],candidates=[[t.x+trend[0],t.y+trend[1]],[t.x+side[0],t.y+side[1]]];if(random(s)<.28)candidates.reverse();for(const point of candidates){if(point[1]<5)continue;const k=key(...point);if(!cell(s,k))ensureChunk(s,...point);const c=cell(s,k);if(c&&!c.hard){next=k;break;}}next??=key(t.x+trend[0],t.y+trend[1]);}
    const c=cell(s,next);if(!c){stopProject(s,p,'已抵達關卡邊界');return;}if(c.hard){c.seen=true;s.discoveredBlack=true;if(!s.milestones.blackSurface){s.milestones.blackSurface=s.time;emit(s,'深處發現巨大而不自然的黑色曲面。',true,next);}stopProject(s,p,'遇到未知黑色硬質表面');return;}
    if(c.open){c.seen=true;if(c.feature){p.tip=next;stopProject(s,p,c.feature);return;}p.tip=next;if(!p.continuous)p.remaining--;planProject(s,p);return;}
    p.next=next;const cnext=cell(s,next);if(cnext)cnext.narrow=random(s)<.42;if(!queueDig(s,next)&&!s.digQueue.includes(next))stopProject(s,p,'前方通道尚未連通');
  }
  function finishedDig(s,k){
    const c=cell(s,k);if(c.feature==='昆蟲殘骸')s.shells+=5;
    if(/異變生物巢|廢棄昆蟲洞/.test(c.feature||'')&&!s.wildlife.some(w=>w.k===k&&!w.dead)){const kind=c.feature.includes('異變')?'異變穴居蟲':'穴居甲蟲',hp=c.feature.includes('異變')?38:22;s.wildlife.push({id:s.nextId++,k,x:c.x,y:c.y,hp,maxHp:hp,kind,action:'被開挖驚動',cooldown:0,dead:false,underground:true,attractedTarget:HOME});emit(s,`${kind}被深入挖掘驚動，正沿通道活動。`,true,k);}
    if(c.y>=25&&!s.milestones.deepRoom){s.milestones.deepRoom=s.time;emit(s,'第一條深層巢路形成。下方土質與淺層已有明顯差異。',false,k);}
    for(const p of s.projects.filter(p=>p.status==='working'&&p.next===k)){p.tip=k;if(!p.continuous)p.remaining--;p.next=null;if(c.feature||c.layer==='碎石'){stopProject(s,p,c.feature||'遇到硬質碎石層');}else planProject(s,p);}
  }
  function autoGrowNest(s){
    if(workforce(s).available<2||s.projects.some(p=>p.status==='working'&&p.automatic))return;
    const direction=s.growthDirection||'deep',score=c=>direction==='left'?-c.x:direction==='right'?c.x:c.y;
    const visited=new Set([HOME]),queue=[HOME];let target=null;
    for(let i=0;i<queue.length;i++){
      const k=queue[i],c=cell(s,k);
      if(c?.seen&&!isSurface(s,c)&&!s.colonies.some(n=>distance(c,xy(n.home))<4)&&(!target||score(c)>score(target)))target=c;
      for(const next of neighbors(s,k))if(!visited.has(next)&&!isSurface(s,next)){visited.add(next);queue.push(next);}
    }
    if(!target)return;
    const p=project(s,tileKey(target),direction==='deep'?'down':direction,1,4);
    if(!p.error){p.automatic=true;emit(s,`王巢開始向${direction==='left'?'左側':direction==='right'?'右側':'深層'}自然延伸。`,false,p.start);}
  }
  function reaction(s,a,dt){
    if(a.hp<=0||a.retreat>0||a.job==='nurse'||a.primary)return false;
    const g=s.groups.find(g=>g.id===a.group);if(g&&['avoid','retreat'].includes(g.stance))return false;
    if(a.job==='guard')return false; // A stationed defender never abandons its choke point.
    const foes=s.ants.filter(b=>b.faction!==a.faction&&visible(s,a,b));
    if(!foes.length)return false;
    const friends=s.ants.filter(b=>b.faction===a.faction&&distance(a,b)<3.5),fighting=friends.find(b=>b.id!==a.id&&b.lastHit>s.time-3);
    if(!fighting||foes.length>friends.length*1.4||a.job==='scout'||a.carry)return false;
    const target=foes.sort((b,c)=>distance(a,b)-distance(a,c))[0];a.supporting=target.k;move(s,a,target.k,dt);a.action='支援';return true;
  }
  function observations(a){const t=a.traits||a,out=[];if(t.pred>.25)out.push(t.pred>.7?'體型明顯較大':'頭部略大');if((t.jaw||0)>.65)out.push('大顎異常突出');else if((t.jaw||0)>.25||t.pred>.4)out.push('顎部較粗，搬運力較強');if(t.min>.75)out.push('胸甲明顯硬化');else if(t.min>.25)out.push('表皮出現灰化');if((t.shell||0)>.25)out.push('外骨骼結構較結實');if((t.weight||0)>.45)out.push('身體較重，行動稍慢');return out.length?out:['體態接近原生巨山蟻'];}
  function territory(r) {if(!r.seen)return '未探索';if(r.ours>8&&r.theirs>8&&Math.abs(r.ours-r.theirs)<18)return '爭奪中';if(r.ours-r.theirs>8)return '己方活動占優';if(r.theirs-r.ours>8)return '敵方活動占優';return '無明顯控制';}
  function serialize(s){return JSON.stringify(s);}
  function restore(raw){const s=JSON.parse(raw);if(![1,2,3,4,5,6,7,8,9,10,11,12].includes(s.version)||s.cells?.length<W*H||!Array.isArray(s.ants)||!Array.isArray(s.groups)||!Array.isArray(s.broods)||!Number.isFinite(s.time))throw Error('不相容的存檔');s.speed=s.ended?0:(s.speed??1);return upgrade(s);}
  const API={W,H,HOME,ENEMY_HOME,CAMPAIGN,MAP_RULES,ENEMY_LAYOUTS,TASK,JOBS,JOB_NAMES,ROOM_TYPES,SOLDIER_NAMES,ENEMY_ARCHETYPES,key,surfaceKey,xy,cell,isSurface,adjacent,neighbors,passable,path,distance,validateEnemyLayout,enemyLayout,create,newWorldSeed,tick,workers,laborers,soldiers,assign,groupAdjust,allocateRoute,establishRoute,queueDig,seal,createExit,emit,observations,territory,serialize,restore,width,ant,visible,retreatThreat,upgrade,bounds,ensureChunk,ensureSurfaceChunk,expandToward,project,mine,stopProject,pressure,foodSafety,safeFood,assignFood,roomAt,roomEffect,foodCapacity,broodCapacity,nestStage,buildRoom,expandRoom,recycleRoom,cancelRoom,requestRoom,requestRoyalAt,workforce,clearWork,careNeed};
  if(typeof module!=='undefined')module.exports=API;root.AntEngine=API;
})(typeof globalThis!=='undefined'?globalThis:this);












