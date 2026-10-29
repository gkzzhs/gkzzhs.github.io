// Exercise the actual renderer's coordinate and resource logic with WebGL/DOM
// stubs. Pixel appearance and physical Safari remain separate visual checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('./project-flight.js',import.meta.url),'utf8');

async function fixture({width=390,height=844,touch=true}={}){
 const columns=width<760?1:2,gap=columns===1?45:75,gridWidth=width-(columns===1?44:88);
 const coverWidth=Math.floor((gridWidth-(columns-1)*34)/columns),coverHeight=Math.round(coverWidth/(columns===1?1.12:1.18)),caption=94;
 const rows=4/columns,gridHeight=rows*(coverHeight+caption)+(rows-1)*gap;
 const classes=new Set(),records=[],uniforms={},textures=[],current={};let contexts=0,context;
 const gl=new Proxy({
  MAX_RENDERBUFFER_SIZE:1,MAX_TEXTURE_SIZE:2,
  getParameter:()=>4096,getShaderParameter:()=>true,getProgramParameter:()=>true,
  getUniformLocation:(_p,name)=>name,createTexture:()=>({}),
  uniform2f(name,a,b){uniforms[name]=[a,b];},uniform3f(name,a,b,c){uniforms[name]=[a,b,c];},uniform1f(name,a){uniforms[name]=a;},
  scissor(...rect){current.scissor=rect;},texImage2D(...args){textures.push(args.at(-1));},
  drawElements(){records.push({center:[...uniforms.uCenter],size:[...uniforms.uSize],angles:[...uniforms.uAngles],bend:uniforms.uBend,scissor:[...current.scissor]});}
 },{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 const surface=new Proxy({measureText:t=>({width:t.length*20})},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 const grid={clientWidth:gridWidth,offsetHeight:gridHeight,getBoundingClientRect(){return {left:22,top:3500-context.scrollY};}};
 const elements=Array.from({length:4},(_,i)=>{
  const el={offsetLeft:(i%columns)*(coverWidth+34),offsetTop:Math.floor(i/columns)*(coverHeight+caption+gap),offsetParent:grid,matches:()=>false,querySelectorAll:()=>[]};
  const cover={dataset:{},offsetLeft:0,offsetTop:0,offsetParent:el,offsetWidth:coverWidth,offsetHeight:coverHeight,
   // A transformed viewport rectangle must not be used as the layout frame.
   getBoundingClientRect(){throw new Error('Card geometry read from animated viewport bounds');},
   querySelector:s=>s==='img'?null:{textContent:'Evidence'}};
  el.querySelector=()=>cover;return el;
 });
 const canvas={dataset:{},closest:s=>s==='.work-grid'?grid:null,getContext(){contexts++;return gl;},addEventListener(){},style:{}};
 context={window:{RyanStudioBoot:{quality:{mobile:touch||width<760}}},document:{fonts:{ready:Promise.resolve()},documentElement:{classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},remove(name){classes.delete(name);}}},createElement:()=>({getContext:()=>surface})},navigator:{maxTouchPoints:touch?5:0},matchMedia:()=>({matches:touch}),getComputedStyle:()=>({backgroundColor:'#abcdef',fontSize:'72px'}),Path2D:class{},devicePixelRatio:2,innerWidth:width,innerHeight:height,scrollY:3300,Float32Array,Uint16Array,console};
 runInNewContext(source,context);
 const flight=await context.window.createProjectFlight(canvas,elements);
 return {flight,canvas,elements,records,classes,context,grid,coverHeight,coverWidth,contexts:()=>contexts,textures};
}

test('cover coordinates stay attached to captions during forward and reverse scrolling',async()=>{
 for(const width of [390,1024,1440]){
  const s=await fixture({width,touch:width<1440});let expected;
  for(const [y,lag] of [[3300,.8],[3900,.8],[3500,-.8]]){
   s.context.scrollY=y;s.records.length=0;s.flight.draw([],y,lag,false);
   assert.equal(s.records.length,4,'all covers remain painted for compositor scrolling');
   const centers=s.records.map(r=>r.center);
   if(expected)assert.deepEqual(centers,expected,'scroll must not reposition the canvas independently of its HTML captions');
   else expected=centers;
   s.records.forEach((r,i)=>{
    const coverBottom=s.elements[i].offsetTop+s.coverHeight;
    assert.equal(r.center[1]+r.size[1]/2,coverBottom);
    // Even the generous scissor stays outside the title's 22px minimum gap.
    const scissorBottom=(s.canvas.height-r.scissor[1])*s.grid.offsetHeight/s.canvas.height;
    assert.ok(scissorBottom<coverBottom+22);
    assert.ok(Math.abs(r.angles[0]*180/Math.PI)<=(width<760?12.35:19)+1e-9);
   });
  }
  assert.equal(s.canvas.dataset.coordinateSpace,'work-grid');assert.equal(s.contexts(),1);
 }
});

test('the grid canvas stays within mobile pixel budgets and ignores browser-bar height changes',async()=>{
 for(const [width,height,touch] of [[390,844,true],[1024,768,true],[1366,1024,true],[1440,900,false]]){
  const s=await fixture({width,height,touch});
  assert.ok(s.canvas.width*s.canvas.height<=(touch?1150000:3200000));
  assert.ok(Math.max(s.canvas.width,s.canvas.height)<=4096);
  const before=[s.canvas.width,s.canvas.height,s.canvas.dataset.textureBuilds];
  s.context.innerHeight-=80;s.flight.resize();
  assert.deepEqual([s.canvas.width,s.canvas.height,s.canvas.dataset.textureBuilds],before);
 }
});

test('settling, reduced motion and offscreen idle keep their existing behavior',async()=>{
 const s=await fixture();s.flight.draw([],3300,.8,false);s.records.length=0;
 s.flight.draw([],3300,0,false);assert.ok(s.records.every(r=>r.angles[0]===0&&r.bend===0));
 s.records.length=0;s.flight.draw([],3300,0,true);
 assert.equal(s.records.length,0);assert.equal(s.classes.has('flight-ready'),false);assert.equal(s.canvas.dataset.mode,'static');
 s.flight.draw([],10000,0,false);const count=s.records.length;
 s.flight.draw([],10000,0,false);assert.equal(s.records.length,count,'offscreen rest does not redraw');
});

test('release mounts the animation canvas inside the native scrolling work grid',async()=>{
 const html=await readFile(new URL('../../outputs/ryan-renaissance-performance/renaissance-preview.html',import.meta.url),'utf8');
 assert.ok(html.includes('<div class="work-grid"><canvas aria-hidden="true" id="project-flight"></canvas>'));
 assert.equal((html.match(/id="project-flight"/g)||[]).length,1);
 assert.ok(html.includes('#project-flight{position:absolute;inset:0;width:100%;height:100%;z-index:0}'));
});
