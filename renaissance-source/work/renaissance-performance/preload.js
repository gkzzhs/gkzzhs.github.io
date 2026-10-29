import {browserQuality} from './quality.js';
import {downloadScene} from './scene-assets.js';
const root=document.documentElement,params=new URLSearchParams(location.search);
root.classList.add('studio-poster');root.dataset.sceneState='loading';
const quality=browserQuality(),manifest=window.RYAN_STUDIO_MANIFEST.models[quality.name];
const sceneLink=['#studio-detail','#desktop-detail','#report-preview'].includes(location.hash);
if(sceneLink)root.classList.add('studio-reserved');
const boot=window.RyanStudioBoot={quality,model:manifest.model,sceneLink,startedAt:performance.now(),controller:new AbortController(),progress:0,promise:null};
if(location.protocol!=='file:'&&window.WebAssembly&&params.get('scene')!=='poster'){
 const hint=document.createElement('link');hint.rel='preload';hint.as='script';hint.href=window.RYAN_STUDIO_MANIFEST.runtime;document.head.append(hint);
 // Start in the HTML head, alongside the script preload, not after Three.js,
 // its renderer and its environment have all finished initializing.
 boot.promise=downloadScene(manifest,{signal:boot.controller.signal,onProgress:v=>{boot.progress=Math.max(boot.progress,v);boot.onProgress?.(boot.progress);},onSource:source=>{boot.source=source;}})
  .then(buffer=>{boot.downloadedAt=performance.now();return {buffer};},error=>({error}));
}
