/* Closing sequence: position-driven frame handoff + finite, replayable type.
   Native scrolling remains authoritative. No section snapping or pinning. */
window.createEnding=function({isReduced}){
 const root=document.querySelector('#ending');if(!root)return null;
 const invitation=root.querySelector('#collaborate'),contact=root.querySelector('#contact'),about=document.querySelector('#about');
 const title=root.querySelector('#invitation-title'),link=root.querySelector('.invitation-link');
 const groups=Array.from(root.querySelectorAll('[data-replay-group]')).map((el,i)=>({el,i,active:false,count:0,enteredAt:0}));
 const titleGroup=groups[0];let inviteTop=0,contactTop=0,rolls=[],lastRoll=-Infinity,previousReduced=isReduced();
 const clamp=n=>Math.min(1,Math.max(0,n)),ease=n=>n*n*(3-2*n);
 root.querySelectorAll('[data-letter-line]').forEach(line=>{
  const text=line.dataset.letterLine;line.textContent='';
  text.split(' ').forEach((word,wi)=>{
   if(wi){const gap=document.createElement('span');gap.className='invitation-word-gap';gap.textContent=' ';line.append(gap);}
   const wordNode=document.createElement('span');wordNode.className='invitation-word';
   for(const character of word){const window=document.createElement('span'),track=document.createElement('span');window.className='letter-window';track.className='letter-track';for(let i=0;i<2;i++){const glyph=document.createElement('span');glyph.className='letter-glyph';glyph.textContent=character;track.append(glyph);}window.append(track);wordNode.append(window);}
   line.append(wordNode);
  });
 });
 const letters=Array.from(title.querySelectorAll('.letter-track'));
 function shuffle(){const ranks=letters.map((_,i)=>i);for(let i=ranks.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ranks[i],ranks[j]]=[ranks[j],ranks[i]];}letters.forEach((el,i)=>el.style.setProperty('--letter-delay',`${ranks[i]*19}ms`));title.dataset.order=ranks.join(',');return ranks;}
 function cancelRoll(){rolls.forEach(a=>a.cancel());rolls=[];}
 function activate(group,immediate=false){
  group.active=true;group.count++;group.enteredAt=performance.now();
  if(group===titleGroup){cancelRoll();shuffle();title.dataset.entries=String(group.count);}
  group.el.classList.toggle('focus-reveal',immediate);group.el.classList.add('is-visible');group.el.dataset.entries=String(group.count);group.el.dataset.state='entered';
 }
 function reset(group){group.active=false;group.el.classList.remove('is-visible','focus-reveal');group.el.dataset.state='ready';if(group===titleGroup)cancelRoll();}
 function rollLetters(){
  const now=performance.now();if(isReduced()||!titleGroup.active||now-titleGroup.enteredAt<1300||now-lastRoll<1500)return;
  lastRoll=now;cancelRoll();const ranks=shuffle();
  // Exactly one duplicate-glyph cycle. Finishing on the identical second glyph
  // allows the track to return to its first glyph without a visual jump.
  rolls=letters.map((el,i)=>el.animate([{transform:'translateY(0)'},{transform:'translateY(-50%)'}],{duration:850,delay:ranks[i]*16,easing:'cubic-bezier(.2,0,0,1)',fill:'none'}));
  title.dataset.rolls=String(Number(title.dataset.rolls||0)+1);
  const cycle=rolls;Promise.all(cycle.map(a=>a.finished.catch(()=>{}))).then(()=>{if(rolls===cycle)rolls=[];});
 }
 link.addEventListener('pointerenter',rollLetters);link.addEventListener('focus',rollLetters);
 groups.forEach(group=>group.el.addEventListener('focusin',()=>{if(!group.active)activate(group,true);}));
 root.classList.add('ending-enhanced');shuffle();
 function measure(){inviteTop=invitation.getBoundingClientRect().top+scrollY;contactTop=contact.getBoundingClientRect().top+scrollY;}
 function update(y,reduced){
  const entry=ease(clamp((innerHeight-(inviteTop-y))/(innerHeight*.95)));
  const handoff=ease(clamp((innerHeight-(contactTop-y))/(innerHeight*.90)));
  const aboutExit=ease(clamp((y-(inviteTop-innerHeight*.72))/(innerHeight*.7)));
  root.style.setProperty('--ending-entry',reduced?'1':entry.toFixed(6));root.style.setProperty('--ending-handoff',reduced?'0':handoff.toFixed(6));
  about.style.setProperty('--about-exit',reduced?'0':aboutExit.toFixed(6));
  root.dataset.frame=entry.toFixed(6);root.dataset.handoff=handoff.toFixed(6);root.dataset.motion=reduced?'static':'cinematic';
  if(reduced){cancelRoll();groups.forEach(g=>{g.active=false;g.el.classList.add('is-visible');g.el.dataset.state='static';});}
  else{
   if(previousReduced)groups.forEach(reset);
   for(const group of groups){const r=group.el.getBoundingClientRect();if(!group.active&&r.top<innerHeight*(group.i===groups.length-1?.99:.84)&&r.bottom>innerHeight*.12)activate(group);else if(group.active&&(r.bottom< -48||r.top>innerHeight+48))reset(group);}
  }
  previousReduced=reduced;
 }
 measure();return{measure,update};
};
