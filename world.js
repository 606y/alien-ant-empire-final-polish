/* The world owns the screen. Painted objects also publish generous touch regions. */
(function(root){
  'use strict';
  const E=root.AntEngine;
  class World {
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera={x:8,y:8.7,zoom:1};this.view='nest';this.targets=[];this.time=0;this.metrics={scale:50,x:0,y:0,w:0,h:0};this.fx=[];this.lastHitSeen=new Map();}
    home(view){this.view=view;this.camera={x:view==='nest'?8:10,y:view==='nest'?8.7:2,zoom:view==='surface'?1.25:1};}
    focus(k,view=this.view,withPanel=false){this.view=view;const p=E.xy(k);this.camera.x=p.x;this.camera.y=p.y+(withPanel?2:0);}
    zoom(factor){this.camera.zoom=Math.max(.35,Math.min(2.6,this.camera.zoom*factor));}
    pan(dx,dy){this.camera.x-=dx/this.metrics.scale;this.camera.y-=dy/this.metrics.scale;const b=this.bounds||{minX:0,maxX:31,maxY:22};this.camera.x=Math.max(b.minX-8,Math.min(b.maxX+8,this.camera.x));this.camera.y=Math.max(-3,Math.min(b.maxY+8,this.camera.y));}
    screen(x,y,z=0){const m=this.metrics;if(this.view==='surface')return {x:m.x+x*m.scale,y:m.y+(y-z*.08)*m.scale};return {x:m.x+x*m.scale,y:m.y+y*m.scale};}
    position(x,y){const m=this.metrics,u=(x-m.x)/m.scale,v=(y-m.y)/m.scale;if(this.view==='surface')return E.surfaceKey(Math.round(u),Math.round(v));const px=Math.round(u),py=Math.round(v);return py>=0?E.key(px,py):null;}
    line(x,y,x2,y2,color,width){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
    ellipse(x,y,rx,ry,color,rotation=0){const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fill();}
    ant(x,y,size,color,angle,a,queen=false){
      const c=this.ctx,t=a?.traits||{pred:0,min:0},moving=a&&['行走','搬運','追擊','戰鬥','撤退','挖掘'].includes(a.action),phase=moving?Math.sin(this.time*13+a.id)*.12:0;
      c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
      for(let i=0;i<3;i++)for(const side of [-1,1]){c.strokeStyle=color;c.lineWidth=.065;c.beginPath();c.moveTo((i-1)*.19,side*.1);c.lineTo((i-1)*.4+phase*(i%2?1:-1),side*.36);c.lineTo((i-1)*.52-.12+phase,side*.58);c.stroke();}
      this.ellipse(-.45,0,queen?.6:.36,queen?.33:.22,color);this.ellipse(0,0,.23,.15,color);this.ellipse(.36,0,.22+t.pred*.045,.2+t.pred*.035,color);
      if(a?.soldierType==='armor'||t.shell>.55){c.strokeStyle='#d7d2b055';c.lineWidth=.07;for(const px of [-.61,-.46,-.31]){c.beginPath();c.moveTo(px,-.2);c.lineTo(px,.2);c.stroke();}}
      if(a?.soldierType==='acid'||t.acid>.4){this.ellipse(-.52,0,.26,.18,'#8fb46f');this.ellipse(-.56,-.04,.09,.06,'#c1d89199');}
      for(const side of [-1,1]){this.line(.48,side*.1,.74,side*.26,color,.045);this.line(.74,side*.26,.85,side*.21,color,.045);this.line(.53,side*.07,.69,side*.045,color,.045+t.pred*.03);}
      if(a?.soldierType==='jaw'||t.jaw>.65){c.strokeStyle='#e1c087';c.lineWidth=.07;for(const side of [-1,1]){c.beginPath();c.moveTo(.52,side*.08);c.quadraticCurveTo(.86,side*.28,1.03,side*.08);c.stroke();}}
      this.line(-.53,-.17,-.53,.17,'#edf2c833',.027);this.line(-.41,-.19,-.41,.19,'#edf2c833',.027);c.restore();
    }
    label(x,y,text,kind,k,extra={}){
      const c=this.ctx;c.font='13px system-ui';const width=c.measureText(text).width+20,height=30;
      c.fillStyle='#111d17df';c.strokeStyle='#81905b55';c.lineWidth=1;c.beginPath();c.roundRect(x-width/2,y-height/2,width,height,10);c.fill();c.stroke();c.textAlign='center';c.textBaseline='middle';c.fillStyle=kind==='enemy'?'#ecad8a':'#dbe5bc';c.fillText(text,x,y);
      this.targets.push({kind,k,x,y,radius:24,box:{x:x-width/2-4,y:y-22,w:width+8,h:44},...extra});
    }
    draw(s,{selected=[],target=null,digging=false,commandMarker=null}={},elapsed=.016){
      this.bounds=E.bounds(s,this.view==='surface');this.time+=elapsed;this.targets=[];const c=this.ctx,canvas=this.canvas,r=canvas.getBoundingClientRect(),w=r.width,h=r.height,dpr=Math.min(2,devicePixelRatio||1);
      if(!w||!h)return;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      c.setTransform(dpr,0,0,dpr,0,0);const backdrop=c.createLinearGradient(0,0,0,h);if(this.view==='surface'){backdrop.addColorStop(0,'#111c17');backdrop.addColorStop(.52,'#17251a');backdrop.addColorStop(1,'#0a120e');}else{backdrop.addColorStop(0,'#171810');backdrop.addColorStop(.45,'#121b15');backdrop.addColorStop(1,'#080e0c');}c.fillStyle=backdrop;c.fillRect(0,0,w,h);
      const scale=Math.min(this.view==='nest'?70:66,w/(this.view==='nest'?9:10),h/9.5)*this.camera.zoom;
      const ox=w/2-this.camera.x*scale,oy=h*.48-this.camera.y*scale;this.metrics={scale,x:ox,y:oy,w,h};
      const noise=(x,y)=>((Math.imul(x+17,374761393)^Math.imul(y+23,668265263))>>>0)%1000/1000;
      c.save();c.globalCompositeOperation='screen';for(let i=0;i<(this.view==='surface'?34:18);i++){const px=(noise(i,7)*w+this.time*(this.view==='surface'?2.5:.7)*(i%3+1))%(w+30)-15,py=noise(i,19)*h,alpha=(.035+noise(i,33)*.08)*(this.view==='surface'?1:.55);c.fillStyle=`rgba(${this.view==='surface'?'182,199,123':'132,157,104'},${alpha})`;c.beginPath();c.arc(px,py,1+noise(i,4)*2.1,0,Math.PI*2);c.fill();}c.restore();
      const visibleCell=k=>this.view==='surface'?E.isSurface(s,k):!E.isSurface(s,k)||k===s.mainExit;
      c.save();c.translate(ox,oy);c.scale(scale,scale);
      for(const tile of s.cells){
        if(this.view==='surface'&&!E.isSurface(s,tile)||this.view==='nest'&&E.isSurface(s,tile))continue;
        const x=tile.x,y=tile.y,k=tile.k??E.key(x,y),sp=this.screen(x,y),onScreen=sp.x>-scale&&sp.x<w+scale&&sp.y>-scale&&sp.y<h+scale;if(!onScreen)continue;
        c.fillStyle=tile.seen?(E.isSurface(s,tile)?{ground:'#34452e',rock:'#535b50',log:'#594832',root:'#43492f',plant:'#2e4c34'}[tile.terrain||'ground']:{表土:'#403d29',濕土:'#2d3b2d',黏土:'#3d3427',碎石:'#30352f'}[tile.layer]):'#17231d';c.fillRect(x-.515,y-.515,1.03,1.03);if(tile.seen&&s.time-(tile.revealedAt??-99)<3){c.fillStyle='#dce9a028';c.fillRect(x-.5,y-.5,1,1);}
        for(let i=0;i<7;i++){const n=noise(x*8+i,y);this.ellipse(x-.45+n*.9,y-.45+noise(x,y*8+i)*.9,.01+n*.025,.015,tile.seen?'#a19b5f29':'#798b4220');}
        if(tile.seen&&E.isSurface(s,tile)){if(!tile.open){this.ellipse(x,y,.43,.36,'#687054',noise(x,y)*3);}else if(tile.terrain==='log'){this.line(x-.45,y,x+.45,y,'#8a704c',.25);this.line(x-.38,y-.05,x+.38,y-.05,'#b39a6a55',.025);}else if(tile.terrain==='plant'){this.line(x,y+.4,x,y-.45,'#78945e',.09);this.ellipse(x-.14,y-.18,.2,.07,'#587b4d',-.55);this.ellipse(x+.15,y-.05,.22,.075,'#688957',.5);}else if(tile.terrain==='rock'){this.ellipse(x,y+.05,.38,.27,'#6d7668');this.line(x-.22,y-.07,x+.18,y-.17,'#a5aa9255',.025);}else if(noise(x,y)>.73){c.strokeStyle='#63734a55';c.lineWidth=.025;c.beginPath();c.moveTo(x-.45,y+.35);c.quadraticCurveTo(x,y-.25,x+.45,y-.34);c.stroke();}}
        if(tile.seen&&(tile.deposit>0||tile.depositPending)){c.save();c.globalAlpha=tile.depositPending?.45:1;c.fillStyle='#9ea9c2';c.beginPath();c.moveTo(x-.1,y+.13);c.lineTo(x-.03,y-.14);c.lineTo(x+.15,y-.07);c.lineTo(x+.1,y+.12);c.fill();c.restore();}
        if(tile.seen&&tile.strategicClue){c.strokeStyle='#c99d7566';c.lineWidth=.035;c.setLineDash([.08,.09]);c.beginPath();c.arc(x,y,.3,0,Math.PI*2);c.stroke();c.setLineDash([]);}
        if(tile.seen&&tile.hard){c.fillStyle='#0a1012';c.fillRect(x-.5,y-.26,1,.6);this.line(x-.5,y-.26,x+.5,y-.26,'#88928b',.03);}
      }
      if(this.view==='nest'){
        c.lineCap='round';
        for(const [color,width]of [['#6a6848',.87],['#131f17',.69]])for(const tile of s.cells){
          if(!tile.open||!tile.seen||E.isSurface(s,tile)||tile.sealed)continue;
          const k=tile.k??E.key(tile.x,tile.y);for(const n of E.neighbors(s,k)){const b=E.cell(s,n);if(b.seen&&!E.isSurface(s,b))this.line(tile.x,tile.y,b.x,b.y,color,tile.narrow||b.narrow?width*.55:width);}
          this.ellipse(tile.x,tile.y,width/2,width/2,color);if(width>.7){c.strokeStyle='#92855b20';c.lineWidth=.035;c.beginPath();c.arc(tile.x,tile.y,width*.34,-2.6,-.45);c.stroke();}
        }
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
      if(commandMarker&&E.cell(s,commandMarker.k)&&visibleCell(commandMarker.k)){
        const mp=E.xy(commandMarker.k),mv=this.screen(mp.x,mp.y,E.cell(s,commandMarker.k)?.elevation||0),life=Math.max(0,Math.min(1,(commandMarker.until-performance.now())/1200)),colors={attack:'#ef846c',gather:'#e4c777',build:'#b7d998',cross:'#9fc9d7',move:'#dbeaa5'};
        c.save();c.globalAlpha=.25+life*.75;c.strokeStyle=colors[commandMarker.type]||colors.move;c.lineWidth=2.5;c.beginPath();c.arc(mv.x,mv.y,18+12*(1-life),0,Math.PI*2);c.stroke();c.beginPath();c.arc(mv.x,mv.y,5,0,Math.PI*2);c.fillStyle=c.strokeStyle;c.fill();c.restore();
      }
      if(this.view==='nest')for(const room of s.rooms){const p=E.xy(room.k),v=this.screen(p.x,p.y),color=E.ROOM_TYPES[room.type].color,stage=room.size===1?(room.maturity>=50?2:1):room.size===2?3:4,r=scale*(.38+stage*.13);c.save();c.globalAlpha=room.status==='active'?.9:.5;this.ellipse(v.x,v.y,r,r*.72,color);this.ellipse(v.x,v.y,r*.75,r*.52,'#17231c');c.strokeStyle=color;c.lineWidth=Math.max(2,r*.09);c.setLineDash(room.status==='active'?[]:[5,5]);c.beginPath();c.ellipse(v.x,v.y,r*.86,r*.62,0,0,Math.PI*2);c.stroke();c.setLineDash([]);if(stage>=2){c.beginPath();c.strokeStyle='#e4dca355';c.lineWidth=2+stage;c.ellipse(v.x,v.y,r*.97,r*.7,0,0,Math.PI*2);c.stroke();}if(room.type==='store'){for(let i=0;i<Math.min(9,Math.ceil(s.food/15));i++)this.ellipse(v.x+(i%4-1.5)*7,v.y+(Math.floor(i/4)-1)*7,4+(i%2),3,'#d5b873');}else if(room.type==='nursery'){for(let i=0;i<4+stage*3;i++)this.ellipse(v.x+(i%4-1.5)*7,v.y+(Math.floor(i/4)-.5)*8,4,7,'#ddd7b2');}else if(room.type==='prey'){this.line(v.x-17,v.y-9,v.x+17,v.y+9,'#d28b6b',6);this.line(v.x-17,v.y+9,v.x+17,v.y-9,'#8f5d4d',4);this.ellipse(v.x+13,v.y-7,7,5,'#c27b5e');}else if(room.type==='rest'){this.ellipse(v.x,v.y,18,10,'#91b6a7');for(let i=0;i<3;i++)this.ellipse(v.x-10+i*10,v.y,3,5,'#c5d5b5');}else if(room.type==='military'){this.line(v.x-18,v.y-5,v.x+18,v.y-5,'#cf806a',7);this.line(v.x-12,v.y+8,v.x+12,v.y+8,'#8f5147',5);}else if(room.type==='royal'){this.ellipse(v.x,v.y,scale*.25,scale*.18,'#e9dca5');for(let i=0;i<stage+2;i++)this.ellipse(v.x+(i-(stage+1)/2)*12,v.y+11,4,6,'#baa56e');}else{for(let i=0;i<4;i++)this.ellipse(v.x+(i-1.5)*10,v.y+(i%2?4:-4),6,10,'#9299bd');this.ellipse(v.x,v.y,24,13,'#60527d',.15);}c.restore();const progress=room.status==='active'?'':room.status==='excavating'?`開挖中 ${Math.floor((room.planCells?.filter(k=>E.cell(s,k)?.open).length||0)/Math.max(1,room.planCells?.length||1)*100)}% · `:`施工 ${Math.min(99,Math.floor((room.progress||0)/14/(room.targetSize||room.size||1)*100))}% · `;this.label(v.x,v.y-r*.92,`${progress}${E.ROOM_TYPES[room.type].name}`,'room',room.k,{id:room.id});this.targets.push({kind:'room',k:room.k,id:room.id,x:v.x,y:v.y,radius:Math.max(30,r)});}
      if(this.view==='surface'){
        for(const reg of s.regions){const p=this.screen(reg.x,reg.y??2);c.textAlign='center';c.font='12px system-ui';c.fillStyle=reg.seen?'#c8d1a9':'#839575';c.fillText(reg.seen?reg.name:'未知森林',p.x,p.y-scale*.7);if(reg.seen){c.font='11px system-ui';c.fillStyle=E.territory(reg)==='爭奪中'?'#ddb184':'#8ba27c';c.fillText(E.territory(reg),p.x,p.y-scale*.7+20);}}
        for(const clue of s.world?.clues||[]){const tile=E.cell(s,clue.k);if(!tile?.seen||!E.isSurface(s,tile))continue;const p=this.screen(tile.x,tile.y,tile.elevation||0),pulse=4+Math.sin(this.time*5)*2;this.ellipse(p.x-pulse,p.y+5,4,2,'#ddaa7866',-.35);this.ellipse(p.x+pulse,p.y-3,4,2,'#ddaa7866',-.35);this.label(p.x,p.y-scale*.48,clue.kind==='retreat'?'撤退足跡':'陌生蟻群痕跡','clue',clue.k,{source:clue.source});this.targets.push({kind:'clue',k:clue.k,source:clue.source,x:p.x,y:p.y,radius:38});}
        // Vegetation and shadow extend the tiny forest beyond the navigable strip.
        for(let i=0;i<36;i++){const x=(i*173)%Math.max(1,w),y=h*.82+noise(i,4)*h*.16;c.strokeStyle='#53654029';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+15,y-15,x+6,y-37);c.stroke();}
      }
      for(const food of s.resources){if(food.amount<=0||!E.cell(s,food.k)?.seen||!visibleCell(food.k))continue;
        const p=E.xy(food.k),v=this.screen(p.x,p.y,food.height??E.cell(s,food.k)?.elevation??0),gone=false,size=scale*.28;
        c.save();
        if(food.queenCorpse){this.ant(v.x,v.y,size*1.25,'#887d72',.45,null,true);this.line(v.x-size*1.1,v.y-size*.75,v.x+size*1.1,v.y+size*.75,'#d2a57a',Math.max(2,size*.12));}
        else if(food.type==='insect'){this.ant(v.x,v.y,size,'#ba9676',.45,null);if(gone)this.line(v.x-size,v.y,v.x+size,v.y,'#263322',size*.22);}
        else if(food.type==='fruit'){this.ellipse(v.x,v.y,size,size*(gone?.25:1),'#bd765e');if(!gone){this.line(v.x,v.y-size,v.x+size*.2,v.y-size*1.5,'#a5bf76',3);this.ellipse(v.x+size*.4,v.y-size*1.3,size*.45,size*.16,'#819b65',-.5);}}
        else if(food.type==='sap'){c.fillStyle=gone?'#65553b':'#d6b65d';c.beginPath();c.moveTo(v.x,v.y-size*1.6);c.bezierCurveTo(v.x-size*1.5,v.y+size,v.x+size*1.5,v.y+size,v.x,v.y-size*1.6);c.fill();}
        else {for(let i=0;i<3;i++){const x=v.x+(i-1)*size*.6;this.ellipse(x,v.y+(i%2)*size*.3,size*.22,size*.65,'#d3bc83',i*.8);if(gone)this.line(x,v.y-size*.3,x+2,v.y+size*.3,'#263322',2);}}
        c.restore();const kind=food.queenCorpse?'deadQueen':'food',radius=food.queenCorpse?38:27,label=food.queenCorpse?'蟻后遺骸':({insect:'昆蟲',fruit:'果實',sap:'植物汁液',seed:'種子'}[food.type]||'食物');this.targets.push({kind,k:food.k,x:v.x,y:v.y,radius});if(food.large||food.queenCorpse||s.routes.some(r=>r.k===food.k&&r.active!==false)||this.camera.zoom<.72)this.label(v.x,v.y-scale*.65,label+' · '+Math.ceil(food.amount),kind,food.k);
      }
      // Queen and nursery are spatially distinct from the nearby workers.
      if(this.view==='nest'){
        const queenK=s.queenK??E.HOME,qp=E.xy(queenK),q=this.screen(qp.x-.8,qp.y-.5);this.ant(q.x,q.y,scale*.47,'#d9cba0',-.5,null,true);this.targets.push({kind:'queen',k:queenK,x:q.x,y:q.y,radius:25});this.label(q.x-scale*.12,q.y-scale*.58,'蟻后','queen',queenK);
        for(const k of [...new Set(s.broods.map(b=>b.k??E.HOME))]){const bp=E.xy(k),formal=E.roomAt(s,k)?.type==='nursery',brood=this.screen(k===E.HOME?9.35:bp.x,k===E.HOME?10.3:bp.y);s.broods.filter(b=>(b.k??E.HOME)===k).slice(0,3).forEach((b,i)=>{for(let n=0;n<Math.min(b.count,4);n++)this.ellipse(brood.x+(n-1.5)*scale*.15,brood.y+(i-1)*scale*.2,b.stage===1?scale*.09:scale*.05,b.stage===2?scale*.11:scale*.07,b.stage===0?'#ede7cb':b.stage===1?'#d2dfa8':'#d2bd8e',.6);});if(!formal)this.label(brood.x,brood.y+scale*.53,'臨時育幼區','brood',k);this.targets.push({kind:'brood',k,x:brood.x,y:brood.y,radius:30});}
        for(const n of s.colonies){if(n.fallen||!E.cell(s,n.queenK)?.seen)continue;const p=E.xy(n.queenK),q=this.screen(p.x,p.y);this.ant(q.x,q.y,scale*.45,n.color||'#d89170',.6,null,true);this.label(q.x,q.y-scale*.6,`${n.name||'敵國'}蟻后`,'enemyQueen',n.queenK,{colony:n.id});this.targets.push({kind:'enemyQueen',k:n.queenK,colony:n.id,x:q.x,y:q.y,radius:32});}

      }
      const exits=[...(s.exits??[s.mainExit]),...s.colonies.filter(n=>!n.fallen).map(n=>E.key(E.xy(n.home).x,4))];
      for(const k of exits){const e=E.cell(s,k);if(!e?.seen||e.sealed)continue;const p=this.screen(e.x,e.y),colony=s.colonies.find(n=>!n.fallen&&E.xy(n.home).x===e.x),kind=colony?'enemyNest':'exit',extra=colony?{colony:colony.id}:{};this.ellipse(p.x,p.y,scale*.28,scale*.13,'#101b15');this.label(p.x,p.y+scale*.47,colony?`${colony.name||'敵巢'} · ${colony.strategy||'活動中'}`:'巢口',kind,k,extra);this.targets.push({kind,k,x:p.x,y:p.y,radius:Math.max(30,scale*.42),box:{x:p.x-scale*.42,y:p.y-scale*.24,w:scale*.84,h:scale*.95},...extra});}
      const player=E.workers(s),enemies=s.ants.filter(a=>a.faction==='enemy'&&player.some(b=>E.isSurface(s,a.k)===E.isSurface(s,b.k)&&E.distance(a,b)<5)),ants=[...player,...enemies],clusters=new Map();
      for(const a of ants){if(!visibleCell(a.k))continue;const elevation=E.cell(s,a.k)?.elevation||0,p=this.screen(a.x+(noise(a.id,1)-.5)*.5,a.y+(noise(a.id,2)-.5)*.42,elevation);const next=a.path.length?E.xy(a.path[0]):null,angle=next?Math.atan2(next.y-a.y,next.x-a.x):noise(a.id,7)*6;
        if(selected.includes(a.id)){c.strokeStyle='#ddecaa';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,Math.max(12,scale*.3),0,7);c.stroke();}
        const enemyColony=a.faction==='enemy'?s.colonies.find(n=>n.id===a.colony):null,antColor=a.faction==='enemy'?(enemyColony?.color||'#df9674'):a.soldierType==='armor'?'#9da8a2':a.soldierType==='jaw'?'#d3a76e':a.soldierType==='acid'?'#9fc47b':a.caste==='soldier'?'#c5b57a':a.traits.min>.25?'#a8b9b2':'#c3d986';this.ant(p.x,p.y,Math.max(8,scale*.25)*(1+a.traits.pred*.08+(a.caste==='soldier'?.08:0)),antColor,angle,a);
        if(a.carry)this.ellipse(p.x+Math.cos(angle)*scale*.2,p.y+Math.sin(angle)*scale*.2,3,2,'#d3b680');
        if(a.action==='戰鬥'){this.line(p.x-4,p.y-5,p.x+4,p.y+5,'#f2b981',1.5);this.line(p.x+4,p.y-5,p.x-4,p.y+5,'#f2b981',1.5);const seen=this.lastHitSeen.get(a.id)||-1;if(a.lastHit>seen){this.lastHitSeen.set(a.id,a.lastHit);for(let i=0;i<5;i++)this.fx.push({x:p.x,y:p.y,vx:(noise(a.id,i)-.5)*55,vy:(noise(i,a.id)-.65)*55,life:.32,color:a.faction==='enemy'?'#e59672':'#d7d39a'});}}
        this.targets.push({kind:a.faction==='enemy'?'enemy':'ants',k:a.k,id:a.id,x:p.x,y:p.y,radius:a.faction==='enemy'?34:28});
        if(a.faction==='player'&&a.hp<a.maxHp*.72){const ratio=Math.max(0,a.hp/a.maxHp);c.fillStyle='#241612';c.fillRect(p.x-14,p.y-17,28,4);c.fillStyle=ratio<=.3?'#dc755f':'#d7b06d';c.fillRect(p.x-14,p.y-17,28*ratio,4);}
        const clusterKey=a.faction+':'+a.k;if(!clusters.has(clusterKey))clusters.set(clusterKey,[]);clusters.get(clusterKey).push(a);
      }
      for(const list of clusters.values()){const selectedHere=list.some(a=>selected.includes(a.id)),fighting=list.some(a=>a.action==='戰鬥'),minimum=this.camera.zoom<.75?2:5;if(list.length<minimum&&!selectedHere&&!fighting)continue;const a=list[0],p=this.screen(a.x,a.y),soldiers=list.filter(x=>x.caste==='soldier').length,type=soldiers===list.length?'兵蟻':soldiers?'蟻群':'工蟻';if(a.faction==='player')this.label(p.x,p.y-scale*.48,`${selectedHere?'已選 ':''}${type} ×${list.length}`,'ants',a.k,{id:a.id});else this.label(p.x,p.y-scale*.46,`敵蟻 ×${list.length}`,'enemy',a.k,{id:a.id});}
      if(this.view==='nest')for(const wld of s.wildlife){if(wld.dead||E.isSurface(s,wld.k)||!E.cell(s,wld.k)?.seen)continue;const v=this.screen(wld.x,wld.y),pulse=Math.sin(this.time*4+wld.id)*2;this.ellipse(v.x,v.y,scale*.27+pulse,scale*.17,'#756554',.15);this.ellipse(v.x-scale*.2,v.y,scale*.14,scale*.12,'#4e443b');this.label(v.x,v.y-scale*.55,wld.kind+' · 活體','wildlife',wld.k,{id:wld.id});this.targets.push({kind:'wildlife',k:wld.k,id:wld.id,x:v.x,y:v.y,radius:32});}
      if(this.view==='surface'){for(const wld of s.wildlife){if(wld.dead||!E.isSurface(s,wld.k)||!E.cell(s,wld.k)?.seen)continue;const v=this.screen(wld.x,wld.y,wld.height||0),pulse=Math.sin(this.time*4+wld.id)*3;this.ellipse(v.x,v.y,scale*.28+pulse,scale*.16,'#8c6646',.15);this.ellipse(v.x-scale*.22,v.y,scale*.16,scale*.13,'#5d4937');this.line(v.x-scale*.15,v.y-4,v.x-scale*.4,v.y-13,'#b18a61',2);this.line(v.x-scale*.15,v.y+4,v.x-scale*.4,v.y+13,'#b18a61',2);if(wld.hp<wld.maxHp||wld.action==='防衛'){c.fillStyle='#241612';c.fillRect(v.x-20,v.y-24,40,5);c.fillStyle='#d88463';c.fillRect(v.x-20,v.y-24,40*wld.hp/wld.maxHp,5);}this.label(v.x,v.y-scale*.55,wld.kind+' · 活體','wildlife',wld.k,{id:wld.id});this.targets.push({kind:'wildlife',k:wld.k,id:wld.id,x:v.x,y:v.y,radius:30});}}
      for(const particle of this.fx){particle.life-=elapsed;particle.x+=particle.vx*elapsed;particle.y+=particle.vy*elapsed;particle.vy+=70*elapsed;if(particle.life<=0)continue;c.globalAlpha=Math.min(1,particle.life*4);c.fillStyle=particle.color;c.beginPath();c.arc(particle.x,particle.y,1.5+particle.life*3,0,Math.PI*2);c.fill();}c.globalAlpha=1;this.fx=this.fx.filter(p=>p.life>0).slice(-180);
      // Soft edge shading, not a second interface around the world.
      const shade=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.7);shade.addColorStop(0,'#07150b00');shade.addColorStop(1,'#07110b66');c.fillStyle=shade;c.fillRect(0,0,w,h);c.textBaseline='alphabetic';
    }
  }
  root.AntWorld=World;
})(window);

