import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {qualityFor} from './quality.js';
import {sceneBuffer,downloadScene} from './scene-assets.js';
import {createHash} from 'node:crypto';
const out=new URL('../../outputs/ryan-renaissance-performance/',import.meta.url);
test('wide desktop-UA iPad gets mobile GPU budget',()=>{
 const q=qualityFor({width:1366,height:1024,dpr:2,touch:true});
 assert.equal(q.name,'mobile');assert.equal(q.post,false);assert.equal(q.lampShadow,false);
 assert.ok(1366*1024*q.ratio*q.ratio<=1150001);assert.ok(q.shadowSize<=1024);
});
test('forced desktop mode cannot override touch or low-memory protection',()=>{
 for(const device of [{width:1366,height:1024,dpr:2,touch:true,forced:'desktop'},{width:1440,height:900,dpr:2,memory:4,forced:'desktop'}]){
  const q=qualityFor(device);assert.equal(q.name,'mobile');assert.equal(q.post,false);assert.ok(q.ratio<=1.2);
 }
 assert.equal(qualityFor({width:1440,height:900,dpr:2,forced:'desktop'}).name,'desktop');
});
test('phone and low-memory device stay within pixel budget',()=>{
 for(const device of [{width:390,height:844,dpr:3},{width:1024,height:768,dpr:2,memory:4}]){
  const q=qualityFor(device);assert.equal(q.name,'mobile');assert.ok(q.ratio<=1.2);assert.equal(q.post,false);
 }
 assert.equal(qualityFor({width:1440,height:900,dpr:2}).name,'desktop');
});
test('streamed scene validates length and rejects truncated/corrupt payloads',async()=>{
 const saved=globalThis.fetch;globalThis.location={search:''};
 const gate={signal:new AbortController().signal,phase(){},progress(){}},canvas={dataset:{}};
 try{
  globalThis.fetch=async()=>new Response(new Uint8Array([1,2,3,4]));
  assert.deepEqual([...new Uint8Array(await sceneBuffer({model:'test',bytes:4},gate,canvas))],[1,2,3,4]);
  await assert.rejects(sceneBuffer({model:'test',bytes:5},gate,canvas),/Incomplete/);
  await assert.rejects(sceneBuffer({model:'test',bytes:3},gate,canvas),/Invalid/);
  globalThis.fetch=async()=>new Response('',{status:404});
  await assert.rejects(sceneBuffer({model:'test',bytes:4},gate,canvas),/404/);
 }finally{globalThis.fetch=saved;delete globalThis.location;}
});
test('release has small HTML, separate tier models and all referenced assets',async()=>{
 const manifest=JSON.parse(await readFile(new URL('asset-manifest.json',out)));
 assert.ok(manifest.htmlBytes<200000);assert.ok(manifest.runtimeBytes<1100000);
 assert.ok(manifest.models.mobile.bytes<4000000);assert.ok(manifest.models.desktop.bytes<6000000);
 for(const f of manifest.files)await access(new URL(f.name,out));
 const html=await readFile(new URL('renaissance-preview.html',out),'utf8');
 assert.ok(!html.includes('base64,'));assert.ok(!html.includes('scene.b026522770378c0d.js'));
 assert.ok(!/<link[^>]+as="script"[^>]+scene\./.test(html),'poster mode must not have a static runtime preload');
 for(const name of ['lark-retro','xmind','lark-dispatch','life'])await access(new URL('assets/renaissance-perf/projects/'+name+'.html',out));
});
test('mirror failure falls back to the original model and uses immutable cache',async()=>{
 const saved=globalThis.fetch;globalThis.location={search:''};const calls=[];
 const bytes=new Uint8Array([1,2,3,4]),version=createHash('sha256').update(bytes).digest('hex').slice(0,16);
 try{
  globalThis.fetch=async(url,options)=>{calls.push([url,options.cache]);return options.cache==='only-if-cached'?new Response('',{status:504}):url==='mirror'?new Response('',{status:503}):new Response(bytes);};
  const data=await downloadScene({cdnModel:'mirror',model:'origin',bytes:4,version});
  assert.deepEqual([...new Uint8Array(data)],[1,2,3,4]);assert.deepEqual(calls,[['origin','only-if-cached'],['mirror','force-cache'],['origin','force-cache']]);
 }finally{globalThis.fetch=saved;delete globalThis.location;}
});
test('successful mirror aborts the delayed origin and rejects wrong model bytes',async()=>{
 const saved=globalThis.fetch;globalThis.location={search:''};const calls=[];
 const bytes=new Uint8Array([1,2,3,4]),version=createHash('sha256').update(bytes).digest('hex').slice(0,16);
 try{
  globalThis.fetch=async(url,options)=>{if(options.cache==='only-if-cached')return new Response('',{status:504});calls.push(url);return new Response(bytes);};
  await downloadScene({cdnModel:'mirror',model:'origin',bytes:4,version});
  await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(calls,['mirror']);
  await assert.rejects(downloadScene({model:'origin',bytes:4,version:'0000000000000000'}),/integrity/);
 }finally{globalThis.fetch=saved;delete globalThis.location;}
});
test('a stalled mirror cannot block the same-origin fallback',async()=>{
 const saved=globalThis.fetch;globalThis.location={search:''};let aborted=false;
 try{
  globalThis.fetch=async(url,{signal,cache})=>cache==='only-if-cached'?new Response('',{status:504}):url==='origin'?new Response(new Uint8Array([9])):new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true}));
  assert.deepEqual([...new Uint8Array(await downloadScene({cdnModel:'mirror',model:'origin',bytes:1}))],[9]);
  assert.equal(aborted,true);
 }finally{globalThis.fetch=saved;delete globalThis.location;}
});
test('returning visitors reuse the exact origin cache without a mirror request',async()=>{
 const saved=globalThis.fetch;globalThis.location={search:''};const calls=[];let source;
 const bytes=new Uint8Array([1,2,3,4]),version=createHash('sha256').update(bytes).digest('hex').slice(0,16);
 try{
  globalThis.fetch=async(url,options)=>{calls.push([url,options.cache,options.mode]);return new Response(bytes);};
  assert.deepEqual([...new Uint8Array(await downloadScene({cdnModel:'mirror',model:'origin',bytes:4,version},{onSource:v=>source=v}))],[1,2,3,4]);
  assert.deepEqual(calls,[['origin','only-if-cached','same-origin']]);assert.equal(source,'cache');
 }finally{globalThis.fetch=saved;delete globalThis.location;}
});
test('healthy streaming does not start a duplicate mobile model download',async()=>{
 const saved=globalThis.fetch;globalThis.location={search:''};const calls=[];
 try{
  globalThis.fetch=async(url,{cache})=>{
   if(cache==='only-if-cached')return new Response('',{status:504});calls.push(url);
   return new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1]));setTimeout(()=>{c.enqueue(new Uint8Array([2]));c.close();},1750);}}));
  };
  assert.deepEqual([...new Uint8Array(await downloadScene({cdnModel:'mirror',model:'origin',bytes:2}))],[1,2]);
  assert.deepEqual(calls,['mirror']);
 }finally{globalThis.fetch=saved;delete globalThis.location;}
});
test('cancelling startup aborts downloads and never launches delayed fallback',async()=>{
 const saved=globalThis.fetch;globalThis.location={search:''};const calls=[];const controller=new AbortController();
 try{
  globalThis.fetch=async(url,{cache,signal})=>{
   if(cache==='only-if-cached')throw new TypeError('Unsupported cache-only mode');calls.push(url);
   return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
  };
  const result=downloadScene({cdnModel:'mirror',model:'origin',bytes:2},{signal:controller.signal});
  await new Promise(resolve=>setTimeout(resolve,0));controller.abort();await assert.rejects(result);
  assert.deepEqual(calls,['mirror']);
 }finally{globalThis.fetch=saved;delete globalThis.location;}
});
