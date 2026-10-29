// Existing portfolio content and animations, independent of the 3D scene loader.
(()=>{
 const t=value=>window.RyanI18n?.t(value)??value;
 const reduced=()=>document.documentElement.classList.contains('reduced-motion'),clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),smooth=(a,b,v)=>{const q=clamp((v-a)/(b-a));return q*q*(3-2*q);};
 const middle=window.createMiddleFlow({isReduced:reduced});
 const ending=window.createEnding?.({isReduced:reduced}),header=document.querySelector('header'),wall=document.querySelector('#tools'),rows=[...document.querySelectorAll('.brand-row')];
 const items=[...document.querySelectorAll('.work-item')].map((el,i)=>({el,i,top:0,left:0,height:1,x:0,y:0,activity:0,tx:0,ty:0,hot:false}));
 let flight=null,raf=0,last=0,y=scrollY,phase=0,hover=false,focus=false,flightMotion=0,wallTop=0,wallHeight=1,trackHeight=1,periods=[],measureTimer=0;
 function measure(){const r=wall.getBoundingClientRect();wallTop=r.top+scrollY;wallHeight=r.height;trackHeight=document.querySelector('.track').offsetHeight;periods=rows.map(row=>row.querySelector('.brand-group').offsetWidth||1);middle.measure();items.forEach(it=>{const r=it.el.querySelector('.work-cover').getBoundingClientRect();it.top=r.top+scrollY;it.left=r.left;it.height=r.height;});ending?.measure();flight?.resize();request();}
 function request(){window.RyanMotion.request();}
 function tick(now){raf=0;const dt=last?Math.min(80,now-last):16;last=now;const off=reduced();const a=1-Math.exp(-dt/43.43);y=off||window.RyanMotion?scrollY:y+(scrollY-y)*a;if(Math.abs(y-scrollY)<.03)y=scrollY;
 let moving=Math.abs(y-scrollY)>.03;
 items.forEach(it=>{for(const [r,t] of [['x','tx'],['y','ty']]){it[r]+=(it[t]-it[r])*(1-Math.exp(-dt/95));if(Math.abs(it[t]-it[r])>.001)moving=true;}it.activity+=((it.hot?1:0)-it.activity)*a;const screen=it.top-y,r=off?1:smooth(innerHeight*.99,innerHeight*.10,screen),through=clamp((innerHeight-screen)/(innerHeight+it.height));it.el.style.setProperty('--reveal',r);it.el.style.setProperty('--entry-y',(off?0:(1-r)*(it.i%2?88:54))+'px');it.el.style.setProperty('--media-y',(off?0:(through-.5)*66)+'px');it.el.style.setProperty('--pointer-x',off?0:it.x);it.el.style.setProperty('--pointer-y',off?0:it.y);it.el.style.setProperty('--activity',off?0:it.activity);});
 // One velocity follower for the entire row. At rest every plane returns to its
 // measured rectangle; viewport position never leaves a permanent skew.
 // Restore the earlier portfolio's sensitivity: short phone viewports must not
 // amplify the same scroll displacement into a much larger card deformation.
 const impulse=off?0:clamp(window.RyanMotion.velocity/45,-1,1);
 flightMotion=off?0:flightMotion+(impulse-flightMotion)*(1-Math.exp(-dt/65));
 if(Math.abs(flightMotion-impulse)<.001)flightMotion=impulse;else moving=true;
 flight?.draw(items,scrollY,flightMotion,off);
 const r={top:wallTop-y,bottom:wallTop+wallHeight-y},visible=r.top<innerHeight&&r.bottom>0,animate=visible&&!off&&!hover&&!focus;if(animate){phase+=dt*.022;moving=true;}
 rows.forEach((row,i)=>{const period=periods[i]||1,p=((phase+(y-wallTop)*.11+i*170)%period+period)%period;row.querySelector('.brand-track').style.transform=`translate3d(${off?0:i===0?-p:p-period}px,0,0)`;});wall.dataset.paused=String(!animate);ending?.update(y,off);middle.update(y);
 header.classList.toggle('on-tools',r.top<=70&&r.bottom>70);header.classList.toggle('dark',true);header.classList.toggle('on-scene',scrollY<trackHeight-innerHeight*.10);
 if(!moving||off)last=0;return moving&&!off;
 }
 wall.addEventListener('pointerenter',()=>{hover=true;request();});wall.addEventListener('pointerleave',()=>{hover=false;request();});wall.addEventListener('focusin',()=>{focus=true;request();});wall.addEventListener('focusout',e=>{if(!wall.contains(e.relatedTarget)){focus=false;request();}});
 items.forEach(it=>{it.el.addEventListener('pointerenter',()=>{it.hot=true;request();});it.el.addEventListener('pointermove',e=>{const r=it.el.getBoundingClientRect();it.tx=clamp((e.clientX-r.left)/r.width*2-1,-1,1);it.ty=clamp((e.clientY-r.top)/r.height*2-1,-1,1);request();},{passive:true});it.el.addEventListener('pointerleave',()=>{it.hot=false;it.tx=it.ty=0;request();});});
 addEventListener('scroll',request,{passive:true});addEventListener('resize',()=>{clearTimeout(measureTimer);measureTimer=setTimeout(measure,120);},{passive:true});const layoutObserver=new ResizeObserver(measure);layoutObserver.observe(document.querySelector('.portfolio-body'));layoutObserver.observe(document.querySelector('.track'));new MutationObserver(request).observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme']});document.fonts.ready.then(measure);document.addEventListener('visibilitychange',()=>{if(!document.hidden)request();});
 window.RyanMotion.addFrame(tick);
 const observer=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting)||reduced()||flight)return;
  observer.disconnect();window.createProjectFlight?.(document.querySelector('#project-flight'),items.map(it=>it.el)).then(r=>{flight=r;measure();}).catch(console.warn);
 },{rootMargin:'500px'});observer.observe(document.querySelector('#work'));measure();
})();
