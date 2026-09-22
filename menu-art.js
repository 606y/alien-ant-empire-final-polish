/* Procedural menu and intro art. No downloaded assets are required. */
(function(root){
  'use strict';
  const TAU=Math.PI*2,hash=n=>{n=Math.imul(n^n>>>16,2246822519);n=Math.imul(n^n>>>13,3266489917);return ((n^n>>>16)>>>0)/4294967295;};
  function fit(canvas){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(1,r.width),h=Math.max(1,r.height);if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);return {c,w,h};}
  function ant(c,x,y,s,a,color='#171912',glow=false){c.save();c.translate(x,y);c.rotate(a);c.scale(s,s);if(glow){c.shadowBlur=9;c.shadowColor='#b9d776';}c.strokeStyle=color;c.lineWidth=.9;c.lineCap='round';for(let i=0;i<3;i++)for(const side of [-1,1]){c.beginPath();c.moveTo((i-1)*2.2,side);c.lineTo((i-1)*3.5,side*3.2);c.lineTo((i-1)*5.2-1,side*5);c.stroke();}c.fillStyle=color;for(const [px,rx,ry] of [[-4.5,4,2.8],[0,2.5,2],[4,3,2.5]]){c.beginPath();c.ellipse(px,0,rx,ry,0,0,TAU);c.fill();}c.beginPath();c.moveTo(6,-1);c.quadraticCurveTo(10,-5,12,-3);c.moveTo(6,1);c.quadraticCurveTo(10,5,12,3);c.stroke();c.restore();}
  function mound(c,w,h,t){const cx=w*.55,base=h*.82,top=h*.17,wide=Math.min(w*.31,h*.48),pulse=.5+.5*Math.sin(t*.00045);c.save();c.shadowColor='#000';c.shadowBlur=55;
    const g=c.createLinearGradient(cx,top,cx,base);g.addColorStop(0,'#30362a');g.addColorStop(.32,'#392f22');g.addColorStop(.74,'#211d18');g.addColorStop(1,'#0b100d');c.fillStyle=g;c.beginPath();c.moveTo(cx-wide,base);c.bezierCurveTo(cx-wide*.92,h*.62,cx-wide*.68,h*.44,cx-wide*.42,h*.34);c.bezierCurveTo(cx-wide*.2,h*.25,cx-wide*.18,top,cx,top);c.bezierCurveTo(cx+wide*.18,top,cx+wide*.16,h*.27,cx+wide*.48,h*.35);c.bezierCurveTo(cx+wide*.82,h*.48,cx+wide*.88,h*.67,cx+wide,base);c.closePath();c.fill();c.shadowBlur=0;
    // Chitin ribs turn the mound into a living fortress.
    for(let i=0;i<8;i++){const yy=top+(base-top)*(i+1)/9,span=wide*(.28+.65*(i/8));c.strokeStyle=i%2?'#8a744244':'#b49a5d38';c.lineWidth=Math.max(2,w*.0026);c.beginPath();c.moveTo(cx-span,yy+18);c.quadraticCurveTo(cx,yy-26-(i%2)*15,cx+span,yy+18);c.stroke();}
    for(const side of [-1,1])for(let i=0;i<3;i++){const x=cx+side*wide*(.28+i*.17),y=base-h*(.16+i*.12);c.fillStyle='#101713';c.beginPath();c.ellipse(x,y,wide*.075,h*.046,-side*.26,0,TAU);c.fill();c.strokeStyle='#b9d47255';c.lineWidth=2;c.stroke();}
    // Central royal membrane and faint bioluminescence.
    const rg=c.createRadialGradient(cx,base-h*.31,2,cx,base-h*.31,wide*.25);rg.addColorStop(0,`rgba(194,218,125,${.22+pulse*.08})`);rg.addColorStop(.32,'rgba(111,139,74,.12)');rg.addColorStop(1,'rgba(20,30,23,0)');c.fillStyle=rg;c.fillRect(cx-wide*.3,base-h*.5,wide*.6,h*.4);c.fillStyle='#171d17';c.beginPath();c.ellipse(cx,base-h*.28,wide*.13,h*.09,0,0,TAU);c.fill();c.strokeStyle='#9aad6444';c.stroke();
    // Satellite spires and guarded causeways.
    for(const side of [-1,1])for(let i=0;i<2;i++){const x=cx+side*wide*(1.05+i*.4),bh=base-i*h*.04,sh=h*(.18-i*.025);c.fillStyle='#211f18';c.beginPath();c.moveTo(x-sh*.35,bh);c.quadraticCurveTo(x-sh*.28,bh-sh*.68,x,bh-sh);c.quadraticCurveTo(x+sh*.28,bh-sh*.62,x+sh*.35,bh);c.fill();c.strokeStyle='#89774742';c.lineWidth=2;c.stroke();c.beginPath();c.moveTo(x,bh);c.quadraticCurveTo(cx+side*wide*.78,base-h*.03,cx+side*wide*.62,base-h*.08);c.stroke();}
    c.restore();
  }
  function forest(c,w,h,t){const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#07110f');sky.addColorStop(.45,'#15241d');sky.addColorStop(1,'#12130f');c.fillStyle=sky;c.fillRect(0,0,w,h);
    // Canopy light shafts.
    c.save();c.globalCompositeOperation='screen';for(let i=0;i<5;i++){const x=w*(.12+i*.19)+Math.sin(t*.00012+i)*20,lg=c.createLinearGradient(x,0,x+w*.12,h);lg.addColorStop(0,'rgba(155,177,115,.12)');lg.addColorStop(1,'rgba(104,128,75,0)');c.fillStyle=lg;c.beginPath();c.moveTo(x,0);c.lineTo(x+w*(.08+i*.012),h);c.lineTo(x+w*(.22+i*.015),h);c.lineTo(x+w*.045,0);c.fill();}c.restore();
    // Massive roots and grass establish ant scale.
    for(let i=0;i<13;i++){const x=hash(i*19)*w,th=w*(.012+hash(i*31)*.018);c.strokeStyle=i%3?'#182019':'#24271c';c.lineWidth=th;c.lineCap='round';c.beginPath();c.moveTo(x,-20);c.bezierCurveTo(x+w*(hash(i)-.5)*.12,h*.24,x+w*(hash(i+5)-.5)*.18,h*.44,x+w*(hash(i+9)-.5)*.24,h*.67);c.stroke();}
    for(let i=0;i<42;i++){const x=hash(90+i)*w,y=h*(.72+hash(190+i)*.28),len=h*(.08+hash(290+i)*.27);c.strokeStyle=i%4?'#35442b':'#59613b';c.lineWidth=1+hash(i)*4;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+(hash(i+70)-.5)*30,y-len*.55,x+(hash(i+40)-.5)*45,y-len);c.stroke();}
    const fog=c.createLinearGradient(0,h*.48,0,h);fog.addColorStop(0,'rgba(88,111,82,0)');fog.addColorStop(.65,'rgba(70,83,62,.09)');fog.addColorStop(1,'rgba(8,12,10,.44)');c.fillStyle=fog;c.fillRect(0,h*.42,w,h*.58);
  }
  function drawMenu(canvas,t){const {c,w,h}=fit(canvas);forest(c,w,h,t);mound(c,w,h,t);const base=h*.83,cx=w*.55;
    // Organized ant traffic conveys a functioning kingdom.
    for(let i=0;i<42;i++){const lane=i%3,phase=(t*.000025*(1+lane*.17)+hash(i*7))%1,x=w*(.06+phase*.9),y=base+h*(.025+lane*.028)+Math.sin(i*2.1)*4,dir=lane===1?Math.PI:0;ant(c,lane===1?w-x:x,y,Math.max(.48,w/1800),dir,'#11140f',i%17===0);}
    for(let i=0;i<28;i++){const x=hash(i*81)*w,y=hash(i*39)*h*.7;c.fillStyle=i%5?'rgba(168,187,120,.13)':'rgba(194,214,130,.33)';c.beginPath();c.arc(x,y,1+hash(i)*2.5,0,TAU);c.fill();}
    const vignette=c.createRadialGradient(w*.55,h*.48,Math.min(w,h)*.16,w*.5,h*.5,Math.max(w,h)*.68);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,5,4,.73)');c.fillStyle=vignette;c.fillRect(0,0,w,h);
  }
  function drawIntro(canvas,t,step){const {c,w,h}=fit(canvas);c.fillStyle='#07100d';c.fillRect(0,0,w,h);const cx=w*.5,cy=h*.48,pulse=.5+.5*Math.sin(t*.002);
    if(step===0){const glow=c.createRadialGradient(cx,cy,0,cx,cy,h*.42);glow.addColorStop(0,`rgba(188,207,126,${.17+pulse*.08})`);glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);ant(c,cx,cy,Math.max(2.8,w/430),-.55,'#b8aa79',true);}
    else if(step===1){forest(c,w,h,t);c.globalAlpha=.8;mound(c,w,h,t);c.globalAlpha=1;}
    else{forest(c,w,h,t);for(let i=0;i<70;i++){const a=hash(i)*TAU,r=Math.sqrt(hash(i+99))*Math.min(w,h)*.46,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.55;ant(c,x,y,.45+hash(i+3)*.35,a,'#131711',i%23===0);}const glow=c.createRadialGradient(cx,cy,0,cx,cy,h*.5);glow.addColorStop(0,'rgba(153,184,96,.16)');glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);}
  }
  class MenuArt{constructor(menu,intro){this.menu=menu;this.intro=intro;this.introStep=0;this.running=true;this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);}setIntroStep(v){this.introStep=v;}frame(t){if(!this.running)return;if(this.menu&&this.menu.offsetParent!==null)drawMenu(this.menu,t);if(this.intro&&this.intro.offsetParent!==null)drawIntro(this.intro,t,this.introStep);requestAnimationFrame(this.frame);}}
  root.AntMenuArt=MenuArt;
})(window);
