// Deterministic chapter choreography. All progress comes from the shared scroll
// coordinate, so stopping, reversing, anchors and re-entry need no animation reset.
window.createMiddleFlow=({isReduced})=>{
 const root=document.documentElement,selectors=['#work','#manifesto','#evidence','#method','#tools','#timeline','#about'];
 const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
 const chapters=selectors.map(id=>({el:document.querySelector(id),top:0,height:1}));
 const lines=[],reveals=[];
 document.querySelectorAll('#manifesto-title,#evidence-title,#method-title,#tools-title,#timeline-title,#about-title').forEach(h=>{
  // Authored heading content is moved, not duplicated, preserving accessible text.
  const groups=[[]];for(const node of [...h.childNodes]){if(node.nodeName==='BR')groups.push([]);else groups.at(-1).push(node);}
  h.replaceChildren();groups.forEach((nodes,i)=>{const mask=document.createElement('span'),ink=document.createElement('span');mask.className='chapter-line';ink.className='chapter-ink';ink.append(...nodes);mask.append(ink);h.append(mask);lines.push({el:mask,top:0,index:i});});
 });
 for(const {el} of chapters){el.classList.add('cinema-chapter');const seam=document.createElement('span');seam.className='chapter-seam';seam.setAttribute('aria-hidden','true');el.prepend(seam);}
 const targets=[...document.querySelectorAll('.claim-pair,.evidence-item,.evidence-disclosure,.method-bottom>p,.timeline-layout li,.about-right figure,.about-copy>.degree,.about-copy>p:not(.degree),.about-copy dl>div')];
 targets.forEach((el,i)=>{el.classList.add('cinema-item');reveals.push({el,top:0,index:i});});
 function measure(){root.classList.add('cinema-measuring');root.classList.remove('cinema-ready');chapters.forEach(c=>{const r=c.el.getBoundingClientRect();c.top=r.top+scrollY;c.height=r.height;});for(const item of [...lines,...reveals])item.top=item.el.getBoundingClientRect().top+scrollY;root.classList.remove('cinema-measuring');root.classList.add('cinema-ready');}
 function put(el,name,value){const text=value.toFixed(5);if(el.style.getPropertyValue(name)!==text)el.style.setProperty(name,text);}
 function update(y){const off=isReduced(),vh=innerHeight;
  chapters.forEach(c=>{const top=c.top-y,enter=off?1:smooth((vh*1.06-top)/(vh*.94)),exit=off?0:smooth((-top-c.height+vh*.34)/(vh*.65));put(c.el,'--chapter-enter',enter);put(c.el,'--chapter-exit',exit);if(c.el.dataset.chapterProgress!==enter.toFixed(5))c.el.dataset.chapterProgress=enter.toFixed(5);});
  for(const line of lines){const p=off?1:smooth((vh*.94-(line.top-y))/(vh*.54));put(line.el,'--line-reveal',p);}
  for(const item of reveals){const p=off?1:smooth((vh*.97-(item.top-y))/(vh*.45));put(item.el,'--item-reveal',p);if(item.el.dataset.reveal!==p.toFixed(5))item.el.dataset.reveal=p.toFixed(5);}
 }
 return {measure,update};
};
