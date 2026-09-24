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
    const cycle=Math.max(18000,motion.cycle||30000),progress=((time/cycle)+(motion.phase||0))%1,eased=.5-.5*Math.cos(progress*Math.PI*2);
    const fromX=motion.fromX??.5,toX=motion.toX??.7,direction=(Math.sign(toX-fromX)||1)*(progress<.5?1:-1);
    const height=h*(motion.height??.08);
    return {x:(fromX+(toX-fromX)*eased)*w,y:(motion.y??.2)*h+Math.sin(progress*Math.PI*2+index*.83)*h*(motion.driftY??.015),direction,turn:Math.sin(progress*Math.PI*2+index*.7)*(motion.turn??.02),height,width:height};
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
    const bodyWidth=pose.height*bodyFrame.sw/bodyFrame.sh,wingWidth=pose.height*wingFrame.sw/wingFrame.sh,wingHeight=pose.height,wing=group.wing||{};
    const wingBeat=Math.sin(time*Math.PI*2*(wing.frequency||14)/1000+(wing.phase||0));
    context.save();context.translate(pose.x,pose.y);context.rotate(pose.turn);if(pose.direction<0)context.scale(-1,1);
    // Both supplied layers share a square canvas. Only the wings change shape at flight frequency.
    context.save();context.translate(0,-wingHeight*.1);context.rotate(wingBeat*(wing.angle||.1));context.scale(1,.8+.18*wingBeat);
    context.drawImage(wings,wingFrame.sx,wingFrame.sy,wingFrame.sw,wingFrame.sh,-wingWidth/2,-wingHeight/2,wingWidth,wingHeight);context.restore();
    context.drawImage(body,bodyFrame.sx,bodyFrame.sy,bodyFrame.sw,bodyFrame.sh,-bodyWidth/2,-pose.height/2,bodyWidth,pose.height);
    context.restore();return true;
  }
  function drawGround(context,w,h,time){
    const mobile=w<620,groups=assets?.manifest?.menuGroundV3||[];let visible=0;
    for(const item of groups){if(mobile&&item.mobileX===undefined)continue;const image=ready(item.key);if(!image)continue;
      const height=h*(mobile?(item.mobileHeight||item.height):item.height),width=height*image.naturalWidth/image.naturalHeight;
      let x=(mobile?item.mobileX:item.x)*w,y=(mobile?item.mobileY:item.y)*h,tilt=0;
      if(item.motion==='patrol'){
        const progress=(time/16500+item.phase*.17)%1;
        const stride=progress<.27?progress/.27:progress<.63?1:progress<.89?1-(progress-.63)/.26:0;
        x+=(stride-.5)*Math.min(16,w*.016);y-=Math.sin(progress*Math.PI*2)*.6;
      }else{tilt=Math.sin(time*.00045+item.phase)*.008;y+=Math.sin(time*.00058+item.phase)*.6;}
      context.save();context.translate(x,y);context.rotate(tilt);context.globalAlpha=.94;context.drawImage(image,-width/2,-height,width,height);context.restore();visible++;
    }
    return visible;
  }
  function drawBanners(context,w,h,time){
    if(w<620)return 0;let visible=0;
    for(const item of assets?.manifest?.menuBannersV3||[]){const image=ready(item.key);if(!image)continue;
      const height=h*item.height,width=height*image.naturalWidth/image.naturalHeight,left=item.x*w-width*.16,top=item.y*h;
      const poleWidth=image.naturalWidth*.21;
      context.drawImage(image,0,0,poleWidth,image.naturalHeight,left,top,width*.21,height);
      const sway=Math.sin(time*.00065+item.phase)*.018;
      context.save();context.translate(left+width*.21,top+height*.12);context.rotate(sway);
      context.drawImage(image,poleWidth,0,image.naturalWidth-poleWidth,image.naturalHeight,0,-height*.12,width*.79,height);
      context.restore();visible++;
    }
    return visible;
  }
  const isolatedParts=new Map();
  function isolateSprite(image,key,polygon){
    if(isolatedParts.has(key))return isolatedParts.get(key);
    const create=()=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;return canvas;};
    const base=create(),part=create(),path=context=>{context.beginPath();polygon.forEach(([x,y],i)=>i?context.lineTo(x*image.naturalWidth,y*image.naturalHeight):context.moveTo(x*image.naturalWidth,y*image.naturalHeight));context.closePath();};
    const back=base.getContext('2d');back.drawImage(image,0,0);back.globalCompositeOperation='destination-out';path(back);back.fill();
    const front=part.getContext('2d');front.drawImage(image,0,0);front.globalCompositeOperation='destination-in';path(front);front.fill();
    const result={base,part};isolatedParts.set(key,result);return result;
  }
  function drawPartSprite(context,image,key,polygon,x,bottom,height,pivot,angle,shift=0){
    const layer=isolateSprite(image,key,polygon),scale=height/image.naturalHeight;
    context.save();context.translate(x-image.naturalWidth*scale/2+shift,bottom-height);context.scale(scale,scale);
    context.drawImage(layer.base,0,0);context.translate(pivot[0]*image.naturalWidth,pivot[1]*image.naturalHeight);context.rotate(angle);context.drawImage(layer.part,-pivot[0]*image.naturalWidth,-pivot[1]*image.naturalHeight);context.restore();
  }
  function drawV4Foreground(context,w,h,time){
    const config=assets?.manifest?.menuV4;if(!config)return;
    const mobile=w<620,flag=ready(config.flag.key),heavy=ready(config.heavy.key);
    if(flag){const c=config.flag,height=h*(mobile?c.mobileHeight:c.height),x=w*(mobile?c.mobileX:c.x),bottom=h*(mobile?c.mobileBottom:c.bottom);
      // Isolate fabric from this independent sprite. The pole and body remain fixed.
      const sway=Math.sin(time*.0009)*.023+Math.sin(time*.00041+1.1)*.009;
      drawPartSprite(context,flag,c.key,[[.69,.15],[.99,.17],[1,.94],[.84,.96],[.73,.75],[.69,.46]],x,bottom,height,[.69,.17],sway);
    }
    if(heavy){const c=config.heavy,height=h*(mobile?c.mobileHeight:c.height),x=w*(mobile?c.mobileX:c.x),bottom=h*(mobile?c.mobileBottom:c.bottom);
      const cycle=(time/5100)%1,lift=cycle<.2?cycle/.2:cycle<.58?1:cycle<.8?1-(cycle-.58)/.22:0;
      const eased=lift*lift*(3-2*lift),angle=-.045*eased;
      drawPartSprite(context,heavy,c.key,[[0,.27],[.16,.28],[.12,.39],[.23,.48],[.43,.53],[.47,.69],[.14,.68],[0,.54]],x,bottom,height,[.39,.52],angle,Math.sin(time*.00055)*.6);
    }
  }
  function drawV4Flyer(context,w,h,time){
    const config=assets?.manifest?.menuV4?.flyer;if(!config)return 0;
    const body=ready(config.body),wings=ready(config.wings);if(!body||!wings)return 0;
    const mobile=w<620,height=h*(mobile?config.mobileHeight:config.height),cycle=(time/36000+.11)%1;
    let travel;if(cycle<.42){const t=cycle/.42;travel=t*t*(3-2*t);}else if(cycle<.53)travel=1;else if(cycle<.93){const t=(cycle-.53)/.4;travel=1-t*t*(3-2*t);}else travel=0;
    const x=w*((mobile?.56:.48)+(mobile?.23:.34)*travel),y=h*(mobile?.18:.22)+Math.sin(cycle*Math.PI*2)*h*.023;
    const tilt=Math.sin(cycle*Math.PI*2)*.026,face=cycle<.53?1:-1;
    const bodyWidth=height*body.naturalWidth/body.naturalHeight,wingHeight=height*.86,wingWidth=wingHeight*wings.naturalWidth/wings.naturalHeight;
    const beat=Math.sin(time*Math.PI*2*18/1000),backX=height*.02,backY=-height*.13;
    context.save();context.translate(x,y);context.rotate(tilt);if(face<0)context.scale(-1,1);
    context.save();context.translate(backX,backY);context.rotate(beat*.12);context.scale(1,.76+.2*beat);
    context.drawImage(wings,-wingWidth/2,-wingHeight*.16,wingWidth,wingHeight);context.restore();
    context.drawImage(body,-bodyWidth/2,-height/2,bodyWidth,height);context.restore();return 1;
  }
  function battleFire(context,w,h,time){
    if(w<620)return;context.save();context.globalCompositeOperation='screen';
    for(const [x,y,r,phase] of [[.78,.3,13,0],[.88,.24,11,1.9],[.95,.36,9,3.4]]){
      const pulse=.55+.45*Math.sin(time*.002+phase),gradient=context.createRadialGradient(x*w,y*h,0,x*w,y*h,r);
      gradient.addColorStop(0,'rgba(255,145,45,'+(.07+.045*pulse)+')');gradient.addColorStop(1,'rgba(255,70,10,0)');context.fillStyle=gradient;context.fillRect(x*w-r,y*h-r,r*2,r*2);
    }context.restore();
  }
  function drawV6Foreground(context,w,h,time){
    const config=assets?.manifest?.menuV6;if(!config)return;
    const mobile=w<620,flag=ready(config.flag.key),heavy=ready(config.heavy.key);
    if(flag){const c=config.flag,height=h*(mobile?c.mobileHeight:c.height),x=w*(mobile?c.mobileX:c.x),bottom=h*(mobile?c.mobileBottom:c.bottom);
      const layer=isolateSprite(flag,c.key,[[0,.06],[.82,.07],[.83,.30],[.72,.36],[.56,.42],[.43,.53],[.22,.65],[0,.69]]),scale=height/flag.naturalHeight;
      const sway=Math.sin(time*.00074)*.044+Math.sin(time*.00118+1.1)*.011;
      context.save();context.translate(x-flag.naturalWidth*scale/2,bottom-height);context.scale(scale,scale);
      context.save();context.translate(.83*flag.naturalWidth,.13*flag.naturalHeight);context.rotate(sway);
      context.drawImage(layer.part,-.83*flag.naturalWidth,-.13*flag.naturalHeight);context.restore();
      context.drawImage(layer.base,0,0);context.restore();
    }
    if(heavy){const c=config.heavy,height=h*(mobile?c.mobileHeight:c.height),width=height*heavy.naturalWidth/heavy.naturalHeight;
      const x=w*(mobile?c.mobileX:c.x),bottom=h*(mobile?c.mobileBottom:c.bottom);
      // V6 hammer and both arms are one supplied image. Keep the pose intact rather than dislocating a weapon cutout.
      context.drawImage(heavy,x-width/2,bottom-height,width,height);
    }
  }
  function drawV6Flyer(context,w,h,time){
    const config=assets?.manifest?.menuV6?.flyer;if(!config)return 0;
    const body=ready(config.body),wings=ready(config.wings);if(!body||!wings)return 0;
    const mobile=w<620,height=h*(mobile?config.mobileHeight:config.height),cycle=(time/44000+.06)%1;
    let travel;if(cycle<.43){const t=cycle/.43;travel=t*t*(3-2*t);}else if(cycle<.55)travel=1;else if(cycle<.94){const t=(cycle-.55)/.39;travel=1-t*t*(3-2*t);}else travel=0;
    const x=w*((mobile?.45:.41)+(mobile?.31:.36)*travel),y=h*(mobile?.19:.18)+Math.sin(cycle*Math.PI*2)*h*.015;
    const tilt=Math.sin(cycle*Math.PI*2)*.022,face=cycle<.55?1:-1,bodyWidth=height*body.naturalWidth/body.naturalHeight;
    const wingHeight=height*.94,wingWidth=wingHeight*wings.naturalWidth/wings.naturalHeight,beat=Math.sin(time*Math.PI*2*17/1000);
    context.save();context.translate(x,y);context.rotate(tilt);if(face<0)context.scale(-1,1);
    context.save();context.translate(-height*.07,-height*.09);context.rotate(beat*.115);context.scale(1,.75+.21*beat);
    context.drawImage(wings,-wingWidth/2,-wingHeight/2,wingWidth,wingHeight);context.restore();
    context.drawImage(body,-bodyWidth/2,-height/2,bodyWidth,height);context.restore();return 1;
  }
  function drawV5Foreground(context,w,h,time){
    const config=assets?.manifest?.menuV5;if(!config)return;
    const mobile=w<620,flag=ready(config.flag.key),heavy=ready(config.heavy.key);
    if(flag){const c=config.flag,height=h*(mobile?c.mobileHeight:c.height),x=w*(mobile?c.mobileX:c.x),bottom=h*(mobile?c.mobileBottom:c.bottom);
      const layer=isolateSprite(flag,c.key,[[.25,.13],[.54,.11],[.53,.37],[.49,.49],[.46,.59],[.42,.73],[.2,.88],[0,.88],[0,.62],[.26,.42]]),scale=height/flag.naturalHeight;
      const sway=Math.sin(time*.0009)*.045+Math.sin(time*.00043+1.2)*.018;
      context.save();context.translate(x-flag.naturalWidth*scale/2,bottom-height);context.scale(scale,scale);
      // Independent V5 sprite only: move cloth behind its stationary pole and soldier.
      context.save();context.translate(.53*flag.naturalWidth,.12*flag.naturalHeight);context.rotate(sway);context.drawImage(layer.part,-.53*flag.naturalWidth,-.12*flag.naturalHeight);context.restore();
      context.drawImage(layer.base,0,0);context.restore();
    }
    if(heavy){const c=config.heavy,height=h*(mobile?c.mobileHeight:c.height),x=w*(mobile?c.mobileX:c.x),bottom=h*(mobile?c.mobileBottom:c.bottom);
      const progress=(time/6000)%1,ease=t=>t*t*(3-2*t);let angle=0;
      if(progress<.18)angle=0;
      else if(progress<.42)angle=-.10*ease((progress-.18)/.24);
      else if(progress<.55)angle=-.10;
      else if(progress<.68)angle=-.10+.26*ease((progress-.55)/.13);
      else if(progress<.77)angle=.16;
      else angle=.16*(1-ease((progress-.77)/.23));
      drawPartSprite(context,heavy,c.key,[[0,.02],[1,.02],[1,.52],[.79,.58],[.56,.6],[.36,.64],[0,.69]],x,bottom,height,[.5,.6],angle);
    }
  }
  function drawV5Flyer(context,w,h,time){
    const config=assets?.manifest?.menuV5?.flyer;if(!config)return 0;
    const body=ready(config.body),wings=ready(config.wings);if(!body||!wings)return 0;
    const mobile=w<620,height=h*(mobile?config.mobileHeight:config.height),cycle=(time/42000+.07)%1;
    let travel;if(cycle<.43){const t=cycle/.43;travel=t*t*(3-2*t);}else if(cycle<.55)travel=1;else if(cycle<.94){const t=(cycle-.55)/.39;travel=1-t*t*(3-2*t);}else travel=0;
    const x=w*((mobile?.46:.43)+(mobile?.29:.34)*travel),y=h*(mobile?.17:.2)+Math.sin(cycle*Math.PI*2)*h*.02;
    const tilt=Math.sin(cycle*Math.PI*2)*.022,face=cycle<.55?1:-1,wingHeight=height*.98,wingWidth=wingHeight*wings.naturalWidth/wings.naturalHeight;
    const beat=Math.sin(time*Math.PI*2*17/1000),backX=height*.015,backY=-height*.12;
    context.save();context.translate(x,y);context.rotate(tilt);if(face<0)context.scale(-1,1);
    context.save();context.translate(backX,backY);context.rotate(beat*.13);context.scale(1,.75+.22*beat);
    context.drawImage(wings,-wingWidth*.5,-wingHeight*.63,wingWidth,wingHeight);context.restore();
    context.drawImage(body,-height/2,-height/2,height,height);context.restore();return 1;
  }
  function v3FlyersReady(){const groups=assets?.manifest?.menuFlyersV3||[];return groups.length>0&&groups.every(group=>ready(group.body)&&ready(group.wings));}
  function drawMenu(canvas,time){
    const {context,w,h}=fit(canvas),background=preferred(assets?.manifest?.menuBackground||['menuBgV6','menuBgV6Alt','menuBgV5','menuBgV4','menuBgV3','menuBgAnimationBase','menuBgMain']);
    setMenuBackdrop(canvas,background,w,h);context.clearRect(0,0,w,h);if(!background)fallback(context,w,h);
    if(background?.key==='menuBgV6'||background?.key==='menuBgV6Alt'){
      canvas.dataset.flyerMode='v6';drawV6Foreground(context,w,h,time);return drawV6Flyer(context,w,h,time);
    }
    if(background?.key==='menuBgV5'){
      canvas.dataset.flyerMode='v5';drawV5Foreground(context,w,h,time);return drawV5Flyer(context,w,h,time);
    }
    if(background?.key==='menuBgV4'){
      canvas.dataset.flyerMode='v4';battleFire(context,w,h,time);drawV4Foreground(context,w,h,time);return drawV4Flyer(context,w,h,time);
    }
    if(background)localCityLights(context,w,h,time);
    if(background?.key==='menuBgV3'){drawBanners(context,w,h,time);drawGround(context,w,h,time);}
    let visible=0;
    if(v3FlyersReady()){
      canvas.dataset.flyerMode='v3';for(const [index,group] of assets.manifest.menuFlyersV3.entries()){if(visible>=(w<620?2:3))break;if(drawV3Flyer(context,group,w,h,time,index))visible++;}
    }else{
      canvas.dataset.flyerMode='v2';for(const [index,key] of (assets?.manifest?.menuFlyers||[]).entries()){if(visible>=3)break;if(drawV2Flyer(context,key,w,h,time,index))visible++;}
    }
    return visible;
  }
  function introImage(step){
    const v6=assets?.manifest?.introSequenceV6?.[step],v5=assets?.manifest?.introSequenceV5?.[step],v4=assets?.manifest?.introSequenceV4?.[step],v3=assets?.manifest?.introSequenceV3?.[step],v2=assets?.manifest?.introSequence?.[step];return preferred([v6,v5,v4,v3,v2]);
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
      this.menu=menu;this.intro=intro;this.introStep=0;this.previousIntroStep=0;this.transitionAt=performance.now();this.raf=0;this.lastWingPass=performance.now();this.frame=this.frame.bind(this);this.refresh=this.refresh.bind(this);this.lastFrame=0;
      this.observer=new MutationObserver(this.refresh);if(document.body)this.observer.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
      document.addEventListener('visibilitychange',this.refresh);this.refresh();assets?.ready.then(this.refresh);
    }
    visible(element){return !!element&&element.offsetParent!==null;}
    refresh(){const active=!document.hidden&&(this.visible(this.menu)||this.visible(this.intro));if(active&&!this.raf)this.raf=requestAnimationFrame(this.frame);if(!active&&this.raf){cancelAnimationFrame(this.raf);this.raf=0;}}
    setIntroStep(value){this.previousIntroStep=this.introStep;this.introStep=value;this.transitionAt=performance.now();this.refresh();}
    frame(time){
      this.raf=0;if(this.lastFrame&&time-this.lastFrame<(root.innerWidth<620?30:17)){this.raf=requestAnimationFrame(this.frame);return;}this.lastFrame=time;let active=false;
      if(this.visible(this.menu)){const count=drawMenu(this.menu,time);active=true;if(count&&time-this.lastWingPass>22000){this.lastWingPass=time;root.dispatchEvent(new CustomEvent('ant:wingpass'));}}
      if(this.visible(this.intro)){drawIntro(this.intro,time,this.introStep,this.previousIntroStep,this.transitionAt);active=true;}
      if(active&&!document.hidden)this.raf=requestAnimationFrame(this.frame);
    }
    destroy(){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.observer?.disconnect();document.removeEventListener('visibilitychange',this.refresh);}
  }
  root.AntMenuArt=MenuArt;
})(window);
