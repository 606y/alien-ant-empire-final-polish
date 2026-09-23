/* Assets v3 presentation slots with v2 fallback. No character art is generated here. */
(function(root){
  'use strict';
  const assets=root.AntAssets;

  function fit(canvas){
    const rect=canvas.getBoundingClientRect(),dpr=Math.max(1,Number(root.devicePixelRatio)||1),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    const width=Math.round(w*dpr),height=Math.round(h*dpr);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const context=canvas.getContext('2d');context.setTransform(dpr,0,0,dpr,0,0);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    return {context,w,h,dpr};
  }
  function usable(image){return !!image&&image.naturalWidth>16&&image.naturalHeight>16;}
  function ready(key){const image=assets?.image(key);return usable(image)?image:null;}
  function preferred(keys){for(const key of keys||[]){const image=ready(key);if(image)return {key,image};}return null;}
  function cover(context,image,w,h,alpha=1,offsetX=0,zoom=1,offsetY=0){
    // Draw directly from the original image. Never rasterize into a small intermediate canvas.
    const needed=Math.max(w/image.naturalWidth,h/image.naturalHeight)*zoom,scale=Math.min(needed,1),dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
    context.save();context.globalAlpha=alpha;context.drawImage(image,(w-dw)/2+offsetX,(h-dh)/2+offsetY,dw,dh);context.restore();
  }
  function fallback(context,w,h,step=0){
    const palettes=[['#09110e','#17211b'],['#0b100e','#211a16'],['#08100d','#172019']],colors=palettes[step]||palettes[0];
    const gradient=context.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#020605');gradient.addColorStop(.58,colors[0]);gradient.addColorStop(1,colors[1]);context.fillStyle=gradient;context.fillRect(0,0,w,h);
  }
  function setMenuBackdrop(canvas,selection,w,h){
    const key=selection?.key||'',layout=`${key}:${Math.round(w)}x${Math.round(h)}`;if(canvas.dataset.backgroundLayout===layout)return;
    canvas.dataset.backgroundLayout=layout;canvas.dataset.backgroundAsset=key;
    canvas.style.backgroundImage=selection?`url(${JSON.stringify(selection.image.src)})`:'';
    const image=selection?.image,needsUpscale=image?Math.max(w/image.naturalWidth,h/image.naturalHeight)>1:false;
    canvas.dataset.backgroundLimited=String(needsUpscale);
    canvas.style.backgroundSize=needsUpscale?`${image.naturalWidth}px ${image.naturalHeight}px`:'cover';
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
  function spriteFrame(image,entry,time,index=0){
    const animation=entry?.animation||{},columns=Math.max(1,Math.floor(animation.columns||animation.frames||1)),rows=Math.max(1,Math.floor(animation.rows||1));
    const frames=Math.min(columns*rows,Math.max(1,Math.floor(animation.frames||columns*rows))),fps=Math.max(1,animation.fps||12),frame=Math.floor(time*fps/1000+index)%frames;
    const sw=image.naturalWidth/columns,sh=image.naturalHeight/rows;
    return {sx:(frame%columns)*sw,sy:Math.floor(frame/columns)*sh,sw,sh};
  }
  function flight(motion,w,h,time,index){
    const cycle=Math.max(24000,motion.cycle||52000),progress=((time/cycle)+(motion.phase||0))%1,eased=.5-.5*Math.cos(progress*Math.PI*2);
    const fromX=motion.fromX??.42,toX=motion.toX??1.16,direction=(Math.sign(toX-fromX)||1)*(progress<.5?1:-1);
    return {x:(fromX+(toX-fromX)*eased)*w,y:(motion.y??.2)*h+Math.sin(progress*Math.PI*2+index*.83)*h*(motion.driftY??.015),direction,turn:Math.sin(progress*Math.PI*2+index*.7)*(motion.turn??.02),width:Math.min(w,h)*(motion.size??.28)};
  }
  function drawV2Flyer(context,key,w,h,time,index){
    const image=ready(key);if(!image)return false;
    const entry=assets.manifest.images[key],pose=flight(entry.motion||{},w,h,time,index),frame=spriteFrame(image,entry,time,index),height=pose.width*frame.sh/frame.sw;
    context.save();context.translate(pose.x,pose.y);context.rotate(pose.turn);if(pose.direction<0)context.scale(-1,1);context.globalAlpha=entry.motion?.opacity??.98;
    context.drawImage(image,frame.sx,frame.sy,frame.sw,frame.sh,-pose.width/2,-height/2,pose.width,height);context.restore();return true;
  }
  function drawV3Flyer(context,group,w,h,time,index){
    const body=ready(group.body),wings=ready(group.wings);if(!body||!wings)return false;
    const pose=flight(group.motion||{},w,h,time,index),bodyFrame=spriteFrame(body,assets.manifest.images[group.body],time,index),wingFrame=spriteFrame(wings,assets.manifest.images[group.wings],time,index);
    const bodyHeight=pose.width*bodyFrame.sh/bodyFrame.sw,wing=group.wing||{},wingWidth=pose.width*(wing.scale||1),wingHeight=wingWidth*wingFrame.sh/wingFrame.sw;
    const drawBody=()=>context.drawImage(body,bodyFrame.sx,bodyFrame.sy,bodyFrame.sw,bodyFrame.sh,-pose.width/2,-bodyHeight/2,pose.width,bodyHeight);
    const drawWings=()=>{
      const pivotX=wing.pivotX??.5,pivotY=wing.pivotY??.5,offsetX=(wing.offsetX||0)*pose.width,offsetY=(wing.offsetY||0)*bodyHeight;
      const vibration=Math.sin(time*Math.PI*2*(wing.frequency||14)/1000+index*1.7)*(wing.angle??.075);
      context.save();context.translate(offsetX+(pivotX-.5)*wingWidth,offsetY+(pivotY-.5)*wingHeight);context.rotate(vibration);
      context.drawImage(wings,wingFrame.sx,wingFrame.sy,wingFrame.sw,wingFrame.sh,-pivotX*wingWidth,-pivotY*wingHeight,wingWidth,wingHeight);context.restore();
    };
    context.save();context.translate(pose.x,pose.y);context.rotate(pose.turn);if(pose.direction<0)context.scale(-1,1);
    if(wing.order==='front'){drawBody();drawWings();}else{drawWings();drawBody();}
    context.restore();return true;
  }
  function v3FlyersReady(){const groups=assets?.manifest?.menuFlyersV3||[];return groups.length>0&&groups.every(group=>ready(group.body)&&ready(group.wings));}
  function drawMenu(canvas,time){
    const {context,w,h}=fit(canvas),background=preferred(assets?.manifest?.menuBackground||['menuBgAnimationBase','menuBgMain']);
    setMenuBackdrop(canvas,background,w,h);context.clearRect(0,0,w,h);if(!background)fallback(context,w,h);
    if(background)localCityLights(context,w,h,time);
    let visible=0;
    if(v3FlyersReady()){
      canvas.dataset.flyerMode='v3';for(const [index,group] of assets.manifest.menuFlyersV3.entries()){if(visible>=3)break;if(drawV3Flyer(context,group,w,h,time,index))visible++;}
    }else{
      canvas.dataset.flyerMode='v2';for(const [index,key] of (assets?.manifest?.menuFlyers||[]).entries()){if(visible>=3)break;if(drawV2Flyer(context,key,w,h,time,index))visible++;}
    }
    return visible;
  }
  function introImage(step){
    const v3=assets?.manifest?.introSequenceV3?.[step],v2=assets?.manifest?.introSequence?.[step];return preferred([v3,v2]);
  }
  function drawIntroLayer(context,selection,w,h,time,step,alpha){
    if(!selection)return;
    const phase=[0,2.1,4.3][step]||0,zoom=1.006+(time%24000)/24000*.004,panX=Math.sin(time*.000045+phase)*w*.003,panY=Math.cos(time*.000038+phase)*h*.002;
    cover(context,selection.image,w,h,alpha,panX,zoom,panY);
  }
  function drawIntro(canvas,time,step,previousStep,transitionAt){
    const {context,w,h}=fit(canvas);fallback(context,w,h,step);
    const elapsed=Math.max(0,time-transitionAt),mix=Math.min(1,elapsed/650),previous=introImage(previousStep),current=introImage(step);
    canvas.dataset.introAsset=current?.key||'';
    if(previousStep!==step&&mix<1)drawIntroLayer(context,previous,w,h,time,previousStep,1-mix);
    drawIntroLayer(context,current,w,h,time,step,previousStep===step?1:mix);
    const side=context.createLinearGradient(0,0,w,0);side.addColorStop(0,'rgba(2,7,6,.54)');side.addColorStop(.32,'rgba(2,7,6,.15)');side.addColorStop(.64,'rgba(2,7,6,0)');context.fillStyle=side;context.fillRect(0,0,w,h);
    const floor=context.createLinearGradient(0,h*.66,0,h);floor.addColorStop(0,'rgba(2,7,6,0)');floor.addColorStop(1,'rgba(2,7,6,.38)');context.fillStyle=floor;context.fillRect(0,h*.66,w,h*.34);
  }
  class MenuArt{
    constructor(menu,intro){
      this.menu=menu;this.intro=intro;this.introStep=0;this.previousIntroStep=0;this.transitionAt=performance.now();this.raf=0;this.lastWingPass=performance.now();this.frame=this.frame.bind(this);this.refresh=this.refresh.bind(this);
      this.observer=new MutationObserver(this.refresh);if(document.body)this.observer.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
      document.addEventListener('visibilitychange',this.refresh);this.refresh();assets?.ready.then(this.refresh);
    }
    visible(element){return !!element&&element.offsetParent!==null;}
    refresh(){const active=!document.hidden&&(this.visible(this.menu)||this.visible(this.intro));if(active&&!this.raf)this.raf=requestAnimationFrame(this.frame);if(!active&&this.raf){cancelAnimationFrame(this.raf);this.raf=0;}}
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
