// URLs contain the content hash: an older cached response is still the exact
// requested model. Reuse it without GitHub Pages' ten-minute revalidation.
async function readModel(url,manifest,{signal,onProgress,cacheOnly=false}){
 signal?.throwIfAborted();
 const response=await fetch(url,{...(cacheOnly?{cache:'only-if-cached',mode:'same-origin'}:{cache:new URLSearchParams(location.search).has('cache')?'no-store':'force-cache'}),signal});
 if(!response.ok)throw new Error('Scene asset '+response.status);
 const result=new Uint8Array(manifest.bytes);let bytes=0;
 if(response.body){
  const reader=response.body.getReader();
  try{for(;;){const {done,value}=await reader.read();if(done)break;
   if(bytes+value.length>result.length)throw new Error('Invalid scene size');
   result.set(value,bytes);bytes+=value.length;onProgress(bytes/result.length);
  }}catch(error){await reader.cancel(error).catch(()=>{});throw error;}finally{reader.releaseLock();}
 }else{const data=new Uint8Array(await response.arrayBuffer());if(data.length!==result.length)throw new Error('Incomplete scene');result.set(data);bytes=data.length;}
 if(bytes!==result.length)throw new Error('Incomplete scene');
 if(manifest.version&&globalThis.crypto?.subtle){
  const digest=await crypto.subtle.digest('SHA-256',result.buffer);
  const hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  if(!hash.startsWith(manifest.version))throw new Error('Scene integrity mismatch');
 }
 return result.buffer;
}
export async function downloadScene(manifest,{signal,onProgress=()=>{},onSource=()=>{}}={}){
 if(!manifest.cdnModel)return readModel(manifest.model,manifest,{signal,onProgress});
 // A previous release may already have cached the identical model on origin.
 // Probe that cache without making a network request before trying the mirror.
 // Unsupported cache-only mode and cache misses both use the normal fallback.
 if(!new URLSearchParams(location.search).has('cache')){
  try{const buffer=await readModel(manifest.model,manifest,{signal,onProgress,cacheOnly:true});onSource('cache');return buffer;}
  catch(error){signal?.throwIfAborted();}
 }
 // Start the origin if the mirror has no response after 1.5 s or stops sending
 // data for 2.5 s. Do not double the mobile transfer during a healthy download.
 // When both are active, keep one validated buffer and abort the loser.
 const controllers=[new AbortController(),new AbortController()];let timer,released=false,release;
 const fallbackReady=new Promise(resolve=>{release=()=>{if(released)return;released=true;clearTimeout(timer);resolve();};timer=setTimeout(release,1500);});
 const abort=()=>{controllers.forEach(c=>c.abort(signal?.reason));release();};
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const fetchOne=(url,index)=>readModel(url,manifest,{signal:controllers[index].signal,onProgress:v=>{onProgress(v);if(index===0&&!released){clearTimeout(timer);timer=setTimeout(release,2500);}}}).then(buffer=>({buffer,index}));
 const primary=fetchOne(manifest.cdnModel,0).catch(error=>{release();throw error;});
 const fallback=fallbackReady.then(()=>fetchOne(manifest.model,1));
 try{const winner=await Promise.any([primary,fallback]);onSource(winner.index===0?'cdn':'origin');return winner.buffer;}
 finally{abort();signal?.removeEventListener('abort',abort);}
}
export async function sceneBuffer(manifest,gate,canvas){
 gate.phase(1,'正在读取场景');canvas.dataset.cache='http';
 const boot=globalThis.RyanStudioBoot;
 if(boot?.model===manifest.model){
  boot.onProgress=v=>gate.progress(.76*v);gate.progress(.76*boot.progress);
  const result=await boot.promise;boot.promise=null;canvas.dataset.assetSource=boot.source||'origin';
  if(result.error)throw result.error;
  return result.buffer;
 }
 return downloadScene(manifest,{signal:gate.signal,onProgress:v=>gate.progress(.76*v)});
}
