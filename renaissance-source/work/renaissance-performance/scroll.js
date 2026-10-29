import Lenis from 'lenis';
// One frame clock: scroll first, then every visual reads the same document position.
const root=document.documentElement,media=matchMedia('(prefers-reduced-motion: reduce)'),forced=new URLSearchParams(location.search).get('motion')==='reduce';
const bar=document.querySelector('#page-scrollbar'),thumb=bar.querySelector('.scroll-thumb'),frames=new Set();
let lenis=null,raf=0,lastWheel=0,max=1,thumbHeight=44,room=1,drag=null,lastY=scrollY,ticking=false,dirty=false,lastFrame=0,trace=[],traceStart=0,motionY=scrollY,visualVelocity=0,ignoreMotion=false;
const debug=new URLSearchParams(location.search).get('debug')==='motion';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),off=()=>media.matches||forced;
function request(){if(ticking){dirty=true;return;}if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
function measure(){max=Math.max(0,document.documentElement.scrollHeight-innerHeight);thumbHeight=Math.max(44,bar.clientHeight*innerHeight/(max+innerHeight));room=Math.max(1,bar.clientHeight-thumbHeight);thumb.style.height=thumbHeight+'px';bar.hidden=max===0;lenis?.resize();request();}
function draw(){const y=clamp(scrollY,0,max),p=max?y/max:0;thumb.style.transform=`translate3d(0,${p*room}px,0)`;bar.setAttribute('aria-valuenow',String(Math.round(p*100)));bar.setAttribute('aria-valuetext',`${Math.round(p*100)}%`);root.dataset.scrollPosition=y.toFixed(3);lastY=y;}
function frame(now){raf=0;ticking=true;dirty=false;const motionDt=lastFrame&&now-lastFrame<100?Math.max(8,now-lastFrame):16.67;if(lenis&&(!lastFrame||now-lastFrame>100))lenis.time=now-16.67;lastFrame=now;lenis?.raf(now);
 // Finite settling, without restarting an easing curve for each wheel event.
 if(lenis?.isScrolling==='smooth'&&now-lastWheel>=300){const goal=lenis.targetScroll;lenis.reset();lenis.scrollTo(goal,{immediate:true});}
 // Measure the authoritative document displacement, including native touch,
 // momentum, keyboard and the custom thumb. Do not depend on wheel-only state.
 const deltaY=scrollY-motionY;visualVelocity=ignoreMotion||off()||Math.abs(deltaY)>innerHeight*.7?0:deltaY*16.67/motionDt;motionY=scrollY;ignoreMotion=false;root.dataset.motionVelocity=visualVelocity.toFixed(4);
 let active=lenis?.isScrolling==='smooth';draw();for(const f of frames)active=Boolean(f(now))||active;const wasSettled=root.dataset.scrollSettled;root.dataset.scrollSettled=String(lenis?.isScrolling!=='smooth');if(lastWheel&&wasSettled!=='true'&&root.dataset.scrollSettled==='true')bar.dataset.settleMs=String(Math.round(now-lastWheel));root.dataset.scrollTarget=(lenis?.targetScroll??scrollY).toFixed(3);if(debug&&traceStart&&now-traceStart<650){trace.push({ms:Math.max(0,Math.round(now-traceStart)),y:scrollY,target:+(lenis?.targetScroll??scrollY).toFixed(3),q:+(document.querySelector('#scene').dataset.progress??0)});if(trace.length>48)trace.shift();bar.dataset.trace=JSON.stringify(trace);}ticking=false;if(active||dirty)request();}
function jump(y){ignoreMotion=true;const goal=clamp(y,0,max);if(lenis){lenis.reset();lenis.scrollTo(goal,{immediate:true});}else scrollTo({top:goal,behavior:'instant'});request();}
function configure(){lenis?.destroy();lenis=null;if(!off()&&!matchMedia('(pointer:coarse)').matches&&navigator.maxTouchPoints<2)lenis=new Lenis({autoRaf:false,smoothWheel:true,syncTouch:false,lerp:.32,anchors:false,stopInertiaOnNavigate:true,prevent:node=>node instanceof Element&&Boolean(node.closest('dialog,[data-lenis-prevent]')),virtualScroll:({event})=>!event.ctrlKey&&!event.metaKey});
 lenis?.on('scroll',request);root.dataset.scrollMode=off()?'native-reduced':lenis?'smooth-wheel':'native-touch';request();}
window.RyanMotion={addFrame(fn){frames.add(fn);request();return()=>frames.delete(fn);},request,get settled(){return lenis?.isScrolling!=='smooth';},get velocity(){return visualVelocity;},get y(){return scrollY;},jump};
bar.addEventListener('pointerdown',e=>{if(e.button!==0||document.querySelector('dialog[open]'))return;const r=bar.getBoundingClientRect(),tr=thumb.getBoundingClientRect();drag={id:e.pointerId,offset:e.target===thumb?e.clientY-tr.top:thumbHeight/2};bar.setPointerCapture(e.pointerId);bar.focus({preventScroll:true});bar.dataset.dragging='true';jump((e.clientY-r.top-drag.offset)/room*max);e.preventDefault();});
bar.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)jump((e.clientY-bar.getBoundingClientRect().top-drag.offset)/room*max);});
function release(e){if(drag?.id!==e.pointerId)return;drag=null;bar.dataset.dragging='false';if(bar.hasPointerCapture(e.pointerId))bar.releasePointerCapture(e.pointerId);}
bar.addEventListener('pointerup',release);bar.addEventListener('pointercancel',release);bar.addEventListener('lostpointercapture',()=>{drag=null;bar.dataset.dragging='false';});
bar.addEventListener('keydown',e=>{const page=innerHeight*.9,steps={ArrowDown:48,ArrowUp:-48,PageDown:page,PageUp:-page};let goal;if(e.key==='Home')goal=0;else if(e.key==='End')goal=max;else if(e.key in steps)goal=scrollY+steps[e.key];else return;e.preventDefault();jump(goal);});
// Native anchors, keyboard, touch, focus and find-in-page remain authoritative.
addEventListener('wheel',()=>{const now=performance.now();if(debug&&now-lastWheel>400){trace=[];traceStart=now;}lastWheel=now;request();},{passive:true,capture:true});
addEventListener('scroll',request,{passive:true});
addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!e.target.closest('input,textarea,select,[contenteditable]')){lenis?.reset();request();}},{capture:true});
addEventListener('touchstart',()=>{lenis?.reset();request();},{passive:true});
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a){ignoreMotion=true;lenis?.reset();request();}},{capture:true});
addEventListener('hashchange',()=>{ignoreMotion=true;lenis?.reset();request();});addEventListener('pageshow',()=>{lenis?.reset();measure();});
media.addEventListener('change',configure);addEventListener('resize',measure);new ResizeObserver(measure).observe(document.body);document.fonts.ready.then(measure);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{lenis?.reset();request();}});
configure();measure();root.classList.add('custom-scrollbar-ready');
