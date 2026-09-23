/* Assets v2 menu presentation and formal intro-image playback. Character art is never redrawn in code. */
(function(root){
  'use strict';
  const assets=root.AntAssets;

  function fit(canvas){
    const rect=canvas.getBoundingClientRect(),density=Math.min(2,root.devicePixelRatio||1),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    const width=Math.round(w*density),height=Math.round(h*density);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const context=canvas.getContext('2d');context.setTransform(density,0,0,density,0,0);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    return {context,w,h};
  }
  function usable(image){return !!image&&image.naturalWidth>16&&image.naturalHeight>16;}
  function cover(context,image,w,h,alpha=1,offsetX=0,zoom=1,offsetY=0){
    const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight)*zoom,dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
    context.save();context.globalAlpha=alpha;context.drawImage(image,(w-dw)/2+offsetX,(h-dh)/2+offsetY,dw,dh);context.restore();
  }
  function fallback(context,w,h,step=0){
    const palettes=[['#09110e','#17211b'],['#0b100e','#211a16'],['#08100d','#172019']],colors=palettes[step]||palettes[0];
    const gradient=context.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#020605');gradient.addColorStop(.58,colors[0]);gradient.addColorStop(1,colors[1]);context.fillStyle=gradient;context.fillRect(0,0,w,h);
  }
  function menuBackground(){
    for(const key of assets?.manifest?.menuBackground||['menuBgAnimationBase','menuBgMain']){const image=assets?.image(key);if(usable(image))return image;}
    return null;
  }
  function localCityLights(context,w,h,time){
    const lights=[[.704,.335,7,0],[.616,.57,5,1.4],[.716,.62,6,2.7],[.884,.59,6,4.1]];
    context.save();context.globalCompositeOperation='screen';
    for(const [x,y,r,phase] of lights){
      const pulse=.5+.5*Math.sin(time*.00072+phase),radius=r*(.94+pulse*.08),gradient=context.createRadialGradient(x*w,y*h,0,x*w,y*h,radius);
      gradient.addColorStop(0,`rgba(255,190,91,${.055+pulse*.04})`);gradient.addColorStop(.34,`rgba(209,91,39,${.018+pulse*.018})`);gradient.addColorStop(1,'rgba(77,29,14,0)');context.fillStyle=gradient;context.fillRect(x*w-r*1.6,y*h-r*1.6,r*3.2,r*3.2);
    }
    context.restore();
  }
  function formalFlyer(context,key,w,h,time,index){
    const image=assets?.image(key);if(!usable(image))return false;
    const entry=assets.manifest.images[key]||{},motion=entry.motion||{},animation=entry.animation||{};
    const frames=Math.max(1,animation.frames||1),fps=Math.max(1,animation.fps||12),frame=Math.floor(time*fps/1000+index)%frames,sourceWidth=image.naturalWidth/frames;
    const cycle=Math.max(24000,motion.cycle||52000),progress=((time/cycle)+(motion.phase||0))%1,eased=.5-.5*Math.cos(progress*Math.PI*2);
    const fromX=motion.fromX??.42,toX=motion.toX??1.16,direction=(Math.sign(toX-fromX)||1)*(progress<.5?1:-1);
    const x=(fromX+(toX-fromX)*eased)*w,y=(motion.y??.2)*h+Math.sin(progress*Math.PI*2+index*.83)*h*(motion.driftY??.015);
    const width=Math.min(w,h)*(motion.size??.28),height=width*(image.naturalHeight/sourceWidth),turn=Math.sin(progress*Math.PI*2+index*.7)*(motion.turn??.02);
    context.save();context.translate(x,y);context.rotate(turn);if(direction<0)context.scale(-1,1);context.globalAlpha=motion.opacity??.98;
    context.drawImage(image,frame*sourceWidth,0,sourceWidth,image.naturalHeight,-width/2,-height/2,width,height);context.restore();return true;
  }
  function drawMenu(canvas,time){
    const {context,w,h}=fit(canvas),background=menuBackground();
    if(background)cover(context,background,w,h);else fallback(context,w,h);
    const fog=assets?.image('menuFogOverlay');if(usable(fog))cover(context,fog,w,h,.12,Math.sin(time*.00004)*2);
    if(background)localCityLights(context,w,h,time);
    let visibleFlyers=0;for(const [index,key] of (assets?.manifest?.menuFlyers||[]).entries()){if(visibleFlyers>=3)break;if(formalFlyer(context,key,w,h,time,index))visibleFlyers++;}
    const foreground=assets?.image('menuForegroundOverlay');if(usable(foreground))cover(context,foreground,w,h,.88);
    const edge=context.createRadialGradient(w*.6,h*.48,Math.min(w,h)*.4,w*.54,h*.5,Math.max(w,h)*.8);edge.addColorStop(0,'rgba(0,0,0,0)');edge.addColorStop(1,'rgba(0,4,3,.14)');context.fillStyle=edge;context.fillRect(0,0,w,h);
    return visibleFlyers;
  }
  function drawIntroLayer(context,image,w,h,time,step,alpha){
    if(!usable(image))return;
    const phase=[0,2.1,4.3][step]||0,zoom=1.014+(time%24000)/24000*.014,panX=Math.sin(time*.000045+phase)*w*.005,panY=Math.cos(time*.000038+phase)*h*.003;
    cover(context,image,w,h,alpha,panX,zoom,panY);
  }
  function drawIntro(canvas,time,step,previousStep,transitionAt){
    const {context,w,h}=fit(canvas),sequence=assets?.manifest?.introSequence||[];
    fallback(context,w,h,step);
    const elapsed=Math.max(0,time-transitionAt),mix=Math.min(1,elapsed/650),previous=assets?.image(sequence[previousStep]),current=assets?.image(sequence[step]);
    if(previousStep!==step&&mix<1)drawIntroLayer(context,previous,w,h,time,previousStep,1-mix);
    drawIntroLayer(context,current,w,h,time,step,previousStep===step?1:mix);
    const side=context.createLinearGradient(0,0,w,0);side.addColorStop(0,'rgba(2,7,6,.54)');side.addColorStop(.32,'rgba(2,7,6,.15)');side.addColorStop(.64,'rgba(2,7,6,0)');context.fillStyle=side;context.fillRect(0,0,w,h);
    const floor=context.createLinearGradient(0,h*.66,0,h);floor.addColorStop(0,'rgba(2,7,6,0)');floor.addColorStop(1,'rgba(2,7,6,.38)');context.fillStyle=floor;context.fillRect(0,h*.66,w,h*.34);
  }
  class MenuArt{
    constructor(menu,intro){
      this.menu=menu;this.intro=intro;this.introStep=0;this.previousIntroStep=0;this.transitionAt=performance.now();this.raf=0;this.lastWingPass=performance.now();this.frame=this.frame.bind(this);this.refresh=this.refresh.bind(this);
      this.observer=new MutationObserver(this.refresh);if(document.body)this.observer.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','style','hidden']});
      document.addEventListener('visibilitychange',this.refresh);this.refresh();assets?.ready.then(this.refresh);
    }
    visible(element){return !!element&&element.offsetParent!==null;}
    refresh(){
      const active=!document.hidden&&(this.visible(this.menu)||this.visible(this.intro));
      if(active&&!this.raf)this.raf=requestAnimationFrame(this.frame);
      if(!active&&this.raf){cancelAnimationFrame(this.raf);this.raf=0;}
    }
    setIntroStep(value){this.previousIntroStep=this.introStep;this.introStep=value;this.transitionAt=performance.now();this.refresh();}
    frame(time){
      this.raf=0;let active=false;
      if(this.visible(this.menu)){const count=drawMenu(this.menu,time);active=true;if(count&&time-this.lastWingPass>22000){this.lastWingPass=time;root.dispatchEvent(new CustomEvent('ant:wingpass'));}}
      if(this.visible(this.intro)){drawIntro(this.intro,time,this.introStep,this.previousIntroStep,this.transitionAt);active=true;}
      if(active&&!document.hidden)this.raf=requestAnimationFrame(this.frame);
    }
    destroy(){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.observer?.disconnect();document.removeEventListener('visibilitychange',this.refresh);}
  }
  root.AntMenuArt=MenuArt;
})(window);
