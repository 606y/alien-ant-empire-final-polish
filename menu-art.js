/* Formal menu presentation and intro-image slots. No character art is generated in code. */
(function(root){
  'use strict';
  const assets=root.AntAssets;
  const TAU=Math.PI*2;

  function fit(canvas){
    const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(1,r.width),h=Math.max(1,r.height);
    if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
    const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);return {c,w,h};
  }
  function coverMetrics(img,w,h,zoom=1){
    const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*zoom,dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
    return {dw,dh,dx:(w-dw)/2,dy:(h-dh)/2};
  }
  function drawCover(c,img,w,h,alpha=1,offsetX=0,zoom=1,offsetY=0){
    const m=coverMetrics(img,w,h,zoom);c.save();c.globalAlpha=alpha;c.drawImage(img,m.dx+offsetX,m.dy+offsetY,m.dw,m.dh);c.restore();
  }
  function usableFormal(img){return !!img&&img.naturalWidth>16&&img.naturalHeight>16;}

  function drawQuietFallback(c,w,h,step=0){
    const colors=[['#0a100e','#18201b'],['#0c100f','#211b17'],['#09100d','#172018']][step]||['#0a100e','#18201b'];
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#030706');g.addColorStop(.56,colors[0]);g.addColorStop(1,colors[1]);c.fillStyle=g;c.fillRect(0,0,w,h);
  }
  function drawLocalCityLights(c,w,h,t){
    const lights=[[.704,.335,8,0],[.616,.57,5,1.1],[.716,.62,6,2.2],[.884,.59,7,3.4],[.806,.36,5,5.2]];
    c.save();c.globalCompositeOperation='screen';
    for(const [px,py,r,phase] of lights){
      const pulse=.5+.5*Math.sin(t*.00085+phase),g=c.createRadialGradient(px*w,py*h,0,px*w,py*h,r*(.9+pulse*.12));
      g.addColorStop(0,`rgba(255,193,90,${.07+pulse*.055})`);g.addColorStop(.3,`rgba(224,105,44,${.025+pulse*.025})`);g.addColorStop(1,'rgba(95,37,19,0)');c.fillStyle=g;c.fillRect(px*w-r*1.6,py*h-r*1.6,r*3.2,r*3.2);
    }c.restore();
  }
  function drawFormalFlyer(c,key,w,h,t,index){
    const img=assets?.image(key);if(!usableFormal(img))return;
    const entry=assets.manifest.images[key]||{},motion=entry.motion||{},animation=entry.animation||{};
    const frames=Math.max(1,animation.frames||1),fps=Math.max(1,animation.fps||12),frame=Math.floor(t*fps/1000+index)%frames;
    const sw=img.naturalWidth/frames,sh=img.naturalHeight,phase=(motion.phase??index*1.7),slow=t*(motion.speed??.00016)+phase;
    const x=((motion.x??(.52+index*.13))+Math.sin(slow)*(motion.rangeX??.018))*w;
    const y=((motion.y??(.14+index*.055))+Math.cos(slow*.73)*(motion.rangeY??.012))*h;
    const width=Math.min(w,h)*(motion.size??.12),height=width*(sh/sw),turn=Math.sin(slow*.61)*(motion.turn??.06);
    c.save();c.translate(x,y);c.rotate(turn);if(Math.cos(slow)<0)c.scale(-1,1);c.globalAlpha=motion.opacity??.96;c.drawImage(img,frame*sw,0,sw,sh,-width/2,-height/2,width,height);c.restore();
  }
  function drawMenu(canvas,t){
    const {c,w,h}=fit(canvas),formal=assets?.image('menuBgMain');
    if(usableFormal(formal))drawCover(c,formal,w,h);else drawQuietFallback(c,w,h);
    const fog=assets?.image('menuFogOverlay');if(usableFormal(fog))drawCover(c,fog,w,h,.32,Math.sin(t*.00005)*3);
    if(usableFormal(formal))drawLocalCityLights(c,w,h,t);
    for(const [i,key] of (assets?.manifest?.menuFlyers||[]).entries())drawFormalFlyer(c,key,w,h,t,i);
    const foreground=assets?.image('menuForegroundOverlay');if(usableFormal(foreground))drawCover(c,foreground,w,h);
    const edge=c.createRadialGradient(w*.56,h*.46,Math.min(w,h)*.32,w*.52,h*.5,Math.max(w,h)*.78);edge.addColorStop(0,'rgba(0,0,0,0)');edge.addColorStop(1,'rgba(0,5,4,.18)');c.fillStyle=edge;c.fillRect(0,0,w,h);
  }
  function drawIntro(canvas,t,step){
    const {c,w,h}=fit(canvas),sequence=assets?.manifest?.introSequence||[],formal=assets?.image(sequence[step]);
    drawQuietFallback(c,w,h,step);
    if(usableFormal(formal)){
      const phase=[0,2.1,4.3][step]||0,zoom=1.018+Math.sin(t*.00007+phase)*.004,panX=Math.sin(t*.000055+phase)*w*.006,panY=Math.cos(t*.000047+phase)*h*.004;
      drawCover(c,formal,w,h,1,panX,zoom,panY);
    }
    const shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'rgba(2,7,6,.58)');shade.addColorStop(.34,'rgba(2,7,6,.18)');shade.addColorStop(.62,'rgba(2,7,6,0)');c.fillStyle=shade;c.fillRect(0,0,w,h);
    const floor=c.createLinearGradient(0,h*.62,0,h);floor.addColorStop(0,'rgba(2,7,6,0)');floor.addColorStop(1,'rgba(2,7,6,.42)');c.fillStyle=floor;c.fillRect(0,h*.62,w,h*.38);
  }
  class MenuArt{
    constructor(menu,intro){this.menu=menu;this.intro=intro;this.introStep=0;this.running=true;this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);}
    setIntroStep(value){this.introStep=value;}
    frame(time){if(!this.running)return;if(this.menu&&this.menu.offsetParent!==null)drawMenu(this.menu,time);if(this.intro&&this.intro.offsetParent!==null)drawIntro(this.intro,time,this.introStep);requestAnimationFrame(this.frame);}
  }
  root.AntMenuArt=MenuArt;
})(window);
