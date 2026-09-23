/* Menu presentation and formal intro-image slots. No remote assets are used. */
(function(root){
  'use strict';
  const assets=root.AntAssets;
  const TAU=Math.PI*2;
  const hash=n=>{n=Math.imul(n^n>>>16,2246822519);n=Math.imul(n^n>>>13,3266489917);return ((n^n>>>16)>>>0)/4294967295;};

  function fit(canvas){
    const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(1,r.width),h=Math.max(1,r.height);
    if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
    const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);return {c,w,h};
  }
  function coverMetrics(img,w,h,zoom=1){
    const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*zoom,dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
    return {scale,dw,dh,dx:(w-dw)/2,dy:(h-dh)/2};
  }
  function drawCover(c,img,w,h,alpha=1,offsetX=0,zoom=1,offsetY=0){
    const m=coverMetrics(img,w,h,zoom);c.save();c.globalAlpha=alpha;c.drawImage(img,m.dx+offsetX,m.dy+offsetY,m.dw,m.dh);c.restore();return m;
  }
  function ant(c,x,y,s,a,color='#171912'){
    c.save();c.translate(x,y);c.rotate(a);c.scale(s,s);c.strokeStyle=color;c.lineWidth=.9;c.lineCap='round';
    for(let i=0;i<3;i++)for(const side of [-1,1]){c.beginPath();c.moveTo((i-1)*2.2,side);c.lineTo((i-1)*3.5,side*3.2);c.lineTo((i-1)*5.2-1,side*5);c.stroke();}
    c.fillStyle=color;for(const [px,rx,ry] of [[-4.5,4,2.8],[0,2.5,2],[4,3,2.5]]){c.beginPath();c.ellipse(px,0,rx,ry,0,0,TAU);c.fill();}c.restore();
  }
  function wingedAnt(c,x,y,s,a,phase,depth=1){
    const flap=Math.sin(phase),open=.34+.66*Math.abs(flap),lean=flap*.32;
    c.save();c.translate(x,y);c.rotate(a);c.scale(s,s);c.lineCap='round';
    c.save();c.globalCompositeOperation='screen';c.fillStyle=`rgba(230,218,174,${.34+.22*depth})`;c.strokeStyle=`rgba(255,239,190,${.36+.28*depth})`;c.lineWidth=.65;
    for(const side of [-1,1]){
      c.save();c.scale(1,side);c.rotate(lean*side);c.beginPath();c.ellipse(-1.4,-5.3*open,7.8,2.7+open*1.8,-.35,0,TAU);c.fill();c.stroke();c.beginPath();c.ellipse(1.7,-3.4*open,5.2,1.8+open,-.12,0,TAU);c.fill();c.restore();
    }c.restore();
    c.fillStyle='#17130f';c.strokeStyle='#241a12';c.lineWidth=1;
    c.beginPath();c.ellipse(-5,0,5,3,0,0,TAU);c.ellipse(1,0,3,2.4,0,0,TAU);c.ellipse(6,0,3.4,2.8,0,0,TAU);c.fill();
    for(const side of [-1,1]){c.beginPath();c.moveTo(0,side);c.lineTo(-1,side*5.6);c.lineTo(-5,side*8);c.stroke();c.beginPath();c.moveTo(8,side*.8);c.quadraticCurveTo(12,side*3.4,14,side*2.5);c.stroke();}
    c.restore();
  }

  function drawWarpedFlag(c,img,m,rect,t,phase,amp){
    const [nx,ny,nw,nh]=rect,sx=nx*img.naturalWidth,sy=ny*img.naturalHeight,sw=nw*img.naturalWidth,sh=nh*img.naturalHeight;
    const dx=m.dx+sx*m.scale,dy=m.dy+sy*m.scale,dw=sw*m.scale,dh=sh*m.scale,bands=18;
    c.save();c.globalAlpha=.9;
    for(let i=0;i<bands;i++){
      const u=i/bands,srcY=sy+sh*u,srcH=sh/bands+1,dstY=dy+dh*u,dstH=dh/bands+1;
      const wind=(Math.sin(t*.00155+phase+u*3.6)+Math.sin(t*.00071+phase*1.7+u*6.2)*.35)*amp*u;
      const stretch=1+Math.sin(t*.00108+phase+u*4.4)*.012*u;
      c.drawImage(img,sx,srcY,sw,srcH,dx+wind,dstY,dw*stretch,dstH);
    }
    c.restore();
  }
  function formalBanners(c,img,m,w,h,t){
    const base=Math.max(2.5,w*.0032),flags=[
      [[.455,.405,.036,.22],.3,base*.75],[[.493,.42,.034,.205],1.8,base*.65],
      [[.704,.415,.037,.23],3.2,base*.72],[[.842,.37,.056,.36],4.8,base*1.35]
    ];
    for(const [rect,phase,amp] of flags)drawWarpedFlag(c,img,m,rect,t,phase,amp);
  }
  function formalGuardLife(c,img,m,w,h,t){
    const guards=[
      [[.002,.49,.165,.49],.3,1.0],[[.205,.57,.22,.43],2.2,.75],[[.405,.72,.19,.28],4.1,.55]
    ];
    for(const [rect,phase,power] of guards){
      const [nx,ny,nw,nh]=rect,sx=nx*img.naturalWidth,sy=ny*img.naturalHeight,sw=nw*img.naturalWidth,sh=nh*img.naturalHeight;
      const dx=m.dx+sx*m.scale,dy=m.dy+sy*m.scale,dw=sw*m.scale,dh=sh*m.scale;
      const breath=Math.sin(t*.00105+phase),shift=breath*1.25*power,scaleY=1+breath*.0022*power;
      c.save();c.beginPath();c.ellipse(dx+dw*.52,dy+dh*.58,dw*.52,dh*.56,0,0,TAU);c.clip();c.globalAlpha=.42;c.translate(0,dy+dh);c.scale(1,scaleY);c.translate(shift,-dy-dh);c.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);c.restore();
      c.save();c.strokeStyle=`rgba(210,174,101,${.09+.035*(breath+1)})`;c.lineWidth=Math.max(.7,w*.00065);c.lineCap='round';
      const ax=dx+dw*(.43+.08*power),ay=dy+dh*.2;c.beginPath();c.moveTo(ax,ay);c.quadraticCurveTo(ax+dw*.08,ay-dh*(.04+.01*breath),ax+dw*.12+breath*2,ay-dh*.08);c.stroke();
      c.fillStyle=`rgba(255,191,86,${.08+.06*(breath+1)})`;c.beginPath();c.arc(dx+dw*.56,dy+dh*.34,1.1+power*.7,0,TAU);c.fill();c.restore();
    }
  }
  function formalLights(c,w,h,t){
    const lights=[[.704,.335,13,0],[.616,.57,8,1.1],[.716,.62,10,2.2],[.884,.59,11,3.4],[.545,.67,7,4.1],[.806,.36,7,5.2]];
    c.save();c.globalCompositeOperation='screen';
    for(const [px,py,r,phase] of lights){const pulse=.5+.5*Math.sin(t*.0011+phase),g=c.createRadialGradient(px*w,py*h,0,px*w,py*h,r*(.8+pulse*.25));g.addColorStop(0,`rgba(255,193,90,${.12+pulse*.12})`);g.addColorStop(.32,`rgba(224,105,44,${.06+pulse*.05})`);g.addColorStop(1,'rgba(95,37,19,0)');c.fillStyle=g;c.fillRect(px*w-r*1.8,py*h-r*1.8,r*3.6,r*3.6);}c.restore();
  }
  function formalFlyers(c,w,h,t){
    const flyers=[
      [.39,.125,1.35,0,.015,.012],[.55,.205,1.0,1.6,.025,.018],[.72,.11,.82,3.4,.02,.011],[.89,.25,1.16,5.1,.03,.019]
    ];
    for(let i=0;i<flyers.length;i++){
      const [cx,cy,size,phase,rx,ry]=flyers[i],slow=t*(.00022+i*.000017)+phase;
      const x=(cx+Math.sin(slow)*rx+Math.sin(slow*.41+phase)*rx*.35)*w;
      const y=(cy+Math.cos(slow*.73)*ry+Math.sin(slow*.37+phase)*ry*.35)*h;
      const vx=Math.cos(slow)*rx,vy=-Math.sin(slow*.73)*ry*.73,angle=Math.atan2(vy*h,vx*w)*.22;
      wingedAnt(c,x,y,Math.max(.75,w/1450)*size,angle,t*(.038+i*.0037)+phase,i<2?1:.72);
    }
  }
  function formalAtmosphere(c,w,h,t){
    c.save();
    const fogBanks=[[.59,.72,.28,.09,.045,0],[.77,.67,.24,.075,.035,2.1],[.49,.56,.19,.055,.028,4.4]];
    for(const [px,py,rx,ry,alpha,phase] of fogBanks){const drift=Math.sin(t*.00016+phase)*w*.012,g=c.createRadialGradient(px*w+drift,py*h,0,px*w+drift,py*h,rx*w);g.addColorStop(0,`rgba(176,184,168,${alpha})`);g.addColorStop(.62,`rgba(146,158,146,${alpha*.42})`);g.addColorStop(1,'rgba(120,136,125,0)');c.save();c.scale(1,ry/rx);c.fillStyle=g;c.fillRect((px-rx)*w+drift,(py-ry)*h*(rx/ry),rx*w*2,ry*h*2*(rx/ry));c.restore();}
    for(let i=0;i<18;i++){
      const speed=.000006+hash(i+4)*.000009,px=.34+((hash(i*41)+t*speed)%.66),py=.08+((hash(i*79)+t*speed*.19)%1)*.78;
      if(px<.46&&py>.28)continue;const a=.18+hash(i+91)*.26,r=.8+hash(i+131)*2.1;c.fillStyle=i%4?`rgba(230,190,116,${a})`:`rgba(171,219,158,${a*.75})`;c.beginPath();c.arc(px*w,py*h,r,0,TAU);c.fill();
    }c.restore();
  }

  function forest(c,w,h,t){
    const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#07110f');sky.addColorStop(.5,'#15241d');sky.addColorStop(1,'#10120e');c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(let i=0;i<12;i++){const x=hash(i*19)*w,th=w*(.012+hash(i*31)*.018);c.strokeStyle=i%3?'#182019':'#24271c';c.lineWidth=th;c.lineCap='round';c.beginPath();c.moveTo(x,-20);c.bezierCurveTo(x+w*(hash(i)-.5)*.12,h*.24,x+w*(hash(i+5)-.5)*.18,h*.44,x+w*(hash(i+9)-.5)*.24,h*.7);c.stroke();}
  }
  function mound(c,w,h,t){
    const cx=w*.59,base=h*.84,wide=Math.min(w*.29,h*.48),pulse=.5+.5*Math.sin(t*.00045),g=c.createLinearGradient(cx,h*.18,cx,base);g.addColorStop(0,'#343729');g.addColorStop(.55,'#30251b');g.addColorStop(1,'#0b100d');c.fillStyle=g;c.beginPath();c.moveTo(cx-wide,base);c.bezierCurveTo(cx-wide*.82,h*.5,cx-wide*.28,h*.18,cx,h*.16);c.bezierCurveTo(cx+wide*.3,h*.18,cx+wide*.84,h*.52,cx+wide,base);c.closePath();c.fill();
    c.fillStyle=`rgba(175,204,108,${.07+pulse*.05})`;c.beginPath();c.ellipse(cx,base-h*.28,wide*.16,h*.11,0,0,TAU);c.fill();
  }
  function drawMenu(canvas,t){
    const {c,w,h}=fit(canvas),formal=assets?.image('menuBgMain');let metrics=null;
    if(formal){metrics=drawCover(c,formal,w,h);}else{forest(c,w,h,t);mound(c,w,h,t);const base=h*.84;for(let i=0;i<34;i++){const phase=(t*.000025+hash(i*7))%1;ant(c,w*(.08+phase*.84),base+h*(.02+(i%3)*.026),Math.max(.48,w/1800),0);}}
    const fog=assets?.image('menuFogOverlay');if(fog)drawCover(c,fog,w,h,.48,Math.sin(t*.00008)*6);
    if(formal){formalBanners(c,formal,metrics,w,h,t);formalGuardLife(c,formal,metrics,w,h,t);formalLights(c,w,h,t);formalFlyers(c,w,h,t);formalAtmosphere(c,w,h,t);}
    const foreground=assets?.image('menuForegroundOverlay');if(foreground)drawCover(c,foreground,w,h);
    const vignette=c.createRadialGradient(w*.56,h*.46,Math.min(w,h)*.24,w*.52,h*.5,Math.max(w,h)*.76);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,5,4,.42)');c.fillStyle=vignette;c.fillRect(0,0,w,h);
  }

  function usableFormal(img){return !!img&&img.naturalWidth>16&&img.naturalHeight>16;}
  function drawIntro(canvas,t,step){
    const {c,w,h}=fit(canvas),sequence=assets?.manifest?.introSequence||[],formal=assets?.image(sequence[step]);c.fillStyle='#07100d';c.fillRect(0,0,w,h);
    if(usableFormal(formal)){
      const phase=[0,2.1,4.3][step]||0,zoom=1.025+Math.sin(t*.00009+phase)*.006,panX=Math.sin(t*.000075+phase)*w*.009,panY=Math.cos(t*.000061+phase)*h*.006;
      drawCover(c,formal,w,h,1,panX,zoom,panY);
      for(let i=0;i<8;i++){const x=((hash(i+step*11)+t*(.0000025+hash(i)*.0000015))%1)*w,y=(.12+hash(i+70)*.75)*h;c.fillStyle=`rgba(213,192,131,${.09+hash(i+33)*.12})`;c.beginPath();c.arc(x,y,.7+hash(i)*1.4,0,TAU);c.fill();}
    }else{
      const colors=[['#101917','#263027'],['#121516','#30251d'],['#111711','#262d20']][step]||['#101917','#263027'];
      const g=c.createRadialGradient(w*.62,h*.42,0,w*.62,h*.42,Math.max(w,h)*.78);g.addColorStop(0,colors[1]);g.addColorStop(.55,colors[0]);g.addColorStop(1,'#040807');c.fillStyle=g;c.fillRect(0,0,w,h);
      c.strokeStyle='rgba(167,181,128,.06)';c.lineWidth=1;for(let i=0;i<7;i++){c.beginPath();c.arc(w*.62,h*.45,Math.min(w,h)*(.12+i*.075)+Math.sin(t*.00035+i)*2,Math.PI*.15,Math.PI*1.15);c.stroke();}
    }
    const shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'rgba(2,7,6,.66)');shade.addColorStop(.34,'rgba(2,7,6,.24)');shade.addColorStop(.64,'rgba(2,7,6,0)');c.fillStyle=shade;c.fillRect(0,0,w,h);
    const floor=c.createLinearGradient(0,h*.58,0,h);floor.addColorStop(0,'rgba(2,7,6,0)');floor.addColorStop(1,'rgba(2,7,6,.48)');c.fillStyle=floor;c.fillRect(0,h*.58,w,h*.42);
  }
  class MenuArt{
    constructor(menu,intro){this.menu=menu;this.intro=intro;this.introStep=0;this.running=true;this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);}
    setIntroStep(v){this.introStep=v;}
    frame(t){if(!this.running)return;if(this.menu&&this.menu.offsetParent!==null)drawMenu(this.menu,t);if(this.intro&&this.intro.offsetParent!==null)drawIntro(this.intro,t,this.introStep);requestAnimationFrame(this.frame);}
  }
  root.AntMenuArt=MenuArt;
})(window);
