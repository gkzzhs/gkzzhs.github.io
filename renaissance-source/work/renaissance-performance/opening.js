(()=>{
 const t=v=>window.RyanI18n?.t(v)??v,root=document.documentElement,canvas=document.querySelector('#scene'),gate=document.querySelector('#scene-gate'),status=document.querySelector('#gate-status'),step=document.querySelector('#gate-step'),bar=document.querySelector('#gate-progress');
 const controller=window.RyanStudioBoot?.controller??new AbortController();let done=false,last=0,timer;
 root.dataset.sceneState='loading';canvas.setAttribute('aria-busy','true');
 window.RyanSceneGate={signal:controller.signal,
  phase(n,text){if(done)return;step.textContent=String(n).padStart(2,'0')+' / 03';status.textContent=t(text);},
  progress(v){if(done)return;last=Math.max(last,v);bar.style.transform=`scaleX(${last})`;},
  async finish({flying=false,pending=false}={}){if(done)return;done=true;clearTimeout(timer);canvas.setAttribute('aria-busy','false');if(!flying)root.dataset.sceneState=pending?'standby':'ready';bar.style.transform='scaleX(1)';
   if(root.classList.contains('reduced-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches){gate.hidden=true;gate.dataset.state='closed';return;}
   const a=gate.animate([{opacity:1},{opacity:0}],{duration:160,easing:'linear'});await a.finished.catch(()=>{});gate.hidden=true;gate.dataset.state='closed';a.cancel();},
  fail(error){if(done)return;done=true;clearTimeout(timer);gate.hidden=true;gate.dataset.state='failed';root.dataset.sceneState='failed';canvas.setAttribute('aria-busy','false');canvas.dataset.failed='true';document.body.classList.add('scene-failed');
   // Deep links reserve the full scene height. If loading fails, collapse it
   // while preserving the work section's viewport position for visitors below it.
   if(root.classList.contains('studio-reserved')){
    const track=document.querySelector('.track'),work=document.querySelector('#work');
    const preserve=track&&work&&track.getBoundingClientRect().bottom<=0;
    const before=preserve?work.getBoundingClientRect().top:0;
    root.classList.remove('studio-reserved');
    if(preserve){const delta=work.getBoundingClientRect().top-before;if(Math.abs(delta)>.5)window.scrollBy(0,delta);}
   }
   const hint=document.querySelector('.loading');hint.hidden=false;hint.textContent=t('三维画面暂不可用，可以继续查看作品。');
   controller.abort(error);if(window.RyanStudioBoot)window.RyanStudioBoot.promise=null;console.warn('Studio fallback:',error?.message||error);window.RyanMotion?.request();}
 };
 // Loading is non-blocking. A slow connection can complete in the background;
 // users who have already entered the portfolio keep their scroll position.
 timer=setTimeout(()=>window.RyanSceneGate.fail(new Error('Scene startup timed out')),90000);
 // The complete portfolio and the poster are usable before WebGL is ready.
 if(location.protocol==='file:'||!window.WebAssembly||new URLSearchParams(location.search).get('scene')==='poster'){
  window.RyanSceneGate.fail(new Error('Poster mode'));return;
 }
 const script=document.createElement('script');script.src=window.RYAN_STUDIO_MANIFEST.runtime;script.onerror=()=>window.RyanSceneGate.fail(new Error('Scene runtime unavailable'));document.head.append(script);
})();
