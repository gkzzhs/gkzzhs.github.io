// Unit tests of the loading gate with DOM stubs. These do not claim browser
// layout, real-device rendering, or WebGL performance coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('./opening.js',import.meta.url),'utf8');
function setup({reduced=false,reserved=false}={}){
 const timers=new Map(),scripts=[],elements=new Map(),scrollCalls=[];let animations=0;
 const element=()=>{const classes=new Set();return {dataset:{},style:{},hidden:false,classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},contains(x){return x==='reduced-motion'?reduced:classes.has(x)}},setAttribute(){},animate(){animations++;return {finished:Promise.resolve(),cancel(){}};}};};
 const root=element(),body=element();
 if(reserved)root.classList.add('studio-reserved');
 elements.set('.track',{getBoundingClientRect:()=>({bottom:-20})});
 elements.set('#work',{getBoundingClientRect:()=>({top:root.classList.contains('studio-reserved')?200:-4400})});
 const document={documentElement:root,body,querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);},createElement:element,head:{append(script){scripts.push(script);}}};
 const controller=new AbortController(),window={WebAssembly,scrollBy:(...args)=>scrollCalls.push(args),RyanStudioBoot:{controller,promise:Promise.resolve({buffer:new ArrayBuffer(1)})},RYAN_STUDIO_MANIFEST:{runtime:'scene.js'}};
 const context={window,document,AbortController,URLSearchParams,location:{protocol:'https:',search:''},matchMedia:()=>({matches:reduced}),setTimeout(fn,ms){timers.set(ms,fn);return ms;},clearTimeout(id){timers.delete(id);},console:{warn(){}}};
 runInNewContext(source,context);
 return {gate:window.RyanSceneGate,root,body,elements,scripts,timers,controller,scrollCalls,animations:()=>animations};
}

test('background completion keeps the poster state and avoids aborting the scene',async()=>{
 const s=setup();assert.equal(s.root.dataset.sceneState,'loading');
 assert.equal(s.scripts.length,1);assert.ok(s.timers.has(90000));
 await s.gate.finish({pending:true});
 assert.equal(s.root.dataset.sceneState,'standby');assert.equal(s.controller.signal.aborted,false);
 assert.equal(s.elements.get('#scene-gate').hidden,true);assert.equal(s.timers.size,0);
});
test('deep-link failure collapses the reserved scene without displacing work content',()=>{
 const s=setup({reserved:true});s.gate.fail(new Error('offline'));
 assert.equal(s.root.classList.contains('studio-reserved'),false);
 assert.deepEqual(s.scrollCalls,[[0,-4600]]);
});

test('reduced motion closes the gate immediately without an opacity animation',async()=>{
 const s=setup({reduced:true});await s.gate.finish();
 assert.equal(s.root.dataset.sceneState,'ready');assert.equal(s.animations(),0);
});

test('runtime or watchdog failure aborts the transfer and leaves the portfolio usable',()=>{
 for(const type of ['runtime','watchdog']){
  const s=setup();
  if(type==='runtime')s.scripts[0].onerror();else s.timers.get(90000)();
  assert.equal(s.root.dataset.sceneState,'failed');assert.equal(s.controller.signal.aborted,true);
  assert.equal(s.elements.get('#scene-gate').hidden,true);
  assert.equal(s.elements.get('.loading').hidden,false);
  assert.equal(s.elements.get('#scene').dataset.failed,'true');assert.equal(s.timers.size,0);
 }
});
