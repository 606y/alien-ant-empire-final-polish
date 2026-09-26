/* The world owns the screen. Painted objects also publish generous touch regions. */
(function(root){
  'use strict';
  const E=root.AntEngine;
  const V8_UNITS=['units/player/worker','units/player/soldier_normal','units/player/soldier_armor','units/player/soldier_jaw','units/player/soldier_acid','units/player/queen',
    'units/enemies/near','units/enemies/near_queen','units/enemies/hunter','units/enemies/hunter_queen','units/enemies/armored','units/enemies/armored_queen','units/enemies/deep_forest','units/enemies/deep_forest_queen'];
  const V8_ROOMS=['nursery','store','prey','rest','military','mutation','royal'];
  const V8_PROPS=['seeds','insect_carcass','fungi','resin','ore','log','plant','rock','root','water'];
  const V8_ART=[...V8_UNITS.map(key=>[key,'assets/v8/'+key+'_v8.png']),
    ...V8_ROOMS.flatMap(type=>[1,2,3].map(level=>['rooms/'+type+'/'+level,'assets/v8/rooms/'+type+'_lv'+level+'_v8.png'])),
    ...V8_PROPS.map(name=>['props/'+name,'assets/v8/world/props/'+name+'_v8.png']),
    ['nest/matte','assets/v8/world/nest/nest_world_v8.png'],['surface/matte','assets/v8/world/surface/surface_battle_world_v8.png'],
    ...['nest','surface'].flatMap(view=>['ground','unexplored'].map(kind=>[view+'/'+kind,'assets/v8/world/tiles/'+view+'_'+kind+'_v8.jpg']))];
  const V8_RESOURCE_PROPS={seed:'seeds',fruit:'seeds',insect:'insect_carcass',prey:'insect_carcass',fungi:'fungi',sap:'resin',resin:'resin',mineral:'ore'};
  // Content rectangles exclude transparent padding and the detached baked shadow.
  // Plant and rock sources contain only a shadow; preserve them pending supplied replacements.
  const V8_PROP_CONTENT={seeds:[165,167,53,50],insect_carcass:[163,170,57,45],fungi:[160,155,64,72],resin:[168,154,49,75],ore:[168,160,48,63],log:[153,157,76,69],root:[155,152,74,79],water:[156,158,71,68]};
  class World {
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera={x:8,y:8.7,zoom:1};this.view='nest';this.targets=[];this.time=0;this.metrics={scale:50,x:0,y:0,w:0,h:0};this.fx=[];this.lastHitSeen=new Map();this.v7Images=Object.create(null);this.v8ImageCache=Object.create(null);this.v8Patterns=Object.create(null);this.v8RoomCache=new WeakMap();this.v8Started=false;this.labels=[];this.selectionPaint=[];this.propPaint=[];this.v8Failures=[];root.addEventListener?.('ant:app-ready',()=>this.loadV8(),{once:true});}
    loadV8(){
      if(this.v8Started)return this.v8Ready;this.v8Started=true;
      const jobs=V8_ART.map(([key,path])=>new Promise(resolve=>{const image=new Image();image.decoding='async';image.onload=()=>{this.v8ImageCache[key]=image;if(/ground|unexplored|matte/.test(key))this.v8Patterns[key]=this.environmentPattern(key,image);resolve(true);};image.onerror=()=>{this.v8Failures.push(path);resolve(false);};image.src=path;}));
      for(const name of ['selection_ring','command_move','command_attack','command_gather','command_build','command_cross']){const image=new Image();image.onload=()=>{this.v7Images['world/effects/'+name]=image;};image.src='assets/v7/world/effects/'+name+'.svg';}
      this.v8Ready=Promise.all(jobs);return this.v8Ready;
    }
    environmentPattern(key,image){
      // Supplied 512px tiles include a black footer: exclude it from repeat only.
      // Original asset bytes and world coordinates stay unchanged.
      let source=image;
      if(/ground|unexplored/.test(key)){source=document.createElement('canvas');source.width=image.naturalWidth;source.height=key.startsWith('nest/')?398:458;source.getContext('2d').drawImage(image,0,0,source.width,source.height,0,0,source.width,source.height);}
      return this.ctx.createPattern(source,'repeat');
    }
    pattern(key,span,ox=0,oy=0){const pattern=this.v8Patterns[key],image=this.v8ImageCache[key];if(!pattern||!image)return null;pattern.setTransform(new DOMMatrix().translate(ox,oy).scale(span/image.naturalWidth));return pattern;}
    worldEnvironment(w,h,ox,oy,scale){
      const c=this.ctx,view=this.view==='surface'?'surface':'nest';
      c.fillStyle=this.pattern(view+'/unexplored',scale*6,ox,oy)||(view==='surface'?'#30372a':'#34271d');c.fillRect(0,0,w,h);
      const matte=this.pattern(view+'/matte',scale*32,ox,oy);if(matte){c.save();c.globalAlpha=.28;c.fillStyle=matte;c.fillRect(0,0,w,h);c.restore();}
    }
    sprite(key,x,y,width,height,angle=0){const image=this.v8ImageCache[key];if(!image?.naturalWidth)return false;const c=this.ctx,ratio=Math.min(width/image.naturalWidth,height/image.naturalHeight),dw=image.naturalWidth*ratio,dh=image.naturalHeight*ratio;c.save();c.translate(x,y);c.rotate(angle);c.drawImage(image,-dw/2,-dh/2,dw,dh);c.restore();return true;}
    prop(name,x,y,size,angle=0,opacity=1){const c=this.ctx;c.save();c.globalAlpha=opacity;this.ellipse(x,y+size*.18,size*.34,size*.12,'#130d0966');const image=this.v8ImageCache['props/'+name],box=V8_PROP_CONTENT[name];if(image?.naturalWidth&&box){const [sx,sy,sw,sh]=box,ratio=size/Math.max(sw,sh);c.translate(x,y);c.rotate(angle);c.drawImage(image,sx,sy,sw,sh,-sw*ratio/2,-sh*ratio/2,sw*ratio,sh*ratio);}else this.sprite('props/'+name,x,y,size,size,angle);c.restore();}
    roomLevel(room){return (room.maturity||0)<34?1:(room.maturity||0)<67?2:3;}
    roomScene(room,x,y,r){
      const level=this.roomLevel(room);let cached=this.v8RoomCache.get(room);
      if(!cached||cached.level!==level||cached.type!==room.type||!cached.image){cached={level,type:room.type,image:this.v8ImageCache['rooms/'+room.type+'/'+level]};this.v8RoomCache.set(room,cached);}
      const image=cached.image;if(!image?.naturalWidth)return;const c=this.ctx;c.save();c.globalAlpha=room.status==='active'?1:.65;
      c.beginPath();c.ellipse(x,y,r,r*.72,0,0,Math.PI*2);c.clip();const ratio=Math.max(r*2/image.naturalWidth,r*1.44/image.naturalHeight),dw=image.naturalWidth*ratio,dh=image.naturalHeight*ratio;c.drawImage(image,x-dw/2,y-dh/2,dw,dh);c.restore();
    }
    paintLabels(){const c=this.ctx;for(const {x,y,text,kind,width,height} of this.labels){c.save();c.font='13px system-ui';c.fillStyle='#17120ee8';c.strokeStyle='#a0825155';c.lineWidth=1;c.beginPath();c.roundRect(x-width/2,y-height/2,width,height,10);c.fill();c.stroke();c.textAlign='center';c.textBaseline='middle';c.fillStyle=kind==='enemy'?'#ecad8a':'#e4d7b6';c.fillText(text,x,y);c.restore();}}
    home(view){this.view=view;this.camera={x:view==='nest'?8:10,y:view==='nest'?8.7:2,zoom:view==='surface'?1.25:1};}
    focus(k,view=this.view,withPanel=false){this.view=view;const p=E.xy(k);this.camera.x=p.x;this.camera.y=p.y+(withPanel?2:0);}
    zoom(factor){this.camera.zoom=Math.max(.35,Math.min(2.6,this.camera.zoom*factor));}
    pan(dx,dy){this.camera.x-=dx/this.metrics.scale;this.camera.y-=dy/this.metrics.scale;const b=this.bounds||{minX:0,maxX:31,maxY:22};this.camera.x=Math.max(b.minX-8,Math.min(b.maxX+8,this.camera.x));this.camera.y=Math.max(-3,Math.min(b.maxY+8,this.camera.y));}
    screen(x,y,z=0){const m=this.metrics;if(this.view==='surface')return {x:m.x+x*m.scale,y:m.y+(y-z*.08)*m.scale};return {x:m.x+x*m.scale,y:m.y+y*m.scale};}
    position(x,y){const m=this.metrics,u=(x-m.x)/m.scale,v=(y-m.y)/m.scale;if(this.view==='surface')return E.surfaceKey(Math.round(u),Math.round(v));const px=Math.round(u),py=Math.round(v);return py>=0?E.key(px,py):null;}
    line(x,y,x2,y2,color,width){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
    ellipse(x,y,rx,ry,color,rotation=0){const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fill();}
    ant(x,y,size,color,angle,a,queen=false,visualKey=null){
      this.ellipse(x,y+size*.23,size*.64,size*.23,'#130d0970');
      if(visualKey)this.sprite(visualKey,x,y,size*2.5,size*2.5,angle);
    }
    label(x,y,text,kind,k,extra={}){
      const c=this.ctx;c.font='13px system-ui';const width=c.measureText(text).width+20,height=30;
      this.labels.push({x,y,text,kind,width,height});
      this.targets.push({kind,k,x,y,radius:24,box:{x:x-width/2-4,y:y-22,w:width+8,h:44},...extra});
    }
    draw(s,{selected=[],target=null,digging=false,commandMarker=null}={},elapsed=.016){
      this.bounds=E.bounds(s,this.view==='surface');this.time+=elapsed;this.targets=[];this.labels=[];this.selectionPaint=[];this.propPaint=[];const c=this.ctx,canvas=this.canvas,r=canvas.getBoundingClientRect(),w=r.width,h=r.height,dpr=Math.min(2,devicePixelRatio||1);
      if(!w||!h)return;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      c.setTransform(dpr,0,0,dpr,0,0);
      const scale=Math.min(this.view==='nest'?70:66,w/(this.view==='nest'?9:10),h/9.5)*this.camera.zoom;
      const ox=w/2-this.camera.x*scale,oy=h*.48-this.camera.y*scale;this.metrics={scale,x:ox,y:oy,w,h};
      this.worldEnvironment(w,h,ox,oy,scale);
      const groundPattern=this.pattern((this.view==='surface'?'surface':'nest')+'/ground',6);
      const noise=(x,y)=>((Math.imul(x+17,374761393)^Math.imul(y+23,668265263))>>>0)%1000/1000;
      const visibleCell=k=>this.view==='surface'?E.isSurface(s,k):!E.isSurface(s,k)||k===s.mainExit;
      c.save();c.translate(ox,oy);c.scale(scale,scale);
      for(const tile of s.cells){
        if(this.view==='surface'&&!E.isSurface(s,tile)||this.view==='nest'&&E.isSurface(s,tile))continue;
        const x=tile.x,y=tile.y,k=tile.k??E.key(x,y),sp=this.screen(x,y),onScreen=sp.x>-scale&&sp.x<w+scale&&sp.y>-scale&&sp.y<h+scale;if(!onScreen)continue;
        if(tile.seen){c.save();c.globalAlpha=.86;c.fillStyle=groundPattern||(this.view==='surface'?'#545740':'#66503b');c.beginPath();c.roundRect(x-.53,y-.53,1.06,1.06,.13);c.fill();c.restore();}
        if(tile.seen&&E.isSurface(s,tile)){
          const n=noise(x,y),name=!tile.open?'rock':({rock:'rock',log:'log',root:'root',plant:'plant',water:'water'}[tile.terrain]);
          if(name)this.propPaint.push({name,x,y,size:1.18,angle:(n-.5)*.3});
          else if(n>.91)this.propPaint.push({name:n>.975?'water':n>.95?'fungi':'plant',x,y,size:.58,angle:0});
        }
        if(tile.seen&&(tile.deposit>0||tile.depositPending))this.propPaint.push({name:'ore',x,y,size:.75,angle:0});
        if(tile.seen&&tile.strategicClue){c.strokeStyle='#c99d7566';c.lineWidth=.035;c.setLineDash([.08,.09]);c.beginPath();c.arc(x,y,.3,0,Math.PI*2);c.stroke();c.setLineDash([]);}
        if(tile.seen&&tile.hard){c.fillStyle='#0a1012';c.fillRect(x-.5,y-.26,1,.6);this.line(x-.5,y-.26,x+.5,y-.26,'#88928b',.03);}
      }
      if(this.view==='nest'){
        c.lineCap='round';
        for(const [color,width]of [['#9a7958',.87],[groundPattern||'#39291f',.69]])for(const tile of s.cells){
          if(!tile.open||!tile.seen||E.isSurface(s,tile)||tile.sealed)continue;
          const k=tile.k??E.key(tile.x,tile.y);for(const n of E.neighbors(s,k)){const b=E.cell(s,n);if(b.seen&&!E.isSurface(s,b))this.line(tile.x,tile.y,b.x,b.y,color,tile.narrow||b.narrow?width*.55:width);}
          this.ellipse(tile.x,tile.y,width/2,width/2,color);if(width>.7){c.strokeStyle='#92855b20';c.lineWidth=.035;c.beginPath();c.arc(tile.x,tile.y,width*.34,-2.6,-.45);c.stroke();}
        }
      }
      if(this.view==='nest')for(const tile of s.cells){
        if(!tile.seen||E.isSurface(s,tile))continue;const n=noise(tile.x,tile.y);
        if(n>.87)this.propPaint.push({name:tile.open?'fungi':'root',x:tile.x,y:tile.y,size:tile.open?.6:1.2,angle:(n-.5)*.3});
      }
      if(this.view==='nest')for(const tile of s.cells){if(!tile.seen||!tile.strategicClue||E.isSurface(s,tile))continue;const p=this.screen(tile.x,tile.y);this.label(p.x,p.y-scale*.48,tile.strategicClue,'clue',tile.k??E.key(tile.x,tile.y),{source:0});this.targets.push({kind:'clue',k:tile.k??E.key(tile.x,tile.y),source:0,x:p.x,y:p.y,radius:38});}
      // Territory is a tint on the actual ground, not a separate management view.
      for(const tile of s.cells){const k=tile.k??E.key(tile.x,tile.y);if(!tile.seen||!visibleCell(k))continue;
        if(tile.open){const contested=tile.ours>5&&tile.theirs>5;colorTint: {const n=Math.max(tile.ours,tile.theirs);if(n<1)break colorTint;this.ellipse(tile.x,tile.y,.38,.38,contested?'#dbb17730':tile.ours>tile.theirs?'#b7d17b18':'#d27a5830');}}
        if(tile.sealed){this.line(tile.x-.23,tile.y-.26,tile.x+.24,tile.y+.27,'#c3a77d',.14);this.line(tile.x+.23,tile.y-.26,tile.x-.24,tile.y+.27,'#c3a77d',.14);}
        if(s.digQueue.includes(k)){c.setLineDash([.13,.13]);c.lineWidth=.035;c.strokeStyle='#d3e698';c.strokeRect(tile.x-.33,tile.y-.33,.66,.66);c.setLineDash([]);}
        if(digging&&!tile.open&&!tile.hard&&E.adjacent(k).some(n=>E.passable(s,n)&&E.cell(s,n).seen)){c.fillStyle='#d2e48922';c.fillRect(tile.x-.48,tile.y-.48,.96,.96);}
        const p=this.screen(tile.x,tile.y,tile.elevation||0),diggable=!tile.open&&!tile.hard&&E.adjacent(k).some(n=>E.passable(s,n)&&E.cell(s,n).seen||s.digQueue.includes(n));this.targets.push({kind:E.isSurface(s,tile)?'ground':tile.open?'ground':'soil',k,x:p.x,y:p.y,radius:Math.max(diggable?30:24,scale*.52),diggable});
      }
      // Unit paths are cached by the simulation; ordinary supply routes need no per-frame BFS.
      for(const a of E.workers(s)){if(!selected.includes(a.id)||!a.path.length)continue;c.strokeStyle='#ecf5b56b';c.lineWidth=.04;c.beginPath();c.moveTo(a.x,a.y);for(const k of a.path){const p=E.xy(k);c.lineTo(p.x,p.y);}c.stroke();}
      if(target!==null&&E.cell(s,target)?.seen){const p=E.xy(target);c.strokeStyle='#e2edb0';c.lineWidth=.04;c.setLineDash([.1,.12]);c.beginPath();c.arc(p.x,p.y,.5,0,7);c.stroke();c.setLineDash([]);}
      c.restore();
      if(this.view==='nest')for(const room of s.rooms){const p=E.xy(room.k),v=this.screen(p.x,p.y),color=E.ROOM_TYPES[room.type].color,stage=room.size===1?(room.maturity>=50?2:1):room.size===2?3:4,r=scale*(.38+stage*.13);this.roomScene(room,v.x,v.y,r);const progress=room.status==='active'?'':room.status==='excavating'?`開挖中 ${Math.floor((room.planCells?.filter(k=>E.cell(s,k)?.open).length||0)/Math.max(1,room.planCells?.length||1)*100)}% · `:`施工 ${Math.min(99,Math.floor((room.progress||0)/14/(room.targetSize||room.size||1)*100))}% · `;this.label(v.x,v.y-r*.92,`${progress}${E.ROOM_TYPES[room.type].name}`,'room',room.k,{id:room.id});this.targets.push({kind:'room',k:room.k,id:room.id,x:v.x,y:v.y,radius:Math.max(30,r)});}
      for(const prop of this.propPaint){const p=this.screen(prop.x,prop.y);if(p.x>-scale&&p.x<w+scale&&p.y>-scale&&p.y<h+scale)this.prop(prop.name,p.x,p.y,prop.size*scale,prop.angle);}
      if(this.view==='surface'){
        for(const reg of s.regions){const p=this.screen(reg.x,reg.y??2);c.textAlign='center';c.font='12px system-ui';c.fillStyle=reg.seen?'#c8d1a9':'#839575';c.fillText(reg.seen?reg.name:'未知森林',p.x,p.y-scale*.7);if(reg.seen){c.font='11px system-ui';c.fillStyle=E.territory(reg)==='爭奪中'?'#ddb184':'#8ba27c';c.fillText(E.territory(reg),p.x,p.y-scale*.7+20);}}
        for(const clue of s.world?.clues||[]){const tile=E.cell(s,clue.k);if(!tile?.seen||!E.isSurface(s,tile))continue;const p=this.screen(tile.x,tile.y,tile.elevation||0),pulse=4+Math.sin(this.time*5)*2;this.ellipse(p.x-pulse,p.y+5,4,2,'#ddaa7866',-.35);this.ellipse(p.x+pulse,p.y-3,4,2,'#ddaa7866',-.35);this.label(p.x,p.y-scale*.48,clue.kind==='retreat'?'撤退足跡':'陌生蟻群痕跡','clue',clue.k,{source:clue.source});this.targets.push({kind:'clue',k:clue.k,source:clue.source,x:p.x,y:p.y,radius:38});}
      }
      for(const food of s.resources){if(food.amount<=0||!E.cell(s,food.k)?.seen||!visibleCell(food.k))continue;
        const p=E.xy(food.k),v=this.screen(p.x,p.y,food.height??E.cell(s,food.k)?.elevation??0),gone=false,size=scale*.28;
        this.prop(food.queenCorpse?'insect_carcass':V8_RESOURCE_PROPS[food.type]||'seeds',v.x,v.y,size*(food.queenCorpse?3.1:2.6),.12);
        const kind=food.queenCorpse?'deadQueen':'food',radius=food.queenCorpse?38:27,label=food.queenCorpse?'蟻后遺骸':({insect:'昆蟲',fruit:'果實',sap:'植物汁液',seed:'種子'}[food.type]||'食物');this.targets.push({kind,k:food.k,x:v.x,y:v.y,radius});if(food.large||food.queenCorpse||s.routes.some(r=>r.k===food.k&&r.active!==false)||this.camera.zoom<.72)this.label(v.x,v.y-scale*.65,label+' · '+Math.ceil(food.amount),kind,food.k);
      }
      // Queen and nursery are spatially distinct from the nearby workers.
      if(this.view==='nest'){
        const queenK=s.queenK??E.HOME,qp=E.xy(queenK),q=this.screen(qp.x-.8,qp.y-.5);this.ant(q.x,q.y,scale*.47,'#d9cba0',-.5,null,true,'units/player/queen');this.targets.push({kind:'queen',k:queenK,x:q.x,y:q.y,radius:25});this.label(q.x-scale*.12,q.y-scale*.58,'蟻后','queen',queenK);
        for(const k of [...new Set(s.broods.map(b=>b.k??E.HOME))]){const bp=E.xy(k),formal=E.roomAt(s,k)?.type==='nursery',brood=this.screen(k===E.HOME?9.35:bp.x,k===E.HOME?10.3:bp.y);s.broods.filter(b=>(b.k??E.HOME)===k).slice(0,3).forEach((b,i)=>{for(let n=0;n<Math.min(b.count,4);n++)this.ellipse(brood.x+(n-1.5)*scale*.15,brood.y+(i-1)*scale*.2,b.stage===1?scale*.09:scale*.05,b.stage===2?scale*.11:scale*.07,b.stage===0?'#ede7cb':b.stage===1?'#d2dfa8':'#d2bd8e',.6);});if(!formal)this.label(brood.x,brood.y+scale*.53,'臨時育幼區','brood',k);this.targets.push({kind:'brood',k,x:brood.x,y:brood.y,radius:30});}
        for(const n of s.colonies){if(n.fallen||!E.cell(s,n.queenK)?.seen)continue;const p=E.xy(n.queenK),q=this.screen(p.x,p.y);this.ant(q.x,q.y,scale*.45,n.color||'#d89170',.6,null,true,'units/enemies/'+n.role+'_queen');this.label(q.x,q.y-scale*.6,`${n.name||'敵國'}蟻后`,'enemyQueen',n.queenK,{colony:n.id});this.targets.push({kind:'enemyQueen',k:n.queenK,colony:n.id,x:q.x,y:q.y,radius:32});}

      }
      const exits=[...(s.exits??[s.mainExit]),...s.colonies.filter(n=>!n.fallen).map(n=>E.key(E.xy(n.home).x,4))];
      for(const k of exits){const e=E.cell(s,k);if(!e?.seen||e.sealed)continue;const p=this.screen(e.x,e.y),colony=s.colonies.find(n=>!n.fallen&&E.xy(n.home).x===e.x),kind=colony?'enemyNest':'exit',extra=colony?{colony:colony.id}:{};this.ellipse(p.x,p.y,scale*.28,scale*.13,'#101b15');this.label(p.x,p.y+scale*.47,colony?`${colony.name||'敵巢'} · ${colony.strategy||'活動中'}`:'巢口',kind,k,extra);this.targets.push({kind,k,x:p.x,y:p.y,radius:Math.max(30,scale*.42),box:{x:p.x-scale*.42,y:p.y-scale*.24,w:scale*.84,h:scale*.95},...extra});}
      const player=E.workers(s),enemies=s.ants.filter(a=>a.faction==='enemy'&&player.some(b=>E.isSurface(s,a.k)===E.isSurface(s,b.k)&&E.distance(a,b)<5)),ants=[...player,...enemies],clusters=new Map();
      for(const a of ants){if(!visibleCell(a.k))continue;const elevation=E.cell(s,a.k)?.elevation||0,p=this.screen(a.x+(noise(a.id,1)-.5)*.5,a.y+(noise(a.id,2)-.5)*.42,elevation);const next=a.path.length?E.xy(a.path[0]):null,angle=next?Math.atan2(next.y-a.y,next.x-a.x):noise(a.id,7)*6;
        if(selected.includes(a.id))this.selectionPaint.push({x:p.x,y:p.y});
        const enemyColony=a.faction==='enemy'?s.colonies.find(n=>n.id===a.colony):null,antColor=a.faction==='enemy'?(enemyColony?.color||'#df9674'):a.soldierType==='armor'?'#9da8a2':a.soldierType==='jaw'?'#d3a76e':a.soldierType==='acid'?'#9fc47b':a.caste==='soldier'?'#c5b57a':a.traits.min>.25?'#a8b9b2':'#c3d986';this.ant(p.x,p.y,Math.max(8,scale*.25)*(1+a.traits.pred*.08+(a.caste==='soldier'?.08:0)),antColor,angle,a,false,a.faction==='enemy'?'units/enemies/'+(enemyColony?.role||'near'):a.caste==='soldier'?'units/player/soldier_'+(a.soldierType||'normal'):'units/player/worker');
        if(a.carry)this.ellipse(p.x+Math.cos(angle)*scale*.2,p.y+Math.sin(angle)*scale*.2,3,2,'#d3b680');
        if(a.action==='戰鬥'){this.line(p.x-4,p.y-5,p.x+4,p.y+5,'#f2b981',1.5);this.line(p.x+4,p.y-5,p.x-4,p.y+5,'#f2b981',1.5);const seen=this.lastHitSeen.get(a.id)||-1;if(a.lastHit>seen){this.lastHitSeen.set(a.id,a.lastHit);for(let i=0;i<5;i++)this.fx.push({x:p.x,y:p.y,vx:(noise(a.id,i)-.5)*55,vy:(noise(i,a.id)-.65)*55,life:.32,color:a.faction==='enemy'?'#e59672':'#d7d39a'});}}
        this.targets.push({kind:a.faction==='enemy'?'enemy':'ants',k:a.k,id:a.id,x:p.x,y:p.y,radius:a.faction==='enemy'?34:28});
        if(a.faction==='player'&&a.hp<a.maxHp*.72){const ratio=Math.max(0,a.hp/a.maxHp);c.fillStyle='#241612';c.fillRect(p.x-14,p.y-17,28,4);c.fillStyle=ratio<=.3?'#dc755f':'#d7b06d';c.fillRect(p.x-14,p.y-17,28*ratio,4);}
        const clusterKey=a.faction+':'+a.k;if(!clusters.has(clusterKey))clusters.set(clusterKey,[]);clusters.get(clusterKey).push(a);
      }
      for(const list of clusters.values()){const selectedHere=list.some(a=>selected.includes(a.id)),fighting=list.some(a=>a.action==='戰鬥'),minimum=this.camera.zoom<.75?2:5;if(list.length<minimum&&!selectedHere&&!fighting)continue;const a=list[0],p=this.screen(a.x,a.y),soldiers=list.filter(x=>x.caste==='soldier').length,type=soldiers===list.length?'兵蟻':soldiers?'蟻群':'工蟻';if(a.faction==='player')this.label(p.x,p.y-scale*.48,`${selectedHere?'已選 ':''}${type} ×${list.length}`,'ants',a.k,{id:a.id});else this.label(p.x,p.y-scale*.46,`敵蟻 ×${list.length}`,'enemy',a.k,{id:a.id});}
      if(this.view==='nest')for(const wld of s.wildlife){if(wld.dead||E.isSurface(s,wld.k)||!E.cell(s,wld.k)?.seen)continue;const v=this.screen(wld.x,wld.y),pulse=Math.sin(this.time*4+wld.id)*2;this.prop('insect_carcass',v.x,v.y,scale*.85,.15);this.label(v.x,v.y-scale*.55,wld.kind+' · 活體','wildlife',wld.k,{id:wld.id});this.targets.push({kind:'wildlife',k:wld.k,id:wld.id,x:v.x,y:v.y,radius:32});}
      if(this.view==='surface'){for(const wld of s.wildlife){if(wld.dead||!E.isSurface(s,wld.k)||!E.cell(s,wld.k)?.seen)continue;const v=this.screen(wld.x,wld.y,wld.height||0),pulse=Math.sin(this.time*4+wld.id)*3;this.prop('insect_carcass',v.x,v.y,scale*.9,.15);if(wld.hp<wld.maxHp||wld.action==='防衛'){c.fillStyle='#241612';c.fillRect(v.x-20,v.y-24,40,5);c.fillStyle='#d88463';c.fillRect(v.x-20,v.y-24,40*wld.hp/wld.maxHp,5);}this.label(v.x,v.y-scale*.55,wld.kind+' · 活體','wildlife',wld.k,{id:wld.id});this.targets.push({kind:'wildlife',k:wld.k,id:wld.id,x:v.x,y:v.y,radius:30});}}
      for(const particle of this.fx){particle.life-=elapsed;particle.x+=particle.vx*elapsed;particle.y+=particle.vy*elapsed;particle.vy+=70*elapsed;if(particle.life<=0)continue;c.globalAlpha=Math.min(1,particle.life*4);c.fillStyle=particle.color;c.beginPath();c.arc(particle.x,particle.y,1.5+particle.life*3,0,Math.PI*2);c.fill();}c.globalAlpha=1;this.fx=this.fx.filter(p=>p.life>0).slice(-180);
      // Soft edge shading, not a second interface around the world.
      const shade=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.7);shade.addColorStop(0,'#07150b00');shade.addColorStop(1,'#07110b66');c.fillStyle=shade;c.fillRect(0,0,w,h);c.textBaseline='alphabetic';
      this.paintLabels();
      for(const p of this.selectionPaint){const ring=this.v7Images['world/effects/selection_ring'],radius=Math.max(12,scale*.3);if(ring?.naturalWidth)c.drawImage(ring,p.x-radius*1.25,p.y-radius*1.25,radius*2.5,radius*2.5);else{c.strokeStyle='#ddecaa';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,radius,0,7);c.stroke();}}
      if(commandMarker&&E.cell(s,commandMarker.k)&&visibleCell(commandMarker.k)){
        const mp=E.xy(commandMarker.k),mv=this.screen(mp.x,mp.y,E.cell(s,commandMarker.k)?.elevation||0),life=Math.max(0,Math.min(1,(commandMarker.until-performance.now())/1200)),colors={attack:'#ef846c',gather:'#e4c777',build:'#b7d998',cross:'#9fc9d7',move:'#dbeaa5'};
        c.save();c.globalAlpha=.25+life*.75;const markerImage=this.v7Images['world/effects/command_'+commandMarker.type];if(markerImage?.naturalWidth){const markerSize=40+12*(1-life);c.drawImage(markerImage,mv.x-markerSize/2,mv.y-markerSize/2,markerSize,markerSize);c.restore();}else{c.strokeStyle=colors[commandMarker.type]||colors.move;c.lineWidth=2.5;c.beginPath();c.arc(mv.x,mv.y,18+12*(1-life),0,Math.PI*2);c.stroke();c.beginPath();c.arc(mv.x,mv.y,5,0,Math.PI*2);c.fillStyle=c.strokeStyle;c.fill();c.restore();}
      }
    }
  }
  root.AntWorld=World;
})(window);

