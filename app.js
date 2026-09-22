/* World-first interface: select an object, then one contextual action. */
(() => {
  'use strict';
  const E=window.AntEngine,C=window.AntInteraction,$=id=>document.getElementById(id),SAVE=location.search.includes('test=1')?'alien-ant-empire-qa-v0641':'alien-ant-empire-v0641';
  let s,hasSave=false;try{const prefix=location.search.includes('test=1')?'alien-ant-empire-qa-':'alien-ant-empire-',raw=localStorage.getItem(SAVE)||localStorage.getItem(prefix+'v064')||localStorage.getItem(prefix+'v0631')||localStorage.getItem(prefix+'v063')||localStorage.getItem(prefix+'v062')||localStorage.getItem(prefix+'v061')||localStorage.getItem(prefix+'v06')||localStorage.getItem(prefix+'v05');hasSave=!!raw;s=raw?E.restore(raw):E.create(E.newWorldSeed());if(!raw)s.speed=0;}catch{s=E.create(E.newWorldSeed());s.speed=0;}
  const world=new window.AntWorld($('map'));
  const menuArt=new window.AntMenuArt($('menuArt'),$('introArt')),audio=new window.AntAudio(),menuResumeSpeed=s.speed||1;
  let view='nest',context=null,selection=[],candidates=[],selectionTools=false,commandMode=null,split=false,digging=false,royalPlacement=false,commandMarker=null,postGameReview=false,journalFilter='all',broodId=s.broods[0]?.id,broodDraft=null,mergePreview=[],infoMode='',jobDraft=null,edit=null,last=performance.now(),acc=0,uiTime=0,contextTime=0,saveTime=0,toast=null,toastUntil=0,feedbackUntil=0,seenEvent=s.events[0],seenUiNotice=s.uiNotice?.id||0,lastNotice=-100,eventFocusUntil=0,lastSaved='尚未儲存',dialogSpeed=0,selectionLessonShown=false,commandLessonShown=false,inputHintUntil=performance.now()+5000;
  const stateNames=['卵','幼蟲','蛹'],jobNames={nurse:'育幼',forage:'覓食',dig:'挖掘',scout:'偵察',defense:'防守／戰鬥'};
  const introSlides=[
    ['序章','黑暗土壤中的心跳','一隻蟻后落入陌生森林。她帶來的不是回憶，而是一個尚未成形的王國。'],
    ['甦醒','讓巢穴開始呼吸','工蟻會採集、照護與開挖。你決定王國向何處生長，以及何時露出獠牙。'],
    ['戰役','森林裡不只有你','四個敵對蟻國正在擴張。找到牠們的巢口，攻入核心，讓最後一隻敵后沉默。']
  ];
  let introStep=0;
  function audioLabel(){const text=audio.muted?'聲音：關':'聲音：開';$('menuAudio').textContent=text;$('menuAudio').setAttribute('aria-pressed',String(!audio.muted));}
  function renderIntro(){const slide=introSlides[introStep];$('introChapter').textContent=slide[0];$('introTitle').textContent=slide[1];$('introText').textContent=slide[2];document.querySelectorAll('.intro-progress span').forEach((el,i)=>el.classList.toggle('active',i===introStep));menuArt.setIntroStep(introStep);const copy=document.querySelector('.intro-copy');copy.style.animation='none';requestAnimationFrame(()=>copy.style.animation='');$('nextIntro').textContent=introStep===introSlides.length-1?'進入蟻國':'繼續';}
  function closeIntro(){audio.unlock();$('intro').classList.add('hidden');$('mainMenu').classList.add('hidden');s.speed=0;last=performance.now();renderStatus();}
  function showIntro(){introStep=0;renderIntro();$('mainMenu').classList.add('hidden');$('intro').classList.remove('hidden');}
  s.speed=0;audioLabel();if(!hasSave){$('continueGame').textContent='開始新蟻國';$('newGame').classList.add('hidden');}
  function button(text,action,extra=''){return `<button data-action="${action}" ${extra}>${text}</button>`;}
  function actions(...buttons){return `<div class="actions">${buttons.join('')}</div>`;}
  function stepper(value,action,label,{min=0,max=Infinity,id='',editable=false}={}){return `<div class="stepper">${button('−',action,`data-delta="-1" data-id="${id}" aria-label="減少${label}" ${value<=min?'disabled':''}`)}${editable?`<input class="number-input" data-edit-input type="number" value="${value}" min="${min}" max="${max}" inputmode="numeric" aria-label="${label}">`:`<output>${value}</output>`}${button('＋',action,`data-delta="1" data-id="${id}" aria-label="增加${label}" ${value>=max?'disabled':''}`)}</div>`;}
  function tell(text){const el=$('feedback');if(!text){el.textContent='';el.classList.add('hidden');return;}el.textContent=text;el.classList.remove('hidden');feedbackUntil=performance.now()+3800;}
  function selectedAnts(){return E.workers(s).filter(a=>selection.includes(a.id));}
  function clearSelected(){selection=[];candidates=[];selectionTools=false;commandMode=null;}
  function closeContext(clear=true){context=null;edit=null;digging=false;split=false;broodDraft=null;mergePreview=[];if(clear)clearSelected();$('context').classList.add('hidden');$('world').classList.remove('has-context');renderSelection();}
  function renderSelection(){const soldiers=selectedAnts().filter(a=>a.caste==='soldier').length,hint=$('hint'),learning=performance.now()<inputHintUntil,text=royalPlacement?'點地下可達空腔，指定新王室位置。':selection.length?`已選 ${selection.length} 隻${soldiers?`（兵蟻 ${soldiers}）`:''} · 點目標下令後自動解除`:learning?'左鍵選蟻／拖框；Shift 加選；右鍵拖地圖。':'';hint.textContent=text;hint.classList.toggle('hidden',!text);}
  function renderTouchHint(){const mobile=matchMedia('(pointer: coarse)').matches||innerWidth<=600;$('touchHint').classList.toggle('hidden',!mobile||!!s.mobileBoxHintDone||s.ended);}
  function openContext(value){context=value;contextTime=0;if(value.kind==='brood'){const b=s.broods.find(b=>b.id===broodId);broodDraft=b?{feed:b.feed,add:b.add,wet:b.wet,breed:b.breed||'worker'}:null;}$('context').classList.remove('hidden');$('world').classList.add('has-context');$('contextBody').scrollTop=0;renderContext();}
  function switchView(next,clear=true){view=next;world.home(next);closeContext(clear);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('worldName').textContent=view==='nest'?'巢穴':'地表';$('worldSubtitle').textContent=view==='nest'?'通道，也是你的防線。':'沿著食物與足跡，探索森林。';}
  function focus(k,withPanel=false){const next=E.isSurface(s,k)?'surface':'nest';if(view!==next)switchView(next,false);world.focus(k,next,withPanel);}
  function resetGame(){s=E.create(E.newWorldSeed());s.speed=0;view='nest';context=null;selection=[];candidates=[];selectionTools=false;commandMode=null;split=false;digging=false;royalPlacement=false;commandMarker=null;postGameReview=false;broodId=s.broods[0]?.id;broodDraft=null;mergePreview=[];jobDraft=null;edit=null;toast=null;toastUntil=0;feedbackUntil=0;seenEvent=s.events[0];seenUiNotice=s.uiNotice?.id||0;eventFocusUntil=0;acc=0;uiTime=0;contextTime=0;saveTime=0;last=performance.now();world.targets=[];world.time=0;world.home('nest');$('eventToast').classList.add('hidden');$('eventText').textContent='';tell('');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='nest'));$('worldName').textContent='巢穴';$('worldSubtitle').textContent='通道，也是你的防線。';closeContext(false);requestAnimationFrame(()=>world.draw(s,{selected:[],target:null,digging:false,commandMarker:null},0));save();renderStatus();}
  function foodCount(k){const r=s.routes.find(r=>r.k===k);return r?E.workers(s,'forage').filter(a=>a.route===r.id).length:0;}
  function workforceRows(){const w=E.workforce(s);return `<div class="workforce"><span>總數 <strong>${w.total}</strong></span><span>待命 <strong>${w.idle}</strong></span><span>採集 <strong>${w.forage}</strong></span><span>搬運返巢 <strong>${w.returning}</strong></span><span>育幼 <strong>${w.nurse}</strong></span><span>挖掘施工 <strong>${w.dig+w.build}</strong></span><span>採掘 <strong>${w.mine||0}</strong></span><span>守衛 <strong>${w.guard}</strong></span><span>探索 <strong>${w.scout}</strong></span><span>戰鬥 <strong>${w.combat}</strong></span><span>休養 <strong>${w.rest}</strong></span><span>可調派 <strong>${w.available}</strong></span></div>`;}
  function nearbyEnemy(k){return s.ants.filter(a=>a.faction==='enemy'&&E.distance(a,E.xy(k))<4&&E.workers(s).some(b=>E.visible(s,b,a)));}
  function renderStatus(){
    const brood=s.broods.reduce((n,b)=>n+b.count,0),safety=E.foodSafety(s),trend=s.economy?.recentIncome-(s.economy?.recentConsumption||0),arrow=trend>.5?'↑':trend<-.5?'↓':'→';
    $('resources').innerHTML=`<span class="resource"><span>工蟻</span><strong>${E.laborers(s).length}</strong></span><span class="resource"><span>兵蟻</span><strong>${E.soldiers(s).length}</strong></span><span class="resource ${safety.level}"><span>食物 ${arrow}</span><strong>${Math.floor(s.food)}</strong></span><span class="resource extra"><span>敵國</span><strong>${s.enemyQueensAlive??s.colonies.filter(n=>!n.fallen).length}</strong></span><span class="resource extra"><span>幼體</span><strong>${brood}</strong></span>${s.queen<75?`<span class="resource danger"><span>蟻后</span><strong>${Math.ceil(s.queen)}%</strong></span>`:''}`;
    renderThreats();
    document.querySelectorAll('[data-speed]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.speed)===s.speed);b.disabled=s.ended&&!postGameReview;});
    renderSelection();renderTouchHint();$('result').classList.toggle('hidden',!s.ended||postGameReview);if(s.ended){const mainRooms=[...new Set(s.rooms.filter(r=>r.status==='active').map(r=>E.ROOM_TYPES[r.type]?.name).filter(Boolean))];$('resultTitle').textContent=s.won?'第一關勝利':'王國覆滅';$('resultText').textContent=s.won?'四個敵對蟻國的蟻后皆已死亡。這片森林地下，再沒有能與你的王國抗衡的蟻群。':s.failureReason||'己方蟻后死亡，請重新建立王國。';$('resultStats').innerHTML=`<span>時間 <strong>${formatTime(s.time)}</strong></span><span>工蟻 <strong>${E.laborers(s).length}</strong></span><span>兵蟻 <strong>${E.soldiers(s).length}</strong></span><span>食物 <strong>${Math.floor(s.food)}</strong></span><span>消滅敵國 <strong>${s.colonies.filter(n=>n.fallen).length}/4</strong></span><span>傷亡 <strong>${s.deaths}</strong></span><span>擊殺敵蟻 <strong>${s.kills}</strong></span><span>大型獵物 <strong>${s.wildlifeKills||0}</strong></span><span>王國階段 <strong>${s.nestStage}</strong></span><span>主要巢室 <strong>${mainRooms.length?mainRooms.join('、'):'尚未完成'}</strong></span>`;$('hint').textContent=s.won?'第一關勝利':'王國覆滅';$('hint').style.opacity='1';}
  }
  function renderThreats(){const host=$('threatIndicators'),zones=new Map(),queenK=s.queenK??E.HOME;for(const enemy of s.ants.filter(a=>a.faction==='enemy')){const sameQueenLayer=E.isSurface(s,enemy.k)===E.isSurface(s,queenK),sameEntranceLayer=E.isSurface(s,enemy.k)===E.isSurface(s,s.mainExit),nearby=E.workers(s).filter(a=>E.isSurface(s,a.k)===E.isSurface(s,enemy.k)&&E.distance(a,enemy)<5),queenThreat=sameQueenLayer&&E.distance(enemy,E.xy(queenK))<6,entranceThreat=sameEntranceLayer&&E.distance(enemy,E.xy(s.mainExit))<5;if(!nearby.length&&!queenThreat&&!entranceThreat)continue;const p=E.xy(enemy.k),name=E.isSurface(s,enemy.k)?p.x<8?'西側採集區':p.x>18?'東側森林':entranceThreat?'主巢入口':'北側資源區':queenThreat?'王室附近':entranceThreat?'主巢入口':'深層通道',id=(E.isSurface(s,enemy.k)?'s:':'n:')+name,z=zones.get(id)||{name,k:enemy.k,enemies:0,allies:0,queenThreat:false};z.enemies++;z.allies=Math.max(z.allies,nearby.length);z.queenThreat||=queenThreat;zones.set(id,z);}host.innerHTML=[...zones.values()].sort((a,b)=>Number(b.queenThreat)-Number(a.queenThreat)||b.enemies-a.enemies).slice(0,3).map(z=>`<button data-threat-k="${z.k}" class="${z.queenThreat?'danger':'combat'}"><strong>${z.queenThreat?'王室告急':z.name}</strong><span>敵 ${z.enemies} / 己 ${z.allies}</span></button>`).join('');host.classList.toggle('hidden',!host.children.length);}
  function segments(field,values,current){return `<div class="segments" role="group" aria-label="${{feed:'食物',add:'添加物',wet:'濕度',breed:'培育方向'}[field]}">${Object.entries(values).map(([value,label])=>{const unavailable=field==='feed'&&value==='protein'&&s.protein<.1||field==='add'&&(value==='mineral'&&s.minerals<.1||value==='shell'&&s.shells<.1)||field==='breed'&&((['armor','jaw'].includes(value)&&!E.roomEffect(s,'military'))||(value==='acid'&&!E.roomEffect(s,'mutation')));return button(label+(unavailable?'<small>'+ (field==='breed'?'需要對應巢室':'庫存不足')+'</small>':''),'broodSetting',`data-field="${field}" data-value="${value}" ${unavailable?'disabled':''} class="${value===current?'active':''}" aria-pressed="${value===current}"`);}).join('')}</div>`;}
  function renderBrood(){
    let b=s.broods.find(b=>b.id===broodId);if(!b){b=s.broods[0];broodId=b?.id;}
    if(!b){$('contextTitle').textContent='育幼巢';return '<p>目前沒有卵或幼蟲。維持食物，等待蟻后產卵。</p>';}
    $('contextTitle').textContent=`${stateNames[b.stage]} × ${b.count}`;$('contextEyebrow').textContent=E.roomAt(s,b.k??E.HOME)?.type==='nursery'?'育幼巢':'臨時育幼區';
    const d=b,nurses=E.laborers(s,'nurse'),assigned=nurses.filter(a=>a.care===b.id).length,shared=nurses.filter(a=>a.care===null).length;
    const observations=[];if(b.pred>.25)observations.push('頭部輪廓略大');if(b.min>.25)observations.push('表皮開始灰化');if(b.feed==='protein')observations.push('食量增加');if(b.health<50)observations.push('狀態衰弱，需要照護');
    const efficiency=1+E.roomEffect(s,'nursery')*.55,present=nurses.filter(a=>a.care===b.id&&E.distance(a,E.xy(b.k??E.HOME))<2).length,need=b.stage<2?Math.max(1,Math.ceil(b.count*.35/efficiency)):0,status=need===0?'目前無需額外照護':present>=need?'照護正常':present===0?'等待照護工蟻':'照護不足',w=E.workforce(s),reason=need===0?'目前無需額外照護。':present>=need?'照護工蟻已在幼體旁活動。':assigned>present?`${assigned-present} 隻照護工蟻正在前往。`:!b.autoCare?'玩家已關閉自動照護。':w.available?'可用工蟻將在下一次調度加入。':w.forage?'工蟻正在採集；系統會保留下一隻可用工蟻。':w.dig+w.build?'工蟻正在施工；完成後會自動補位。':w.guard+w.combat?'現有工蟻被手動鎖定於防守或戰鬥。':'目前沒有待命工蟻。';
    return `${s.broods.length>1?`<div class="brood-select"><select id="broodSelect" aria-label="選擇照護批次">${s.broods.map((x,i)=>`<option value="${x.id}" ${x.id===b.id?'selected':''}>${stateNames[x.stage]} × ${x.count} · 第 ${i+1} 批</option>`).join('')}</select></div>`:''}<div class="care-status ${need>0&&present<need?'danger':''}"><strong>照護狀態：${status}</strong><span>需求 ${need} · 目前 ${present}/${need} · 自動照護 ${b.autoCare?'開':'關'}</span></div>${workforceRows()}<div class="setting-row"><span>食物</span>${segments('feed',{normal:'普通',protein:'高蛋白'},d.feed)}</div><div class="setting-row"><span>添加物</span>${segments('add',{none:'無',shell:'甲殼殘片',mineral:'異常碎屑'},d.add)}</div><div class="setting-row"><span>濕度</span>${segments('wet',{dry:'偏乾',normal:'正常',wet:'偏濕'},d.wet)}</div><div class="setting-row breed-row"><span>方向</span>${segments('breed',{worker:'工蟻',soldier:'普通兵蟻',armor:'重甲',jaw:'巨顎',acid:'吐酸'},d.breed)}</div>${actions(button(b.autoCare?'關閉自動照護':'開啟自動照護','autoCare'))}<div class="observation">設定點選後立即套用；普通照護與成長由蟻群自動完成。<br>${observations.join(' · ')||'生長中的幼蟲尚無明顯差異。'}<br><span class="note">${reason}</span></div>`;
  }
  function renderContext(){
    if(!context)return;
    if(context.kind==='food'&&!s.resources.some(r=>r.k===context.k&&r.amount>0)||context.kind==='deadQueen'&&!s.resources.some(r=>r.k===context.k&&r.queenCorpse&&r.amount>0)||context.kind==='wildlife'&&!s.wildlife.some(w=>w.id===context.id&&!w.dead)){closeContext(false);return;}
    // Do not replace a native picker while the user is choosing a batch.
    if(document.activeElement?.id==='broodSelect'||document.activeElement?.matches?.('[data-edit-input]'))return;
    const k=context.k,c=E.cell(s,k),num=selectedAnts().length;
    let title='',eyebrow=view==='nest'?'地下':'森林',html='';
    if(edit){$('contextTitle').textContent=edit.title;$('contextEyebrow').textContent='調整後請確認';const html=stepper(edit.value,'editValue',edit.title,{min:edit.min??0,max:edit.max??E.workers(s).length,editable:edit.kind==='split'})+(edit.kind==='split'?`<div class="presets">${[['.25','25%'],['.5','50%'],['.75','75%'],['1','全部']].map(([v,label])=>button(label,'editPreset',`data-value="${v}"`)).join('')}</div>`:'')+actions(button('確認','confirmEdit','class="primary"'),button('取消','cancelEdit'));if($('contextBody').innerHTML!==html)$('contextBody').innerHTML=html;return;}
    if(context.kind==='overlap'){$('contextTitle').textContent='這裡有幾個物件';$('contextEyebrow').textContent='選擇想操作的對象';$('contextBody').innerHTML=actions(...context.choices.map((t,i)=>button({food:'食物',ants:'己方蟻群',enemy:'敵蟻',queen:'蟻后',brood:'幼體',room:'功能巢室',exit:'巢口',enemyQueen:'敵方蟻后',deadQueen:'蟻后遺骸',enemyNest:'敵巢',wildlife:'活體昆蟲',clue:'活動痕跡'}[t.kind]||'查看','chooseOverlap',`data-index="${i}"`)));return;}
    if(context.kind==='ants'){
      candidates=candidates.filter(id=>E.workers(s).some(a=>a.id===id));selection=selection.filter(id=>candidates.includes(id));
      title=`目前 ${selection.length} 隻`;eyebrow='已選取蟻群';
      const chosen=selectedAnts(),soldiers=chosen.filter(a=>a.caste==='soldier').length,hurt=chosen.filter(a=>a.hp/a.maxHp<=.7&&a.hp/a.maxHp>.3).length,critical=chosen.filter(a=>a.hp/a.maxHp<=.3).length;html=`<p>${soldiers?`${soldiers} 隻兵蟻 · `:''}點地圖位置直接下令。${hurt||critical?` ${hurt} 隻受傷，${critical} 隻重傷。`:''}</p>`;
      if(split){html+=`<div class="presets">${[['.25','少量'],['.5','一半'],['.75','大部分'],['1','全部']].map(([v,label])=>button(label,'splitPreset',`data-value="${v}"`)).join('')}</div>`+actions(button('微調數量','editSplit'));}
      else html+=actions(button('返回待命','standby','class="primary"'),button('投入育幼','selectedCare',chosen.some(a=>a.caste==='worker')&&s.broods.length?'':'disabled'),button('分兵','split'),button('守住此處','stay'));
    }else if(context.kind==='mergeConfirm'){
      title=`合併為 ${mergePreview.length} 隻`;eyebrow='地圖已高亮將合併的蟻群';html='<p>確認後才會把附近蟻群加入目前選取。</p>'+actions(button('確認合併','confirmMerge','class="primary"'),button('取消','cancelMerge'));
    }else if(context.kind==='destination'){
      const enemy=context.enemy,titleName=enemy?'敵蟻附近':k===E.HOME?'己方巢穴':E.isSurface(s,c)?'這片空地':'這條通道';title=titleName;eyebrow=`已選 ${num} 隻工蟻`;
      html=`<p>從目前的位置直接出發。</p>`;
      if(!c.seen||!E.passable(s,k)){html='<p>這裡尚未探索或無法通行，請選擇另一個位置。</p>';}
      else if(k===E.HOME)html+=actions(button('撤回','retreat','class="primary"'));
      else if(enemy)html+=actions(button('接戰','attack','class="primary"'),button('避開','avoid'));
      else html+=actions(button('前往','move','class="primary"'),button('守住','hold'));
    }else if(context.kind==='clue'){
      const colony=s.colonies.find(n=>n.id===context.source);title='未知蟻群活動跡象';eyebrow='足跡、氣味與搬運痕跡';html=`<p>${colony?.discovered?`${colony.name}可能正從這個方向活動。`:'痕跡延伸到尚未掌握的森林；追蹤可以提早發現威脅與新資源。'}</p>${actions(button('派蟻追蹤','scout','class="primary"'))}`;
    }else if(context.kind==='unknown'){
      title='未知的地下';eyebrow='尚未探索';html='<p>從相鄰通道慢慢挖掘，才能看清這裡。</p>';
    }else if(context.kind==='obstacle'){
      title='石塊';html='<p>工蟻無法穿過這裡，可以從旁邊繞行。</p>';
    }else if(context.kind==='brood'){
      title=E.roomAt(s,k)?.type==='nursery'?'育幼巢':'臨時育幼區';eyebrow='下一代';
    }else if(context.kind==='queen'){
      title='蟻后';eyebrow='族群的心臟';
      const counts=[0,0,0];s.broods.forEach(b=>counts[b.stage]+=b.count);
      const p=E.pressure(s),qp=s.queenProfile;html=`<div class="stat-pair"><span>健康</span><strong>${Math.ceil(s.queen)}%</strong></div><div class="stat-pair"><span>成熟狀態</span><strong>${qp.maturity>70?'成熟蟻后':qp.maturity>30?'穩定成長':'初生王國'}</strong></div><div class="stat-pair"><span>長期傾向</span><strong>${qp.tendency}</strong></div><div class="stat-pair"><span>產卵狀態</span><strong>${p.rate<.15?'繁殖放緩':'持續產卵'}</strong></div><div class="stat-pair"><span>巢穴壓力</span><strong>${p.crowd>1?'擁擠':p.crowd>.7?'空間逐漸不足':'空間充足'}</strong></div><p>食物 ${Math.floor(s.food)} · 卵 ${counts[0]} · 幼蟲 ${counts[1]} · 蛹 ${counts[2]}<br>傾向由長期食物、甲殼與異常物質自然累積。</p>${actions(button(s.royalTarget?'王室建造／遷移中':'建立新王室並遷后','royalDirection',s.royalTarget?'disabled':''))}`;
    }else if(context.kind==='food'){
      const food=s.resources.find(r=>r.k===k),count=foodCount(k),route=s.routes.find(r=>r.k===k),active=route?.active;title=food?.name||'食物';eyebrow=`剩餘 ${Math.ceil(food?.amount||0)} 食物`;
      const safe=!nearbyEnemy(k).length,taskLabel={WAITING_FOR_WORKER:'等待工蟻',WORKER_ASSIGNED:`已指派 ${count} 隻`,TRAVEL_TO_TARGET:`前往中 ${count} 隻`,PICKUP:'正在裝載',CARRYING:'已取得物資',RETURNING:'搬運回巢中',DELIVERING:'正在入庫',BLOCKED:'無法抵達'}[route?.state]||`${count} 隻工蟻採集`;html=`<p>${taskLabel} · ${safe?'周圍安全':'附近有敵方活動'}。${route?.stuckReason?'系統正在重新派工。':'已知安全食物由蟻群自行安排；選工蟻後點食物，可直接指定牠們採集。'}</p><div class="segments">${[['small','少量'],['half','一半'],['large','大量'],['auto','自動']].map(([value,label])=>button(label,'gatherMode',`data-value="${value}" class="${(route?.mode||'auto')===value?'active':''}"`)).join('')}</div>${active?actions(button('停止採集','stopGather')):''}`;
    }else if(context.kind==='exit'){
      const guards=C.guarding(s,k).length,danger=nearbyEnemy(k).length;title='巢口';eyebrow=danger?'敵蟻正在逼近':'巢穴與森林的交界';
      html=`<p>${danger?`附近可見 ${danger} 隻敵蟻。`:'附近暫未看到敵蟻。'}目前 ${guards} 隻工蟻守衛。</p>${actions(button('增派守衛','guardPlus','class="primary"'),button('減少守衛','guardMinus',guards?'':'disabled'))}`;
      html+=actions(button(c.narrow?'恢復寬度':'縮窄','narrow'),button('封閉','seal'));
      if(danger)html+=`<div class="actions secondary-actions">${button('集中防守','defendAll')}${button('召回附近工蟻','recall')}</div>`;
    }else if(context.kind==='deadQueen'){
      const corpse=s.resources.find(r=>r.queenCorpse&&r.k===k&&r.amount>0),route=s.routes.find(r=>r.k===k),count=foodCount(k),taskLabel={WAITING_FOR_WORKER:'等待可用工蟻',WORKER_ASSIGNED:`已指派 ${count} 隻`,TRAVEL_TO_TARGET:`${count} 隻前往中`,PICKUP:'正在拆解遺骸',CARRYING:'已取得戰利品',RETURNING:'搬運回巢中',DELIVERING:'正在入庫',BLOCKED:'無法抵達'}[route?.state];title='敵方蟻后遺骸';eyebrow='敵巢已瓦解';html=corpse?`<div class="stat-pair"><span>狀態</span><strong>${corpse.freshness>65?'新鮮':corpse.freshness>25?'開始腐敗':'只剩殘殼'}</strong></div><div class="stat-pair"><span>可處理量</span><strong>${Math.ceil(corpse.amount)}</strong></div>${taskLabel?`<div class="stat-pair"><span>搬運任務</span><strong>${taskLabel}</strong></div>`:''}<p>${E.roomEffect(s,'prey')?'工蟻會搬回獵物處理巢，產出較多高蛋白、甲殼與特殊組織。':'可以原地拆解；建立獵物處理巢後產出會更完整。'}</p>${actions(button(route?.active?'調整處理人力':'處理遺骸','processQueen','class="primary"'))}`:'<p>這具遺骸已腐敗或處理完畢，只剩逐漸消失的殘殼。</p>';
    }else if(context.kind==='wildlife'){
      const prey=s.wildlife.find(w=>w.id===context.id);title=prey?.kind||'大型昆蟲';eyebrow=prey?.dead?'已死亡':'活體獵物';html=prey?.dead?'<p>這具屍體現在可以採集。</p>':`<p>健康 ${Math.ceil(prey?.hp||0)} / ${prey?.maxHp||0}。活體不能直接搬運。</p>${actions(button('接近並攻擊','attack','class="primary"'),button('避開','avoid'))}`;
    }else if(context.kind==='enemy'||context.kind==='enemyNest'||context.kind==='enemyQueen'){
      const colony=s.colonies.find(n=>n.id===context.colony)||s.colonies.find(n=>E.xy(n.home).x===E.xy(k).x);title=context.kind==='enemyQueen'?'敵方蟻后':context.kind==='enemyNest'?(colony?.name||'敵巢入口'):'敵蟻';eyebrow=colony?`目前動向：${colony.strategy||'活動中'}`:'保持距離，觀察動向';
      const observed=colony?s.ants.filter(a=>a.faction==='enemy'&&a.colony===colony.id&&E.cell(s,a.k)?.seen).length:nearbyEnemy(k).length;html=`<p>${context.kind==='enemyQueen'?`健康 ${Math.ceil(colony?.queen||0)}% · 守軍會在受威脅時回防。`:context.kind==='enemyNest'?`已觀察兵力 ${observed}；削弱採集隊會減慢補充與遠征。`:`附近可見 ${Math.max(1,nearbyEnemy(k).length)} 隻敵蟻。`}</p>${context.kind==='enemyNest'?actions(button('偵察入口','scout'),button('進入','enterEnemy'),button('堵住入口','guardPlus')):actions(button('接戰','attack','class="primary"'),button('避開','avoid'))}`;
    }else if(context.kind==='roomCreate'){
      title='王國需要什麼？';eyebrow='蟻群會自行找位置、開路與塑形';html='<p>選擇功能即可，不需要先挖出精確尺寸。</p>'+actions(...Object.entries(E.ROOM_TYPES).filter(([type])=>type!=='royal').map(([type,r])=>button(r.name,'chooseRoomType',`data-value="${type}"`)));
    }else if(context.kind==='royalDirection'){
      title='指定新王室位置';eyebrow='直接在地下選擇安全空腔';html='<p>王室完成後，蟻后會沿通道實際移動，護衛將在新核心集結。</p>'+actions(button('在地圖選位置','beginRoyalPlacement','class="primary"'));
    }else if(context.kind==='roomDirection'){
      title=`把${E.ROOM_TYPES[context.type].name}設在哪個方向？`;eyebrow='只決定大方向';html='<p>蟻群會自行留下通道與未來擴建空間。</p>'+actions(...[['left','左側'],['right','右側'],['deep','深層'],['core','靠近核心'],['entrance','靠近巢口']].map(([dir,label])=>button(label,'placeRoom',`data-value="${dir}"`)));
    }else if(context.kind==='room'){
      const room=s.rooms.find(r=>r.id===context.id)||E.roomAt(s,k);title=room?E.ROOM_TYPES[room.type].name:'功能巢室';eyebrow=room?.status==='active'?`${room.size===1?(room.maturity>=50?'成熟':'初建'):room.size===2?'大型':'巨型'} · 成熟度 ${Math.floor(room.maturity)}%`:room?.status==='excavating'?'工蟻正在自動開路與挖空腔':'工蟻塑形中';if(room?.status==='active'){const broods=s.broods.filter(b=>(b.k??E.HOME)===room.k||room.cells.includes(b.k??E.HOME)),stages=[0,0,0];broods.forEach(b=>stages[b.stage]+=b.count);const nearby=E.workers(s).filter(a=>E.distance(a,E.xy(room.k))<2),injured=nearby.filter(a=>a.hp<a.maxHp),critical=injured.filter(a=>a.hp/a.maxHp<=.3),military=broods.filter(b=>b.breed!=='worker'&&b.breed!=='acid'),mutating=broods.filter(b=>b.breed==='acid'||b.add==='mineral'),stock=Object.entries(s.stock||{}).filter(([,v])=>v>0).map(([t,v])=>`${{seed:'種子',fruit:'果實',sap:'汁液',insect:'昆蟲',queen:'蟻后組織',other:'混合食物'}[t]||t} ${Math.floor(v)}`).join(' · ')||'尚無分類庫存';html={nursery:`<div class="stat-pair"><span>幼體總數</span><strong>${stages.reduce((a,b)=>a+b,0)} / ${E.broodCapacity(s)}</strong></div><p>卵 ${stages[0]} · 幼蟲 ${stages[1]} · 蛹 ${stages[2]}<br>照護工蟻 ${nearby.filter(a=>a.job==='nurse').length} · ${s.food<8?'食物不足':stages[0]+stages[1]&&nearby.filter(a=>a.job==='nurse').length===0?(E.workers(s,'nurse').some(a=>broods.some(b=>b.id===a.care))?'照護工蟻前往中':'等待照護工蟻'):'成長正常'}<br>特殊投入：${broods.some(b=>b.add!=='none')?'使用中':'無'}</p>`,store:`<div class="stat-pair"><span>目前庫存</span><strong>${Math.floor(s.food)} / ${E.foodCapacity(s)}</strong></div><p>${stock}<br>${s.food/E.foodCapacity(s)>.85?'接近滿載':'仍有空間'} · 搬入 ${nearby.filter(a=>a.carry).length} 隻</p>`,prey:`<div class="stat-pair"><span>累計處理</span><strong>${Math.floor(s.preyProcessed||0)}</strong></div><p>等待搬回 ${s.resources.filter(r=>r.large&&r.amount>0).length} 處 · 正在搬運 ${E.workers(s,'forage').filter(a=>a.largePrey).length} 隻<br>高蛋白 ${Math.floor(s.protein)} · 甲殼 ${Math.floor(s.shells)} · 特殊組織 ${Math.floor(s.tissues)}</p>`,rest:`<div class="stat-pair"><span>恢復中</span><strong>${injured.length}</strong></div><p>重傷 ${critical.length} · 平均恢復 ${injured.length?Math.floor(injured.reduce((n,a)=>n+a.hp/a.maxHp,0)/injured.length*100):100}%<br>受傷蟻會自行返回，不需逐隻治療。</p>`,military:`<div class="stat-pair"><span>戰鬥型幼體</span><strong>${military.reduce((n,b)=>n+b.count,0)}</strong></div><p>${military.map(b=>`${{soldier:'普通兵蟻',armor:'重甲兵蟻',jaw:'巨顎兵蟻'}[b.breed]||'兵蟻'} ×${b.count}`).join(' · ')||'目前沒有培育'}<br>${s.shells<1?'甲殼材料偏少':'材料可用'} · 軍事巢會逐步維持約四分之一普通兵力；完成後自動羽化。</p>`,mutation:`<div class="stat-pair"><span>可使用碎屑</span><strong>${Math.floor(s.minerals)}</strong></div><p>採掘待搬運 ${Math.floor(E.workers(s).reduce((n,a)=>n+(a.mineralCargo||0),0))} · 特殊組織 ${Math.floor(s.tissues)} · 受影響幼體 ${mutating.reduce((n,b)=>n+b.count,0)}<br>${E.workers(s).some(a=>a.traits.acid>.2||a.special)?'已觀察到異變傾向':'尚未觀察到穩定性狀'}</p>`,royal:`<p>蟻后 ${s.queenK===room.k?'已進駐':'遷移中'} · 健康 ${Math.ceil(s.queen)}%<br>護衛 ${nearby.filter(a=>a.job==='guard'||a.caste==='soldier').length} 隻</p>`}[room.type]+`<p class="note">巢室會依實際使用、人口、資源與可用空間自然成熟並擴建。</p><div class="segments">${[['balanced','均衡'],['capacity','容量'],['quality','品質']].map(([v,label])=>button(label,'roomPolicy',`data-value="${v}" class="${room.policy===v?'active':''}"`)).join('')}</div>${actions(button('回收巢室','recycleRoom'))}`;}else {const workers=E.laborers(s).filter(a=>a.roomProject===room?.id).length,opened=room?.planCells?.filter(q=>E.cell(s,q)?.open).length||0,total=room?.planCells?.length||1,percent=room?.status==='excavating'?Math.floor(opened/total*100):Math.min(99,Math.floor((room?.progress||0)/Math.max(1,14*(room?.targetSize||1))*100));html=`<div class="stat-pair"><span>施工進度</span><strong>${percent}%</strong></div><p>${workers} 隻工蟻正在前往或施工 · ${workers?`約 ${Math.ceil((100-percent)/Math.max(1,workers*1.5))} 秒後再查看`:'等待可用工蟻'}。</p>${actions(button('取消施工','cancelRoom'))}`;}
    }else if(context.kind==='project'){
      title='往哪裡擴巢？';html='<p>工蟻會連續挖掘；遇到發現或硬地層時停下。</p>'+actions(...[['down','向下開挖'],['left','向左擴展'],['right','向右擴展'],['chamber','擴大空腔']].map(([dir,label])=>button(label,'projectDirection',`data-value="${dir}"`)));
    }else if(c?.exitCandidate){title='通道接近地表';html='<p>這裡尚未成為巢口。可建立副出口、整理通氣孔，或保持封閉。</p>'+actions(button('建立副巢口','createExit','data-value="exit" class="primary"'),button('通氣孔','createExit','data-value="vent"'),button('保持封閉','createExit','data-value="closed"'));}
    else if(c?.sealed){title='已封閉的通道';html='<p>重新開啟需要 2 食物。</p>'+actions(button('重新挖開','seal','class="primary"'));}
    else if(context.kind==='soil'){
      title=c.hard?'未知黑色表面':c.feature||c.layer;eyebrow='尚未挖開';
      const reachable=E.adjacent(k).some(n=>E.passable(s,n)&&E.cell(s,n).seen||s.digQueue.includes(n));
      html=c.hard?'<p>這片表面異常平整，工蟻暫時無法挖穿。</p>':s.digQueue.includes(k)?'<p>工蟻正在前來挖掘。</p>':reachable?'<p>打通這裡，探索更深處。</p>'+actions(button('挖掘','dig','class="primary"')):'<p>先挖通旁邊的土層，工蟻才能抵達。</p>';
    }else if(c?.open&&c.deposit>0){
      const task=s.miningTasks.find(t=>t.k===k&&t.status==='working'),assigned=task?.assignedWorkers?.length??E.laborers(s,'mine').filter(a=>a.miningTask===task?.id).length,stateText={WAITING_FOR_WORKER:'等待工蟻',WORKER_ASSIGNED:`已指派 ${assigned} 隻`,TRAVEL_TO_TARGET:`前往中 ${assigned} 隻`,WORKING:`採掘中 ${assigned} 隻`,PICKUP:'正在裝載',CARRYING:'搬運準備中',RETURNING:'搬運回巢中',DELIVERING:'正在入庫',BLOCKED:`無法抵達${task?.blockedReason?'：'+task.blockedReason:''}`,COMPLETE:'已完成'}[task?.state];title=c.feature||'異常碎屑';eyebrow=`可採掘 ${Math.ceil(c.deposit)}`;html=`<p>${task?(stateText||'重新派工中'):'工蟻會將碎屑採入共用庫存。'}${task?.collected?` · 已採掘 ${Math.floor(task.collected)}`:''}</p>`+(task?'':actions(button('開始採掘','mine','class="primary"')));
    }else if(c&&E.isSurface(s,c)){title=c.seen?'森林地面':'未探索的森林';html='<p>派一隻工蟻看看前方。</p>'+actions(button('派蟻探索','scout','class="primary"'));}
    else{
      title=E.width(s,k)===1?'狹窄通道':'空腔與岔路';html=`<p>${E.width(s,k)===1?'少量工蟻也能守住窄口。':'這裡可以容納更多工蟻，也可以往不同方向走。'}</p>`;
      const working=s.projects.find(p=>p.status==='working'&&(p.tip===k||p.start===k));
      html+=working?`<p>${working.waiting?'工程保留中，等待可用工蟻。':working.continuous?'持續開挖中；除非取消、受傷或遇到無法通過的地層，工程不會自行結束。':`工程持續中，剩餘 ${working.remaining} 段。`}</p>`+actions(button('停止挖掘','stopProject',`data-id="${working.id}"`)):actions(button('擴建巢穴','extend','class="primary"'),button('建立功能巢室','roomCreate'),button(c.narrow?'恢復寬度':'縮窄','narrow'),button('封閉','seal'),button('守住','guardPlus'));
    }
    if(context.kind==='room'){const militaryRoom=s.rooms.find(r=>r.id===context.id)||E.roomAt(s,k);if(militaryRoom?.status==='active'&&militaryRoom.type==='military')html+=`<div class="setting-row"><span>培育</span><div class="segments">${[['soldier','普通'],['armor','重甲'],['jaw','巨顎'],['acid','吐酸']].map(([v,label])=>button(label,'militaryFocus',`data-value="${v}" class="${(militaryRoom.militaryFocus||'soldier')===v?'active':''}"`)).join('')}</div></div><p class="note">特殊方向會消耗高蛋白與對應材料；材料不足時先培育普通兵蟻。</p>`;}
    $('contextTitle').textContent=title;$('contextEyebrow').textContent=eyebrow;
    if(context.kind==='brood')html=renderBrood();
    const body=$('contextBody'),scroll=body.scrollTop;if(body.innerHTML!==html)body.innerHTML=html;body.scrollTop=scroll;
  }
  function chooseAnts(id,toggle=false){
    if(toggle){selection=selection.includes(id)?selection.filter(x=>x!==id):[...selection,id];}else selection=[id];candidates=[...selection];selectionTools=selection.length>0;commandMode=null;split=false;digging=false;inputHintUntil=0;closeContext(false);renderSelection();if(selection.length&&!selectionLessonShown){selectionLessonShown=true;tell('已選取。點地圖、資源或敵人直接下令。');}
  }
  function selectMany(ids,add=false){selection=add?[...new Set([...selection,...ids])]:[...new Set(ids)];candidates=[...selection];selectionTools=selection.length>0;commandMode=null;closeContext(false);renderSelection();}
  function interact(hit,k,toggle=false){
    if(k===null)return;if(s.ended){tell('蟻后已死亡，可在設定重新開始。');return;}
    if(royalPlacement){const result=E.requestRoyalAt(s,k);if(result.error){tell(result.error);return;}s.royalTarget=result.id;royalPlacement=false;commandMarker={k:result.k,type:'build',until:performance.now()+1400};tell('新王室位置已確認，工蟻開始開路與塑形。');focus(result.k);renderSelection();return;}
    if(digging){const result=C.dig(s,k);tell(result.error||'工蟻開始挖掘。');if(!result.error){digging=false;openContext({kind:'soil',k});}return;}
    if(hit?.kind==='ants'&&(!selection.length||toggle)){chooseAnts(hit.id,toggle);return;}
    if(selection.length){const target=['ants','clue'].includes(hit?.kind)?{kind:'ground',k:hit.k}:hit;if(target?.kind==='soil'){openContext({kind:'soil',k});return;}const result=C.direct(s,selection,target,k);if(result.error)tell(result.error);else{tell(result.text||`${result.count} 隻蟻已出發。`);commandLessonShown=true;commandMarker={k,type:['enemy','enemyQueen','enemyNest','wildlife'].includes(target?.kind)?'attack':['food','deadQueen'].includes(target?.kind)?'gather':target?.kind==='exit'?'cross':'move',until:performance.now()+1200};audio.command(commandMarker.type);clearSelected();closeContext(false);}return;}
    if(selection.length)clearSelected();
    if(!E.cell(s,k)){E.expandToward(s,k);if(!E.cell(s,k))return;}const cell=E.cell(s,k),kind=!E.isSurface(s,cell)&&!cell.seen?'unknown':E.isSurface(s,cell)&&!cell.open&&cell.seen?'obstacle':hit?.kind||'ground';
    if(kind==='brood')broodId=s.broods.find(b=>(b.k??E.HOME)===k)?.id??broodId;openContext({kind,k,id:hit?.id,colony:hit?.colony});
  }
  function resolveIds(k,evade=false){if(selection.length)return selection;const list=C.available(s,evade?E.HOME:k);return (evade?list.filter(a=>E.distance(a,E.xy(k))<6):list).slice(0,3).map(a=>a.id);}
  function moveCommand(action){const k=context.k,evade=action==='avoid',military=action==='attack'&&!selection.length?E.soldiers(s).filter(a=>E.path(s,a.k,k)!==null).sort((a,b)=>E.distance(a,E.xy(k))-E.distance(b,E.xy(k))).slice(0,5).map(a=>a.id):[],ids=military.length?military:resolveIds(k,evade);const destination=evade||action==='retreat'?E.HOME:k,stance=action==='attack'?'attack':evade?'avoid':action==='retreat'?'retreat':'defend';const result=action==='attack'&&['enemyQueen','wildlife'].includes(context.kind)?C.direct(s,ids,context,destination):C.order(s,ids,destination,stance);if(result.error)tell(result.error);else{closeContext();audio.command(action==='attack'?'attack':'move');tell(`${result.count} 隻蟻${{attack:'開始接戰',avoid:'避開敵蟻並回巢',retreat:'正在撤回',move:'開始移動',hold:'前往守住位置'}[action]}。`);}}
  function jobCount(job){return job==='defense'?E.workers(s).filter(a=>['combat','guard'].includes(a.job)).length:E.workers(s,job).length;}
  function renderInfo(){
    if(!infoMode||document.activeElement?.tagName==='SELECT')return;
    const oldScroll=$('infoBody').scrollTop;let html='';
    if(infoMode==='jobEdit'){ $('infoTitle').textContent='調整'+jobNames[jobDraft.job];html=stepper(jobDraft.value,'jobDraftValue','工作數量',{max:jobDraft.max})+actions(button('確認','confirmJob'),button('取消','cancelJob'));}else if(infoMode==='colony'){
      $('infoTitle').textContent='蟻群';const counts=[0,0,0];s.broods.forEach(b=>counts[b.stage]+=b.count);
      const hurt=E.workers(s).filter(a=>a.hp/a.maxHp<=.7&&a.hp/a.maxHp>.3).length,critical=E.workers(s).filter(a=>a.hp/a.maxHp<=.3).length;html=`<div class="summary-grid">${[['蟻后',s.queen>0?1:0],['工蟻',E.laborers(s).length],['兵蟻',E.soldiers(s).length],['幼體',counts.reduce((a,b)=>a+b,0)],['受傷',hurt],['重傷',critical],['傷亡',s.deaths],['巢穴',s.nestStage]].map(([name,n])=>`<div class="summary-item"><span>${name}</span><strong>${n}</strong></div>`).join('')}</div>`;
      const campaign=s.colonies.map(n=>{const known=n.discovered||n.fallen,label=known?n.name:'未知勢力',ratio=(n.population||n.initialPower||0)/Math.max(1,n.initialPower||1),state=n.fallen?'已滅亡':!known?'尚未確認':ratio<.45?'陷入衰弱':ratio<.75||n.recoveryState==='recovering'?'受到削弱':n.strategy||'活動中';return `<div class="job-row"><span>${label}</span><strong>${state}</strong></div>`;}).join('');html+=`<h3>戰役態勢</h3><p class="note">敵后仍存 ${s.enemyQueensAlive??s.colonies.filter(n=>!n.fallen).length} / 4</p>${campaign}<h3>工蟻調度</h3>${workforceRows()}<p class="note">系統優先保留育幼、施工與待命人力；完成工作後會自動重新調派。</p><h3>王巢發展方向</h3><div class="segments">${[['left','左側'],['deep','深層'],['right','右側']].map(([v,label])=>button(label,'growthDirection',`data-value="${v}" class="${s.growthDirection===v?'active':''}"`)).join('')}</div><h3>兵蟻構成</h3>${Object.entries(E.SOLDIER_NAMES).map(([type,name])=>`<div class="job-row"><span>${name}</span><strong>${E.soldiers(s,type).length} 隻</strong></div>`).join('')}<h3>功能巢室</h3>${Object.entries(E.ROOM_TYPES).map(([type,r])=>{const rooms=s.rooms.filter(x=>x.type===type),active=rooms.filter(x=>x.status==='active').length;return `<div class="job-row"><span>${r.name}</span>${rooms.length?button(`${active}/${rooms.length} · 定位`,'locateRoom',`data-id="${rooms[0].id}"`):'<strong>0</strong>'}</div>`;}).join('')}<h3>已觀察到的性狀</h3>`;
      const places=[['王室',s.queenK??E.HOME],['主巢入口',s.mainExit],...s.colonies.filter(n=>n.discovered).map(n=>[`${n.name}${n.fallen?'（已滅亡）':''}`,E.key(E.xy(n.home).x,4)])];const activeBattle=s.ants.find(a=>a.faction==='enemy'&&E.workers(s).some(w=>E.isSurface(s,w.k)===E.isSurface(s,a.k)&&E.distance(w,a)<4));if(activeBattle)places.push(['重大戰區',activeBattle.k]);html+=`<h3>重要地點</h3><div class="location-list">${places.map(([name,k])=>button(name,'locatePlace',`data-k="${k}"`)).join('')}</div>`;
      const observed=new Map();for(const ant of E.workers(s))for(const label of E.observations(ant))observed.set(label,(observed.get(label)||0)+1);
      html+=[...observed].map(([label,count])=>'<p>'+label+' · '+count+' 隻</p>').join('')+'<h3>特殊個體</h3>';
      const special=E.workers(s).filter(a=>a.special||a.traits.pred>.85||a.traits.min>1||a.traits.jaw>.9||a.traits.shell>.9);
      html+=special.length?special.map(a=>'<div class="individual"><div><strong>'+(a.specialTrait||E.observations(a)[0])+'</strong><p>'+E.observations(a).join(' · ')+'</p></div>'+button('查看','individual','data-id="'+a.id+'"')+'</div>').join(''):'<p>尚未出現顯著不同的個體。</p>';
      html+=`<p>高蛋白 ${Math.floor(s.protein)} · 甲殼材料 ${Math.floor(s.shells)} · 特殊組織 ${Math.floor(s.tissues)} · 異常碎屑 ${Math.floor(s.minerals)}</p><p class="note">累計羽化 ${s.births} 隻 · 蟻后健康 ${Math.ceil(s.queen)}%</p>`;
    }else if(infoMode==='reset'){
      $('infoTitle').textContent='重新開始？';html='<p>目前蟻國的本機存檔將被新開局取代。</p>'+actions(button('保留目前蟻國','settings'),button('開始新蟻國','confirmReset','class="danger-button"'));
    }else{
      $('infoTitle').textContent=infoMode==='journal'?'蟻國記事':'設定';html=infoMode==='journal'?'':`<div class="settings-actions">${button('儲存','save')}${button('操作提示','help')}${button(audio.muted?'開啟聲音':'關閉聲音','audioToggle')}${button('重新開始','reset','class="quiet"')}</div><p class="note">世界種子 ${s.worldSeed} · ${lastSaved} · 每 15 秒自動儲存</p><div class="observation">外界壓力 ${s.world.pressure<1?'低':s.world.pressure<2?'上升中':'高'} · 食物吸引 ${s.world.attraction<1?'低':'明顯'} · 敵意 ${s.world.hostility<1?'低':'升高'}${s.world.expeditions?.length?`<br>敵方動向：${s.world.expeditions.map(ex=>`${s.colonies.find(n=>n.id===ex.source)?.name||'敵群'}${{scout:'偵察',tracks:'留下足跡',gathering:'集結',advance:'進軍'}[ex.phase]}`).join('、')}`:''}</div><p class="note">診斷：活動個體 ${s.ants.length+s.wildlife.filter(w=>!w.dead).length} · 畫面目標 ${world.targets.length} · 累計尋路 ${s.perf?.pathCalls||0} · 記事 ${s.events.length}</p>`;
      if(infoMode==='help')html+='<div class="observation">左鍵點選，按住左鍵拖框多選；Shift 可加選或取消個別單位。<br>選取後點空地移動、點資源採集、點敵人接戰、點未挖土層施工。命令成立後自動解除選取。<br>右鍵或中鍵拖曳地圖，也可用 WASD／方向鍵平移；雙指或滾輪縮放。<br>已知安全食物由工蟻自動採集；點幼體可即時調整特殊培育投入。</div>';
      if(infoMode==='journal'){const filters=[['all','全部'],['important','重要'],['battle','戰鬥'],['development','發展'],['exploration','探索']];const events=s.events.filter(e=>journalFilter==='all'||(e.category||'exploration')===journalFilter);html+=`<div class="segments journal-filters">${filters.map(([v,label])=>button(label,'journalFilter',`data-value="${v}" class="${journalFilter===v?'active':''}"`)).join('')}</div><h3>${filters.find(x=>x[0]===journalFilter)?.[1]}記事</h3>${events.map(e=>`<div class="log-item ${e.urgent?'urgent':''}"><time>${formatTime(e.time)}</time><span>${e.text}</span></div>`).join('')||'<p class="empty">目前沒有這一類記事。</p>'}`;}
    }
    if($('infoBody').innerHTML!==html)$('infoBody').innerHTML=html;$('infoBody').scrollTop=oldScroll;
  }
  function showInfo(mode){infoMode=mode;renderInfo();if(!$('info').open){dialogSpeed=s.speed;s.speed=0;$('info').showModal();}$('infoBody').scrollTop=0;renderStatus();}
  function formatTime(time){return `${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;}
  function save(notify=false){try{localStorage.setItem(SAVE,E.serialize(s));lastSaved='已儲存 '+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});if(notify)tell('蟻國已儲存。');}catch{lastSaved='瀏覽器無法儲存';if(notify)tell('請允許網站使用本機儲存空間。');}}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    audio.unlock();if(!b.closest('.time-controls')&&!b.closest('.menu-actions'))audio.ui();
    if(b.dataset.threatK){const raw=b.dataset.threatK;focus(/^-?\d+$/.test(raw)?Number(raw):raw);tell('鏡頭已移到目前前線。');return;}
    if(b.dataset.view){switchView(b.dataset.view,false);return;}
    if(b.dataset.speed){s.speed=s.ended?0:Number(b.dataset.speed);renderStatus();return;}
    const action=b.dataset.action;if(!action)return;
    const delta=Number(b.dataset.delta),id=Number(b.dataset.id),k=context?.k;
    if(['move','hold','attack','avoid','retreat'].includes(action))moveCommand(action);
    else if(action==='cancel')closeContext();
    else if(action==='commandMove'){commandMode='move';selectionTools=true;tell('點選目的地。');renderSelection();}
    else if(action==='standby'){const result=C.standby(s,selection);tell(`${result.count} 隻工蟻已解除工作，返回待命。`);selectionTools=false;closeContext(false);}
    else if(action==='selectionHold'){const ants=selectedAnts(),k=ants[0]?.k,result=k==null?{error:'請先選取工蟻。'}:C.assignSelected(s,selection,'guard',k);tell(result.error||`${result.count} 隻工蟻守住目前位置。`);if(!result.error){selectionTools=false;commandMode=null;}closeContext(false);}
    else if(action==='selectionReturn'){const result=C.order(s,selection,E.HOME,'retreat');tell(result.error||`${result.count} 隻工蟻返回巢穴。`);if(!result.error){selectionTools=false;commandMode=null;}closeContext(false);}
    else if(action==='selectionDig'){const a=selectedAnts()[0];if(a)openContext({kind:'project',k:a.k});}
    else if(action==='selectedCare'){const result=C.assignSelected(s,selection,'care',s.broods.find(x=>x.stage<2)?.id);tell(result.error||`${result.count} 隻工蟻投入育幼。`);closeContext();}
    else if(action==='split'){split=true;const a=selectedAnts()[0];if(a)openContext({kind:'ants',k:a.k});}
    else if(action==='splitPreset'){selection=candidates.slice(0,Math.max(1,Math.ceil(candidates.length*Number(b.dataset.value))));closeContext(false);}
    else if(action==='chooseOverlap'){const choice=context.choices[Number(b.dataset.index)];interact(choice,choice.k);}
    else if(action==='merge'){mergePreview=C.nearby(s,selection);selection=[...mergePreview];openContext({kind:'mergeConfirm',k});}
    else if(action==='confirmMerge'){candidates=[...mergePreview];selection=[...mergePreview];mergePreview=[];closeContext(false);tell(`已合併為 ${selection.length} 隻。`);}
    else if(action==='cancelMerge'){selection=[...candidates];mergePreview=[];openContext({kind:'ants',k});}
    else if(action==='stay'){const result=C.order(s,selection,k,'defend');tell(result.error||'工蟻守住目前位置。');closeContext();}
    else if(action==='editSplit')edit={kind:'split',title:'分兵數量',value:selection.length,min:1,max:candidates.length};
    else if(action==='editPreset')edit.value=Math.max(1,Math.ceil(candidates.length*Number(b.dataset.value)));
    else if(action==='editCare')edit={kind:'care',title:'照護工蟻',value:E.workers(s,'nurse').filter(a=>a.care===broodId).length};
    else if(action==='editGather')edit={kind:'gather',title:'採集工蟻',value:foodCount(k)};
    else if(action==='projectDirection'){const count=selection.length||Math.max(1,Math.min(5,E.workforce(s).available));const r=E.project(s,k,b.dataset.value,count,Infinity,selection);tell(r.error||`${count} 隻工蟻開始持續開挖。`);if(!r.error)closeContext();}
    else if(action==='editValue')edit.value=Math.max(edit.min??0,Math.min(edit.max??E.workers(s).length,edit.value+delta));
    else if(action==='cancelEdit'){edit=null;closeContext(false);}
    else if(action==='confirmEdit'){
      const input=document.querySelector('[data-edit-input]');if(input)edit.value=Math.max(edit.min??0,Math.min(edit.max??E.workers(s).length,Math.round(Number(input.value)||1)));
      let error='';if(edit.kind==='split')selection=candidates.slice(0,edit.value);
      if(edit.kind==='care'||edit.kind==='gather'){const current=edit.kind==='care'?E.workers(s,'nurse').filter(a=>a.care===broodId).length:foodCount(k),diff=edit.value-current;for(let i=0;i<Math.abs(diff);i++){const r=edit.kind==='care'?C.care(s,broodId,Math.sign(diff)):C.gather(s,k,Math.sign(diff));if(r.error){error=r.error;break;}}}
      if(edit.kind==='project'){const chosen=selection.length?selection.slice(0,edit.value):[],r=E.project(s,k,edit.direction,chosen.length||edit.value,Infinity,chosen);error=r?.error||'';if(!error)tell(`${chosen.length?`已由選取的 ${chosen.length} 隻工蟻`:`已派出 ${edit.value} 隻工蟻`}開始持續開挖。`);}
      if(error)tell(error);else if(edit.kind!=='project')tell('已確認。');closeContext(edit.kind!=='split');
    }
    else if(action==='autoCare'){const brood=s.broods.find(b=>b.id===broodId);if(brood)brood.autoCare=!brood.autoCare;}
    else if(action==='confirmBrood'||action==='cancelBrood'){closeContext();}
    else if(action==='narrow'){const c=E.cell(s,k);c.narrow=!c.narrow;tell(c.narrow?'通道已縮窄。':'通道恢復原有寬度。');}
    else if(action==='stopProject'){const p=s.projects.find(p=>String(p.id)===b.dataset.id);if(p)E.stopProject(s,p,'玩家停止');}
    else if(action==='enterEnemy'){const colony=s.colonies.find(n=>n.id===context.colony)||s.colonies.find(n=>E.xy(n.home).x===E.xy(k).x),ids=selection.length?[...selection]:E.soldiers(s).filter(a=>E.path(s,a.k,colony?.queenK??k)!==null).sort((a,b)=>E.distance(a,E.xy(k))-E.distance(b,E.xy(k))).slice(0,12).map(a=>a.id),r=C.direct(s,ids,{kind:'enemyNest',k,colony:colony?.id},k);tell(r.error||r.text);if(!r.error){clearSelected();closeContext(false);}}
    else if(action==='splitCount')selection=candidates.slice(0,Math.max(1,Math.min(candidates.length,selection.length+delta)));
    else if(action==='gather'||action==='gatherCount'){const result=C.gather(s,k,action==='gather'?1:delta);tell(result.error||'已標記採集，工蟻會自行維持搬運。');}
    else if(action==='gatherMode'){const result=C.setGatherMode(s,k,b.dataset.value);if(result.error)tell(result.error);else if(result.assigned)tell(`已派遣 ${result.assigned} 隻工蟻前往採集；此資源點目前共 ${result.count} 隻。`);else if(result.pending)tell(`已標記採集，等待 ${result.pending} 隻可用工蟻。`);else tell(`此資源點已有 ${result.count} 隻工蟻採集。`);if(!result.error)closeContext();}
    else if(action==='processQueen'){const result=C.setGatherMode(s,k,'queen');if(result.error)tell(result.error);else tell(result.assigned?`已派遣 ${result.assigned} 隻工蟻處理蟻后遺骸。`:'已標記遺骸，等待可用工蟻。');if(!result.error)closeContext();}
    else if(action==='mine'){const count=selection.length||Math.max(1,Math.min(4,E.workforce(s).available));const result=E.mine(s,k,count,selection);tell(result.waiting?'已建立採掘任務，等待可用工蟻。':result.error||`已派遣 ${result.count} 隻工蟻前往採掘。`);if(!result.waiting&&!result.error)closeContext(false);}
    else if(action==='stopGather'){const result=C.stopGather(s,k);tell(`已停止採集，${result.count} 隻空手工蟻返回待命。`);}
    else if(action==='guardPlus'||action==='guardMinus'){const result=C.guard(s,k,action==='guardPlus'?1:-1);tell(result.error||(action==='guardPlus'?'工蟻正前往守住這裡。':'守衛已回到待命。'));}
    else if(action==='defendAll'){let n=0;for(let i=0;i<3;i++){const result=C.guard(s,k);if(!result.error)n+=result.count;}tell(`已增派 ${n} 隻工蟻守住巢口。`);}
    else if(action==='recall'){const result=C.recall(s,k);tell(`已召回附近 ${result.count} 隻工蟻。`);}
    else if(action==='dig'){const result=selection.length?C.assignSelected(s,selection,'dig',k):C.dig(s,k);tell(result.error||`${result.count} 隻工蟻開始挖掘。`);}
    else if(action==='extend'){openContext({kind:'project',k});}
    else if(action==='roomCreate'){openContext({kind:'roomCreate',k});}
    else if(action==='royalDirection'){openContext({kind:'royalDirection',k:s.queenK??E.HOME});}
    else if(action==='beginRoyalPlacement'){royalPlacement=true;closeContext(false);clearSelected();renderSelection();tell('請在地下點選新王室位置；Esc 可取消。');}
    else if(action==='placeRoyal'){const room=E.requestRoom(s,'royal',b.dataset.value,s.queenK??E.HOME);if(room.error)tell(room.error);else{s.royalTarget=room.id;tell('工蟻開始整理新王室；完成後蟻后會緩慢遷入。');focus(room.k);closeContext();}}
    else if(action==='createExit'){const result=E.createExit(s,k,b.dataset.value);tell(result.error||'地表通道已整理。');if(!result.error)closeContext();}
    else if(action==='chooseRoomType'){openContext({kind:'roomDirection',k,type:b.dataset.value});}
    else if(action==='placeRoom'){const result=E.requestRoom(s,context.type,b.dataset.value,k);tell(result.error||`${E.ROOM_TYPES[context.type].name}已列入建設；蟻群會自行找位置、開路與塑形。`);if(!result.error){focus(result.k);closeContext();}}
    else if(action==='roomPolicy'){const room=s.rooms.find(r=>r.id===context.id)||E.roomAt(s,k);if(room){room.policy=b.dataset.value;tell(`${E.ROOM_TYPES[room.type].name}會優先採用${{balanced:'均衡運作',capacity:'容量擴張',quality:'品質穩定'}[room.policy]}。`);}}
    else if(action==='militaryFocus'){const room=s.rooms.find(r=>r.id===context.id)||E.roomAt(s,k);if(room?.type==='military'){room.militaryFocus=b.dataset.value;tell(`軍事育成巢改為優先培育${{soldier:'普通兵蟻',armor:'重甲兵蟻',jaw:'巨顎兵蟻',acid:'吐酸兵蟻'}[room.militaryFocus]}。`);}}
    else if(action==='buildRoom'){const result=E.buildRoom(s,k,b.dataset.value);tell(result.error||`${E.ROOM_TYPES[b.dataset.value].name}開始塑形。`);if(!result.error)closeContext();}
    else if(action==='expandRoom'){const room=s.rooms.find(r=>r.id===context.id)||E.roomAt(s,k),result=room?E.expandRoom(s,room.id):{error:'找不到巢室。'};tell(result.error||(result.alternative?'原地不適合，蟻群已規劃另一座同類巢室。':'蟻群開始自動開挖並提升功能能力。'));if(!result.error){focus(result.k);closeContext();}}
    else if(action==='recycleRoom'){const room=s.rooms.find(r=>r.id===context.id)||E.roomAt(s,k),result=room?E.recycleRoom(s,room.id):{error:'找不到巢室。'};tell(result.error||'巢室已回收，內容已搬離。');if(!result.error)closeContext();}
    else if(action==='cancelRoom'){const room=s.rooms.find(r=>r.id===context.id)||E.roomAt(s,k),result=room?E.cancelRoom(s,room.id):{error:'找不到施工項目。'};tell(result.error||`施工已取消，返還 ${result.refund} 食物。`);if(!result.error)closeContext();}
    else if(action==='seal'){const error=E.seal(s,k);tell(error||(E.cell(s,k).sealed?'通道已封閉。':'通道已重新開啟。'));}
    else if(action==='scout'){const result=C.scout(s,k);tell(result.error||'一隻工蟻出發探索。');}
    else if(action==='openBrood')openContext({kind:'brood',k:E.key(9,10)});
    else if(action==='nearby'){const ant=E.workers(s).sort((a,b)=>E.distance(a,E.xy(k))-E.distance(b,E.xy(k)))[0];if(ant)chooseAnts(ant.id);}
    else if(action==='broodSetting'){const brood=s.broods.find(x=>x.id===broodId),field=b.dataset.field,v=b.dataset.value;if(brood){brood[field]=v;tell(`${{feed:'餵養',add:'添加物',wet:'環境',breed:'培育方向'}[field]}已立即套用。`);}}
    else if(action==='care'){const result=C.care(s,broodId,delta);if(result.error)tell(result.error);}
    else if(action==='editJob'){const job=b.dataset.id;jobDraft={job,value:jobCount(job),max:jobCount(job)+E.workers(s,'idle').length};infoMode='jobEdit';}
    else if(action==='jobDraftValue')jobDraft.value=Math.max(0,Math.min(jobDraft.max,jobDraft.value+delta));
    else if(action==='cancelJob'){jobDraft=null;$('info').close();}
    else if(action==='confirmJob'){const job=jobDraft.job,diff=jobDraft.value-jobCount(job);if(job==='defense'){for(let i=0;i<Math.abs(diff);i++){const ant=diff>0?E.workers(s,'idle')[0]:E.workers(s).find(a=>['guard','combat'].includes(a.job));if(ant){C.release(ant,diff>0?'guard':'idle');if(diff>0)ant.guardTarget=s.mainExit;}}}else for(let i=0;i<Math.abs(diff);i++)E.assign(s,job,Math.sign(diff));jobDraft=null;$('info').close();}
    else if(action==='job'){
      const job=b.dataset.id;
      if(job==='defense'){if(delta>0){const ant=E.workers(s,'idle')[0];if(ant){C.release(ant,'guard');ant.guardTarget=s.mainExit;}}else{const ant=E.workers(s).find(a=>a.job==='guard'||a.job==='combat');if(ant)C.release(ant);}}
      else E.assign(s,job,delta);
    }
    else if(action==='individual'){const ant=E.workers(s).find(a=>a.id===id);if(ant){$('info').close();focus(ant.k);chooseAnts(ant.id,false);}}
    else if(action==='locateRoom'){const room=s.rooms.find(r=>r.id===id);if(room){$('info').close();focus(room.k,true);openContext({kind:'room',k:room.k,id:room.id});}}
    else if(action==='locatePlace'){const raw=b.dataset.k,k=/^-?\d+$/.test(raw)?Number(raw):raw;$('info').close();focus(k);tell('鏡頭已移到'+b.textContent+'。');}
    else if(action==='growthDirection'){s.growthDirection=b.dataset.value;tell(`王巢將優先向${{left:'左側',deep:'深層',right:'右側'}[s.growthDirection]}自然發展。`);}
    else if(action==='journalFilter'){journalFilter=b.dataset.value;renderInfo();}
    else if(action==='save'){save(true);}
    else if(action==='audioToggle'){audio.toggle();audioLabel();renderInfo();}
    else if(action==='help')infoMode='help';
    else if(action==='settings')infoMode='settings';
    else if(action==='reset')infoMode='reset';
    else if(action==='confirmReset'){$('info').close();dialogSpeed=0;resetGame();tell('新巢建立完成 · 蟻后 ×1 · 工蟻 ×9。按 1× 開始時間流動。');}
    if(['gather','stopGather','guardPlus','guardMinus','defendAll','recall','dig','seal','scout','narrow','stopProject','enterEnemy'].includes(action))closeContext();renderContext();renderInfo();renderStatus();
  });
  document.addEventListener('change',e=>{if(e.target.id==='broodSelect'){broodId=Number(e.target.value);const b=s.broods.find(b=>b.id===broodId);broodDraft=b?{feed:b.feed,add:b.add,wet:b.wet,breed:b.breed||'worker'}:null;e.target.blur();renderContext();}else if(e.target.matches('[data-edit-input]')&&edit){edit.value=Math.max(edit.min??0,Math.min(edit.max??E.workers(s).length,Math.round(Number(e.target.value)||1)));renderContext();}});
  for(const el of document.querySelectorAll('.statusbar,.world-nav,.context,.map-controls,.selection-bar')){el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('pointerup',e=>e.stopPropagation());}
  $('closeContext').onclick=()=>closeContext();$('colonyButton').onclick=()=>showInfo('colony');$('journalButton').onclick=()=>showInfo('journal');$('settingsButton').onclick=()=>showInfo('settings');$('closeInfo').onclick=()=>$('info').close();$('reviewBattlefield').onclick=()=>{postGameReview=true;$('result').classList.add('hidden');$('hint').textContent='戰後查看模式 · 地圖與王國狀態可自由查看';$('hint').classList.remove('hidden');};$('restart').onclick=()=>resetGame();
  $('eventToast').onclick=()=>{if(toast){focus(toast.k);eventFocusUntil=performance.now()+1800;$('eventToast').classList.add('hidden');}};$('eventToast').tabIndex=0;$('eventToast').setAttribute('role','button');$('eventToast').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&toast)$('eventToast').click();});
  $('info').addEventListener('close',()=>{infoMode='';if(!s.ended)s.speed=dialogSpeed;renderStatus();});
  $('zoomIn').onclick=()=>world.zoom(1.25);$('zoomOut').onclick=()=>world.zoom(.8);$('recenter').onclick=()=>world.home(view);
  const pointers=new Map(),keys=new Set();let gesture=null,longPressTimer=null;
  function drawSelectionRect(){if(!gesture?.box)return;const r=$('map').getBoundingClientRect(),ready=gesture.longPress&&!gesture.moved,pad=ready?9:0,x=Math.min(gesture.startX,gesture.lastX)-r.left-pad,y=Math.min(gesture.startY,gesture.lastY)-r.top-pad,w=Math.max(Math.abs(gesture.lastX-gesture.startX),pad*2),h=Math.max(Math.abs(gesture.lastY-gesture.startY),pad*2),el=$('selectionRect');el.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;el.classList.toggle('ready',ready);el.classList.remove('hidden');}
  $('map').addEventListener('pointerdown',e=>{
    $('map').setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const r=$('map').getBoundingClientRect(),startHit=C.pick(world.targets,e.clientX-r.left,e.clientY-r.top);gesture={startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,box:false,startOnAnt:startHit?.kind==='ants',pointerType:e.pointerType,button:e.button,shift:e.shiftKey};
    if(e.pointerType==='touch')longPressTimer=setTimeout(()=>{if(gesture&&!gesture.moved&&pointers.size===1){gesture.box=true;gesture.longPress=true;navigator.vibrate?.(20);drawSelectionRect();}},430);
    if(pointers.size===2){clearTimeout(longPressTimer);$('selectionRect').classList.add('hidden');gesture.box=false;gesture.multitouch=true;const p=[...pointers.values()];gesture.distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);gesture.moved=true;}
  });
  $('map').addEventListener('pointermove',e=>{
    if(!gesture||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(gesture.distance>0)world.zoom(d/gesture.distance);gesture.distance=d;gesture.moved=true;return;}
    if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8){gesture.moved=true;if(gesture.pointerType==='mouse'&&gesture.button===0)gesture.box=true;}
    if(gesture.moved&&!gesture.box&&(gesture.pointerType!=='mouse'||gesture.button===1||gesture.button===2))world.pan(e.clientX-gesture.lastX,e.clientY-gesture.lastY);gesture.lastX=e.clientX;gesture.lastY=e.clientY;drawSelectionRect();
  });
  $('map').addEventListener('pointerup',e=>{
    clearTimeout(longPressTimer);$('selectionRect').classList.add('hidden');
    if(gesture?.box&&gesture.moved&&!gesture.multitouch){const r=$('map').getBoundingClientRect(),x1=Math.min(gesture.startX,e.clientX)-r.left,x2=Math.max(gesture.startX,e.clientX)-r.left,y1=Math.min(gesture.startY,e.clientY)-r.top,y2=Math.max(gesture.startY,e.clientY)-r.top,ids=world.targets.filter(t=>t.kind==='ants'&&t.x>=x1&&t.x<=x2&&t.y>=y1&&t.y<=y2).map(t=>t.id);selectMany(ids,gesture.shift);if(gesture.pointerType==='touch'&&ids.length){s.mobileBoxHintDone=true;renderTouchHint();save();}}
    else if(gesture&&!gesture.moved&&pointers.size===1&&gesture.button===0){const r=$('map').getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hit=C.pick(world.targets,x,y,{moving:!!selection.length,digging}),k=hit?.k??world.position(x,y);const overlaps=C.overlaps(world.targets,x,y);if(!selection.length&&overlaps.length>1)openContext({kind:'overlap',k,choices:overlaps});else interact(hit,k,gesture.shift);}
    pointers.delete(e.pointerId);if(!pointers.size)gesture=null;else if(gesture){const p=[...pointers.values()][0];gesture.moved=true;gesture.lastX=p.x;gesture.lastY=p.y;}
  });
  $('map').addEventListener('pointercancel',e=>{clearTimeout(longPressTimer);$('selectionRect').classList.add('hidden');pointers.delete(e.pointerId);gesture=null;});
  $('map').addEventListener('contextmenu',e=>e.preventDefault());
  $('map').addEventListener('wheel',e=>{e.preventDefault();world.zoom(e.deltaY>0?.9:1.1);},{passive:false});
  document.addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key==='Escape'&&!$('info').open){royalPlacement=false;clearSelected();closeContext(false);}if((e.key==='b'||e.key==='B')&&selection.length&&!$('info').open){openContext({kind:'roomCreate',k:selectedAnts()[0]?.k??E.HOME});}});document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  function notices(now){
    if(s.uiNotice?.id!==seenUiNotice){seenUiNotice=s.uiNotice.id;const event=s.uiNotice;if(event.text&&(now-lastNotice>12000||/蟻后.*威脅|蟻后死亡/.test(event.text))){toast=event;toastUntil=now+3500;lastNotice=now;$('eventText').textContent=event.text;$('eventToast').classList.remove('hidden');audio.event(event.text);}}
    if(s.events[0]!==seenEvent&&s.uiNotice?.time===s.events[0]?.time)seenEvent=s.events[0];
    if(s.events[0]!==seenEvent){
      const fresh=[];for(const event of s.events){if(event===seenEvent)break;fresh.push(event);}seenEvent=s.events[0];
      const event=fresh.find(e=>e.urgent)||fresh[0];
      if(event&&(now-lastNotice>12000||/蟻后.*威脅|蟻后死亡/.test(event.text))){
        const title=/蟻后死亡/.test(event.text)?'蟻后死亡':/蟻后.*威脅/.test(event.text)?'蟻后受到威脅':/接近巢口/.test(event.text)?'敵蟻接近巢口':/採集隊/.test(event.text)?'採集隊遭攻擊':/羽化/.test(event.text)?'新工蟻羽化':/幼蟲.*差異/.test(event.text)?'幼蟲出現異常':/黑色/.test(event.text)?'發現未知黑色物質':/碎屑/.test(event.text)?'發現異常碎屑':/退路/.test(event.text)?'工蟻退路受到威脅':event.urgent?'附近發生衝突':'新的觀察';
        toast=event;toastUntil=now+3500;lastNotice=now;$('eventText').textContent=event.text;$('eventToast').classList.remove('hidden');audio.event(event.text);
      }
    }
    $('eventToast').style.opacity=String(Math.min(1,Math.max(0,(toastUntil-now)/1500)));if(now>toastUntil){$('eventToast').classList.add('hidden');$('eventText').textContent='';toast=null;}if(now>feedbackUntil){$('feedback').classList.add('hidden');$('feedback').textContent='';}
  }
  function frame(now){
    const dt=Math.min(.3,(now-last)/1000);last=now;
    const cameraSpeed=520*dt;if(keys.has('a')||keys.has('arrowleft'))world.pan(cameraSpeed,0);if(keys.has('d')||keys.has('arrowright'))world.pan(-cameraSpeed,0);if(keys.has('w')||keys.has('arrowup'))world.pan(0,cameraSpeed);if(keys.has('s')||keys.has('arrowdown'))world.pan(0,-cameraSpeed);
    if(!document.hidden){acc+=dt*s.speed;while(acc>=.25){E.tick(s,.25);acc-=.25;}}
    uiTime+=dt;contextTime+=dt;saveTime+=dt;notices(now);
    if(uiTime>.5){selection=selection.filter(id=>E.workers(s).some(a=>a.id===id));renderSelection();renderStatus();if(infoMode)renderInfo();uiTime=0;}
    if(context&&contextTime>1.5){renderContext();contextTime=0;}
    if(saveTime>15){save();saveTime=0;}
    if(commandMarker&&now>commandMarker.until)commandMarker=null;audio.setScene(s.ants.some(a=>a.action==='戰鬥')?'combat':view==='surface'?'surface':'nest');world.draw(s,{selected:selection,target:eventFocusUntil>now?toast?.k??E.HOME:context?.k??null,digging,commandMarker},dt);requestAnimationFrame(frame);
  }
  $('menuAudio').onclick=()=>{audio.toggle();audioLabel();};
  $('continueGame').onclick=()=>{audio.unlock();if(hasSave){$('mainMenu').classList.add('hidden');s.speed=menuResumeSpeed;last=performance.now();renderStatus();}else{resetGame();showIntro();}};
  $('newGame').onclick=()=>{audio.unlock();resetGame();showIntro();};
  $('skipIntro').onclick=closeIntro;
  $('nextIntro').onclick=()=>{audio.command('move');if(introStep<introSlides.length-1){introStep++;renderIntro();}else closeIntro();};
  window.addEventListener('pagehide',()=>save());document.addEventListener('visibilitychange',()=>{if(document.hidden)save();last=performance.now();acc=0;});
  renderStatus();requestAnimationFrame(frame);
})();
