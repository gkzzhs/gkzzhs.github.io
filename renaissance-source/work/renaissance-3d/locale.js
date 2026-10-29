(()=>{
 const dict=__LOCALE__,english=new URLSearchParams(location.search).get('lang')==='en',root=document.documentElement;
 root.lang=english?'en':'zh-CN';root.dataset.language=english?'en':'zh';
 const t=value=>english?(dict[value]??value):value;
 window.RyanI18n={english,t};
 if(english){
  const walk=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('script,style')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);
  nodes.forEach(n=>{const key=n.textContent.trim();if(dict[key])n.textContent=n.textContent.replace(key,dict[key]);});
  document.querySelectorAll('*').forEach(el=>{for(const name of ['aria-label','alt','title','data-letter-line'])if(el.hasAttribute(name))el.setAttribute(name,t(el.getAttribute(name)));});
  const meta=document.querySelector('meta[name=description]');if(meta)meta.content='Ryan Wang. Software engineering undergraduate, class of 2027. AI products, automation and selected project records.';
 }
 for(const link of document.querySelectorAll('a[href]')){
  if(link.hasAttribute('data-language-switch')){
   link.textContent=english?'中文':link.classList.contains('language-link')?'EN':'English';link.setAttribute('aria-label',english?'切换到中文':'Switch to English');
   const target=new URL(location.href);if(english)target.searchParams.delete('lang');else target.searchParams.set('lang','en');link.href=target.href;
   link.addEventListener('click',()=>{
    const candidates=[...document.querySelectorAll('.track,.portfolio-body>section,#collaborate,#contact,.case-main')];const current=candidates.filter(el=>el.getBoundingClientRect().top<innerHeight*.5).at(-1);
    if(current?.id)target.hash=current.id;link.href=target.href;
   });continue;
  }
  const href=link.getAttribute('href');if(href.startsWith('#')||/^(mailto:|https?:)/.test(href))continue;
  if(english&&href.includes('.html')){const url=new URL(href,location.href);url.searchParams.set('lang','en');link.href=url.href;}
 }
})();
