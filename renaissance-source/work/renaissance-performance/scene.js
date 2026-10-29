import * as THREE from 'three';
import {browserQuality} from './quality.js';
import {MeshoptDecoder} from 'meshoptimizer/decoder';
import {installNightLighting} from './night-lighting.js';
import {sceneBuffer} from './scene-assets.js';
import {disposeSceneGraph} from './dispose-scene.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const FOLLOW_DURATION_MS=300,TAU=FOLLOW_DURATION_MS/Math.log(1000),track=document.querySelector('.track'),canvas=document.querySelector('#scene'),loading=document.querySelector('.loading'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search),forcedReduced=params.get('motion')==='reduce';
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=(a,b,n)=>{let t=clamp((n-a)/(b-a));return t*t*(3-2*t);},isReduced=()=>reduced.matches||forcedReduced;
const scene=new THREE.Scene();scene.background=new THREE.Color('#c2ccc9');
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.025,80);
const quality=window.RyanStudioBoot?.quality??browserQuality();canvas.dataset.quality=quality.name;
let pixelRatio=quality.ratio,sceneWidth=innerWidth,sceneHeight=innerHeight,renderCount=0,slowFrames=0;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:quality.mobile?'low-power':'high-performance'});
renderer.setPixelRatio(pixelRatio);renderer.setSize(sceneWidth,sceneHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=!quality.mobile;renderer.shadowMap.type=THREE.PCFShadowMap;
// Mobile uses one direct pass. Never allocate half-float multisample AO buffers.
let composer=null,contactAO=null;
if(quality.post&&renderer.extensions.has('EXT_color_buffer_float')){
 composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(sceneWidth,sceneHeight,{type:THREE.HalfFloatType,samples:0}));
 composer.addPass(new RenderPass(scene,camera));contactAO=new GTAOPass(scene,camera,sceneWidth,sceneHeight,undefined,{radius:.16,thickness:.20,scale:.65,samples:8},{radius:5,samples:8});contactAO.blendIntensity=.30;composer.addPass(contactAO);composer.addPass(new OutputPass());
}
canvas.dataset.postprocessing=composer?'gtao':'none';
const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment(),environmentTarget=pmrem.fromScene(environment,.05);scene.environment=environmentTarget.texture;scene.environmentIntensity=.12;environment.dispose();pmrem.dispose();
const ambient=new THREE.HemisphereLight('#e0e9e8','#8e7962',.18);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fff1d8',.85);sun.position.set(-3,5,4);sun.target.position.set(.6,1,-.5);sun.castShadow=!quality.mobile;sun.shadow.mapSize.set(quality.shadowSize||1,quality.shadowSize||1);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.2,far:24});sun.shadow.bias=-.00012;sun.shadow.normalBias=.0015;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight('#c5dcec',.35);fill.position.set(4,3,-4);scene.add(fill);
RectAreaLightUniformsLib.init();const softKey=new THREE.RectAreaLight('#ffe6c6',4,3.5,3.5);softKey.position.set(-2.7,3.25,3.4);softKey.lookAt(.6,1.30,-1.5);scene.add(softKey);const softReturn=new THREE.RectAreaLight('#c9dfff',1.2,2.3,2.3);softReturn.position.set(3.7,2.6,-1.5);softReturn.lookAt(1,1.3,-1);scene.add(softReturn);
const keys=__CAMERA_PATH__.map(k=>({...k,position:new THREE.Vector3(k.position[0],k.position[2],-k.position[1]),target:new THREE.Vector3(k.target[0],k.target[2],-k.target[1])}));
const displayGeometry=__SCREEN_GEOMETRY__;
const screenCorners=__SCREEN_CORNERS__.map(v=>new THREE.Vector3(v[0],v[2],-v[1]));
let cameraLens,warming=false,nightLighting,reportMesh,model,ready=false,activated=false,disposed=false,raf=0,last=0,lastInput=0,rendered=scrollY,target=scrollY,px=0,py=0,tx=0,ty=0,travel=1;
// One camera, one world: a short dolly settles into the first scroll key.
// Offsets stay inside the studio, rather than flying through the window wall.
const entry={active:false,factor:0,light:1,start:0,release:null,duration:1650,samples:[],sampleAt:0};
const entryOffset=new THREE.Vector3();
function endEntry(){entry.active=false;entry.factor=0;entry.light=1;entry.release=null;canvas.dataset.entry='complete';canvas.dataset.entryElapsed=String(Math.round(performance.now()-entry.start));document.documentElement.dataset.sceneState='ready';}
function updateEntry(now){
 if(!entry.active)return;
 if(isReduced()){endEntry();return;}
 if(!entry.start)return;
 const t=clamp((now-entry.start)/entry.duration);
 entry.factor=Math.pow(1-t,3);entry.light=1;
 if(entry.release){const r=clamp((now-entry.release.start)/240),e=Math.pow(1-r,3);entry.factor=entry.release.factor*e;entry.light=1-(1-entry.release.light)*e;if(r===1)endEntry();}
 else if(t===1)endEntry();
 canvas.dataset.entryFactor=entry.factor.toFixed(6);
 document.documentElement.style.setProperty('--entry-reveal',String(smooth(.92,.08,entry.factor)));
}
function releaseEntry(){if(entry.active&&!entry.release&&entry.start){entry.release={start:performance.now(),factor:entry.factor,light:entry.light};canvas.dataset.entry='handoff';}}
const aim=new THREE.Vector3(),hero=document.querySelector('.hero-copy'),note=document.querySelector('.scene-note'),phase=document.querySelector('#phase'),phaseLine=document.querySelector('#phase-line'),heading=document.querySelector('.takeover-heading'),foot=document.querySelector('.takeover-foot'),sample=document.querySelector('.sample-label'),reportStage=document.querySelector('#report-stage'),reportPlane=document.querySelector('#report-plane'),wash=document.querySelector('.stage-wash'),sceneFoot=document.querySelector('.scene-foot');
function matrixForQuad(q,w,h){const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;if(Math.abs(den)<1e-8)return null;const g=(dx3*dy2-dx2*dy3)/den,k=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+k*x3,d=y1-y0+g*y1,e=y3-y0+k*y3;return `matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${k/h},0,0,1,0,${x0},${y0},0,1)`;}
function screenMask(t){
 const f=1-smooth(0,.22,t),w=1000,h=650,g=displayGeometry,rx=g.radius/g.width*w,ry=g.radius/g.height*h,nw=g.notchWidth/g.width*w*f,nh=g.notchHeight/g.height*h*f,nr=g.notchRadius/g.width*w*f,left=(w-nw)/2,right=(w+nw)/2;
 reportPlane.style.clipPath=`path("M ${rx} 0 H ${left} V ${nh-nr} Q ${left} ${nh} ${left+nr} ${nh} H ${right-nr} Q ${right} ${nh} ${right} ${nh-nr} V 0 H ${w-rx} Q ${w} 0 ${w} ${ry} V ${h-ry} Q ${w} ${h} ${w-rx} ${h} H ${rx} Q 0 ${h} 0 ${h-ry} V ${ry} Q 0 0 ${rx} 0 Z")`;
 canvas.dataset.notch=f.toFixed(6);
}
function setCamera(q){let i=0;while(i<keys.length-2&&q>keys[i+1].q)i++;const a=keys[i],b=keys[i+1],t=smooth(0,1,(q-a.q)/(b.q-a.q));camera.position.lerpVectors(a.position,b.position,t);aim.lerpVectors(a.target,b.target,t);if(innerWidth<700){const hold=1-smooth(.30,.62,q);camera.position.lerp(new THREE.Vector3(1.15,1.78,3.65),hold);aim.lerp(new THREE.Vector3(.78,1.05,-.68),hold);}entryOffset.set(innerWidth<700?-.15:-.85,innerWidth<700?.22:.42,innerWidth<700?.65:.95);camera.position.addScaledVector(entryOffset,entry.factor);camera.position.x+=px*.035*(1-entry.factor);camera.position.y+=py*.018*(1-entry.factor);camera.lookAt(aim);const lens=THREE.MathUtils.lerp(a.lens,b.lens,t)-5*entry.factor;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan((innerWidth<700?THREE.MathUtils.lerp(22.5,36/camera.aspect,smooth(.45,.80,q)):36/camera.aspect)/(2*lens)));camera.updateProjectionMatrix();camera.updateMatrixWorld();}
const t=value=>window.RyanI18n?.t(value)??value;
function paint(){if(!ready)return;if(!warming&&rendered>=travel+innerHeight){canvas.dataset.visible='false';return;}canvas.dataset.visible='true';const q=clamp(rendered/travel),qCamera=isReduced()?0:q;setCamera(qCamera);const takeover=isReduced()?(q>=.89?1:0):smooth(.88,1,q),project=takeover>.001;
 hero.style.opacity=activated?1-smooth(.015,.17,q):1;hero.setAttribute('aria-hidden',activated&&q>.17?'true':'false');note.setAttribute('aria-hidden',q<.14||q>.84?'true':'false');heading.setAttribute('aria-hidden',q<.90?'true':'false');note.style.opacity=smooth(.14,.25,q)*(1-smooth(.73,.84,q));phase.textContent=t(q<.38?'02 / 工作室':q<.75?'03 / 工作台':'04 / 我的桌面');phaseLine.textContent=t(q<.38?'从灵感，走向工作台。':q<.75?'我在这里，把想法做出来。':'从这里，进入我的作品。');
 wash.style.opacity=isReduced()?takeover:smooth(.88,.995,q);heading.style.opacity=isReduced()?takeover:smooth(.90,.98,q);sceneFoot.style.opacity=1-smooth(.80,.87,q);sample.style.opacity=smooth(.80,.90,q);foot.style.opacity=smooth(.94,1,q);foot.style.visibility=q>.97?'visible':'hidden';
 if(reportMesh)reportMesh.visible=!project;if(cameraLens)cameraLens.visible=!project;
 reportStage.style.opacity=project?'1':'0';
 if(project){screenMask(takeover);const original=screenCorners.map(v=>{const t=v.clone().project(camera);return [(t.x*.5+.5)*sceneWidth,(-t.y*.5+.5)*sceneHeight];});const dw=Math.min(innerWidth*.84,innerHeight*.58/.65),dh=dw*.65,dx=(innerWidth-dw)/2,dy=innerWidth<700?innerHeight*.38:innerHeight*.28;const dest=[[dx,dy],[dx+dw,dy],[dx+dw,dy+dh],[dx,dy+dh]];const qd=original.map((v,i)=>[THREE.MathUtils.lerp(v[0],dest[i][0],takeover),THREE.MathUtils.lerp(v[1],dest[i][1],takeover)]);const m=matrixForQuad(qd,1000,650);if(m)reportPlane.style.transform=m;}
 if(entry.active&&entry.start&&performance.now()-entry.sampleAt>100){entry.sampleAt=performance.now();entry.samples.push({ms:Math.round(entry.sampleAt-entry.start),factor:+entry.factor.toFixed(4),camera:camera.position.toArray().map(v=>+v.toFixed(4))});canvas.dataset.entryTrace=JSON.stringify(entry.samples);}
 renderer.toneMappingExposure=1.05*entry.light;renderer.info.reset();if(composer)composer.render();else renderer.render(scene,camera);canvas.dataset.renders=String(++renderCount);canvas.dataset.progress=q.toFixed(7);canvas.dataset.camera=camera.position.toArray().map(v=>v.toFixed(5)).join(',');canvas.dataset.target=aim.toArray().map(v=>v.toFixed(5)).join(',');canvas.dataset.takeover=takeover.toFixed(7);canvas.dataset.mode=isReduced()?'reduced':'continuous-3d';canvas.dataset.lighting=nightLighting?.value.toFixed(4)??'0';canvas.dataset.screen='personal-desktop';canvas.dataset.drawCalls=renderer.info.render.calls;canvas.dataset.triangles=renderer.info.render.triangles;canvas.dataset.pixelRatio=renderer.getPixelRatio().toFixed(3);canvas.dataset.renderSize=sceneWidth+'x'+sceneHeight;canvas.dataset.shadowSize=String(quality.shadowSize);
}
function tick(now){if(!ready||!activated){last=0;return false;}raf=0;target=scrollY;if(!entry.active&&target>=travel+innerHeight){rendered=target;last=0;canvas.dataset.visible='false';return false;}const dt=last?Math.min(80,now-last):16;last=now;if(quality.mobile&&!entry.active&&renderCount>120){slowFrames=dt>30?slowFrames+1:Math.max(0,slowFrames-1);if(slowFrames>=12&&pixelRatio>.72){pixelRatio=Math.max(.70,pixelRatio*.85);slowFrames=0;resize();canvas.dataset.adaptive='reduced-resolution';}}updateEntry(now);if(!entry.active)nightLighting?.begin();const themeMoving=nightLighting?.update(dt,isReduced())??false;if(isReduced()){rendered=target;px=py=0;}else if(window.RyanMotion){rendered=target;px+=(tx-px)*(1-Math.exp(-dt/100));py+=(ty-py)*(1-Math.exp(-dt/100));}else{rendered+=(target-rendered)*(1-Math.exp(-dt/TAU));px+=(tx-px)*(1-Math.exp(-dt/100));py+=(ty-py)*(1-Math.exp(-dt/100));if(Math.abs(target-rendered)<.03||now-lastInput>=FOLLOW_DURATION_MS)rendered=target;}paint();canvas.dataset.settled=String(ready&&!entry.active&&Math.abs(target-rendered)<.03&&(isReduced()||window.RyanMotion.settled&&Math.abs(tx-px)+Math.abs(ty-py)<.001));const moving=!isReduced()&&(themeMoving||entry.active||Math.abs(target-rendered)>.03||Math.abs(tx-px)+Math.abs(ty-py)>.001||!window.RyanMotion.settled);if(!moving)last=0;return moving;}
function request(){window.RyanMotion.request();}
window.RyanMotion.addFrame(tick);
let resizeTimer=0;
function resize(){
 travel=Math.max(1,track.offsetHeight-innerHeight);
 const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
 const desired=Math.min(pixelRatio,Math.sqrt((quality.mobile?1150000:3200000)/(w*h)));
 if(w!==sceneWidth||h!==sceneHeight||Math.abs(desired-renderer.getPixelRatio())>.01){
  sceneWidth=w;sceneHeight=h;camera.aspect=w/h;camera.updateProjectionMatrix();
  if(Math.abs(desired-renderer.getPixelRatio())>.01)renderer.setPixelRatio(desired);
  renderer.setSize(w,h,false);
  if(composer){composer.setPixelRatio(Math.min(desired,1));composer.setSize(w,h);contactAO.setSize(Math.round(w*.55),Math.round(h*.55));}
  canvas.dataset.resizes=String(Number(canvas.dataset.resizes||0)+1);
 }
 target=scrollY;rendered=target;request();
}
function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);}
const gate=window.RyanSceneGate,manifest=window.RYAN_STUDIO_MANIFEST.models[quality.name];
function activateStudio(){
 if(!ready||activated||(scrollY>1&&!window.RyanStudioBoot?.sceneLink))return;
 activated=true;document.documentElement.classList.remove('studio-poster');
 resize();entry.active=!isReduced()&&(!location.hash||location.hash==='#top');
 entry.factor=entry.active?1:0;entry.light=1;entry.start=performance.now();
 canvas.dataset.entry=entry.active?'flying':'skipped';canvas.dataset.pending='false';
 document.documentElement.dataset.sceneState=entry.active?'entering':'ready';
 paint();request();
}
async function openStudio(){
 const boot=window.RyanStudioBoot,clock=boot?.startedAt??performance.now(),runtimeAt=performance.now();
 const buffer=await sceneBuffer(manifest,gate,canvas);const decodedAt=performance.now();gate.phase(2,'正在准备材质');gate.progress(.80);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);const gltf=await loader.parseAsync(buffer,'');const parsedAt=performance.now();
 if(disposed||gate.signal.aborted){disposeSceneGraph(gltf.scene);return;}
 model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.envMapIntensity=o.material.userData.static_diffuse_baked?.04:o.material.name==='MacBook Pro satin aluminium'?.85:o.material.metalness>.3?.8:.3;if(o.material.name==='MacBook Pro satin aluminium'){o.material.envMap=scene.environment;o.material.envMapIntensity=.85;}if(o.material.aoMap)o.material.aoMapIntensity=.8;}if(o.name==='Laptop_camera_lens'||o.name==='Laptop camera lens'){cameraLens=o;o.castShadow=false;}if(o.name==='Actual_sample_report'||o.name==='Actual sample report'){reportMesh=o;o.castShadow=false;}}});scene.add(model);nightLighting=installNightLighting(model,scene,[ambient,sun,fill,softKey,softReturn],quality);gate.signal.throwIfAborted();
 gate.phase(3,'正在点亮工作室');gate.progress(.94);loading.hidden=true;
 canvas.dataset.engine='three-webgl';canvas.dataset.reportFound=String(Boolean(reportMesh));canvas.dataset.meshes=String(model.getObjectsByProperty('type','Mesh').length);
 resize();setCamera(0);
 await Promise.race([renderer.compileAsync(scene,camera),new Promise((_,reject)=>gate.signal.addEventListener('abort',()=>reject(gate.signal.reason),{once:true}))]);
 gate.signal.throwIfAborted();
 // Warm the renderer without touching the readable poster or expanding the
 // document. Scroll position stays unchanged if the visitor has moved on.
 if(composer)composer.render();else renderer.render(scene,camera);
 renderer.shadowMap.autoUpdate=false;await new Promise(requestAnimationFrame);gate.signal.throwIfAborted();
 if(composer)composer.render();else renderer.render(scene,camera);
 ready=true;canvas.dataset.shadows='static';canvas.dataset.pending='true';
 canvas.dataset.startup=JSON.stringify({cache:canvas.dataset.cache,source:canvas.dataset.assetSource??'origin',runtimeMs:Math.round(runtimeAt-clock),assetMs:Math.round((boot?.downloadedAt??decodedAt)-clock),parseMs:Math.round(parsedAt-decodedAt),warmupMs:Math.round(performance.now()-parsedAt),totalMs:Math.round(performance.now()-clock)});
 activateStudio();await gate.finish({flying:entry.active,pending:!activated});
 if(disposed)return;canvas.dataset.visibleMs=String(Math.round(performance.now()-clock));request();
}
openStudio().catch(error=>{gate.fail(error);fail('三维画面未能载入，仍可查看下方作品。');});
function fail(text){
 if(disposed)return;disposed=true;ready=false;cancelAnimationFrame(raf);raf=0;clearTimeout(resizeTimer);
 nightLighting?.dispose();disposeSceneGraph(model,{excludeTextures:new Set([scene.environment])});
 if(model)scene.remove(model);model=undefined;reportMesh=undefined;cameraLens=undefined;
 scene.environment=null;environmentTarget.dispose();
 for(const pass of composer?.passes??[])pass.dispose?.();composer?.dispose();renderer.dispose();
 document.body.classList.add('scene-failed');loading.hidden=false;loading.textContent=text;canvas.dataset.failed='true';window.RyanSceneGate?.fail(new Error(text));
}
addEventListener('scroll',()=>{if(ready&&!activated&&scrollY<=1)activateStudio();target=scrollY;lastInput=performance.now();releaseEntry();if(target===0)rendered=0;request();},{passive:true});addEventListener('resize',scheduleResize);reduced.addEventListener('change',()=>{if(entry.active&&isReduced())endEntry();rendered=target;px=py=tx=ty=0;request();});
const fine=matchMedia('(pointer:fine)'),glove=document.querySelector('#glove');function pointerMode(){document.documentElement.classList.toggle('fine-pointer',fine.matches);}fine.addEventListener('change',pointerMode);pointerMode();
addEventListener('pointermove',e=>{if(fine.matches){glove.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;if(!isReduced()){tx=e.clientX/innerWidth*2-1;ty=1-e.clientY/innerHeight*2;request();}}},{passive:true});addEventListener('pointerover',e=>{glove.classList.toggle('is-hot',Boolean(e.target.closest('a,button')));},{passive:true});addEventListener('pointerout',e=>{if(!e.relatedTarget){tx=ty=0;glove.style.transform='translate(-100px,-100px)';request();}},{passive:true});
gate.signal.addEventListener('abort',()=>{if(!ready)fail('三维画面暂不可用，项目内容仍可阅读。');},{once:true});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('三维画面暂不可用，项目内容仍可阅读。');});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else{rendered=target;request();}});
const dialog=document.querySelector('#report-dialog');document.querySelector('#open-report')?.addEventListener('click',()=>dialog.showModal());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});document.fonts.ready.then(resize);resize();
