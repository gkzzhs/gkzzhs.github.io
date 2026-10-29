(() => {
 const t=value=>window.RyanI18n?.t(value)??value;
 const root=document.documentElement,menu=document.querySelector('#menu-dialog'),opener=document.querySelector('#menu-open');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),systemDark=matchMedia('(prefers-color-scheme: dark)');
 const forcedReduced=new URLSearchParams(location.search).get('motion')==='reduce';
 const motionStyle=document.createElement('style');motionStyle.dataset.motionOverride='true';document.head.append(motionStyle);
 const syncMotion=()=>{const off=reduced.matches||forcedReduced;root.classList.toggle('reduced-motion',off);motionStyle.textContent=off?'@view-transition{navigation:none}::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}':'';};syncMotion();reduced.addEventListener('change',syncMotion);
 let theme='auto';try{theme=localStorage.getItem('ryan-atelier-theme')||'auto';}catch{}
 if(!['auto','light','dark'].includes(theme))theme='auto';
 function syncTheme(){root.dataset.theme=theme==='auto'?(systemDark.matches?'dark':'light'):theme;root.dataset.themeChoice=theme;document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme)));}
 document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>{theme=b.dataset.themeChoice;try{localStorage.setItem('ryan-atelier-theme',theme);}catch{}syncTheme();}));systemDark.addEventListener('change',syncTheme);syncTheme();
 opener?.addEventListener('click',()=>menu.showModal());
 menu?.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>menu.close()));
 const glove=document.querySelector('#glove'),fine=matchMedia('(pointer:fine)');
 const cursorMode=()=>root.classList.toggle('fine-pointer',fine.matches);cursorMode();fine.addEventListener('change',cursorMode);
 addEventListener('pointermove',e=>{if(!fine.matches)return;glove.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;glove.classList.toggle('is-hot',Boolean(e.target.closest('a,button,summary')));},{passive:true});
 addEventListener('pointerout',e=>{if(!e.relatedTarget)glove.style.transform='translate(-100px,-100px)';},{passive:true});
 // Cross-document navigation stays native. Back/forward, modifier clicks,
 // keyboard activation, copying URLs, and file opening all keep normal behavior.
 document.querySelector('#report-open')?.addEventListener('click',()=>document.querySelector('#report-dialog').showModal());
 const demo=document.querySelector('#demo-toggle'),demoImage=document.querySelector('#demo-image');
 if(demo)demo.addEventListener('click',()=>{const playing=demo.getAttribute('aria-pressed')==='true';demo.setAttribute('aria-pressed',String(!playing));demoImage.src=playing?demoImage.dataset.poster:demoImage.dataset.animation;demo.textContent=t(playing?'播放工作流演示 ↗':'停止演示 ×');});
 const closeDemo=()=>{if(demo&&demo.getAttribute('aria-pressed')==='true')demo.click();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)closeDemo();});reduced.addEventListener('change',()=>{if(reduced.matches)closeDemo();});
})();
