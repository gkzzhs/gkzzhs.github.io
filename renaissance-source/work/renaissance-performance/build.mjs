import {build} from '../real-3d-atelier/node_modules/esbuild/lib/main.js';
import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {copyIdentity,withIdentity,identityFiles,identityPath} from '../site-identity/identity.mjs';
const src=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(src,'../..'),base=path.join(root,'work/renaissance-3d'),legacy=path.join(root,'outputs/ryan-renaissance-3d-preview'),out=path.join(root,'outputs/ryan-renaissance-performance'),prefix='assets/renaissance-perf/',assets=path.join(out,prefix),deps=path.join(root,'work/real-3d-atelier/node_modules');
const sharp=createRequire(path.join(root,'work/real-3d-atelier/package.json'))('sharp'),hash=b=>createHash('sha256').update(b).digest('hex').slice(0,16);
await rm(assets,{recursive:true,force:true});await mkdir(assets,{recursive:true});
const inventory=[];
async function asset(data,ext,label='asset'){
 const name=`${label}.${hash(data)}.${ext}`;await writeFile(path.join(assets,name),data);inventory.push({name:prefix+name,bytes:data.length});return prefix+name;
}
const models={};
for(const tier of ['mobile','desktop']){
 const data=await readFile(path.join(out,`studio-${tier}.glb`)),nightMaps={};
 for(const [name,slug] of [['Ivory / Penelope scan','ivory'],['Lime plaster','lime-plaster'],['Honed travertine','honed-travertine'],['Original fresco / generated concept','original-fresco']]){
  const b=await sharp(path.join(base,'assets',`night-light-clean-${slug}.png`)).resize({width:tier==='mobile'?1024:2048,height:tier==='mobile'?1024:2048,fit:'inside',withoutEnlargement:true}).webp({quality:tier==='mobile'?80:88}).toBuffer();
  nightMaps[name]=await asset(b,'webp',`night-${slug}-${tier}`);
 }
 models[tier]={version:hash(data),bytes:data.length,model:await asset(data,'glb',`studio-${tier}`),nightMaps};
 // These exact public model bytes are already published at this immutable
 // commit. Never point a new model hash at an older mirror revision.
 const mirrored={mobile:'1ff01b68f95ed54c',desktop:'3ed6e2c659a92479'};
 if(models[tier].version===mirrored[tier])models[tier].cdnModel='https://cdn.jsdelivr.net/gh/gkzzhs/gkzzhs.github.io@e355fe0481a5afca715541b32fb62f70e108102e/'+models[tier].model;
}
let scene=await readFile(path.join(src,'scene.js'),'utf8');
for(const [token,file] of [['__CAMERA_PATH__','camera-path.json'],['__SCREEN_CORNERS__','screen-world.json'],['__SCREEN_GEOMETRY__','screen-geometry.json']])scene=scene.replace(token,await readFile(path.join(legacy,file),'utf8'));
const bundled=await build({tsconfigRaw:{compilerOptions:{}},stdin:{contents:scene,resolveDir:src,sourcefile:'scene.js'},nodePaths:[deps],bundle:true,format:'iife',minify:true,write:false,target:['es2020'],legalComments:'inline'});
const runtime=`try{if(!window.RyanSceneGate.signal.aborted){${bundled.outputFiles[0].text}}}catch(error){window.RyanSceneGate.fail(error);}`;
const manifest={models,runtime:await asset(Buffer.from(runtime),'js','scene')};
const preload=await build({tsconfigRaw:{compilerOptions:{}},entryPoints:[path.join(src,'preload.js')],bundle:true,format:'iife',minify:true,write:false,target:['es2021']});
const scroll=await build({tsconfigRaw:{compilerOptions:{}},entryPoints:[path.join(src,'scroll.js')],bundle:true,nodePaths:[deps],format:'iife',minify:true,write:false,target:['es2020']});
const locale=(await readFile(path.join(base,'locale.js'),'utf8')).replace('__LOCALE__',await readFile(path.join(base,'locale.json'),'utf8'));
const common=(await readFile(path.join(base,'common.js'),'utf8')).replace(/ const glove=document[\s\S]*? \/\/ Cross-document navigation/,' // Cross-document navigation');
const extra=[locale,scroll.outputFiles[0].text,await readFile(path.join(src,'opening.js'),'utf8'),await readFile(path.join(src,'project-flight.js'),'utf8'),await readFile(path.join(root,'work/neoclassical-portfolio/ending.js'),'utf8'),common,await readFile(path.join(src,'middle-flow.js'),'utf8'),await readFile(path.join(src,'portfolio.js'),'utf8')].join('\n');
let html=await readFile(path.join(legacy,'index.html'),'utf8');
const lastScript=html.lastIndexOf('<script>');if(lastScript<0)throw new Error('Missing bootstrap');
html=html.slice(0,lastScript)+'<script>'+extra+'</script></body></html>';
const dataPattern=/data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)/g,map=new Map();
async function externalize(text,relative=''){
 for(const m of text.matchAll(dataPattern))if(!map.has(m[0])){
  let b=Buffer.from(m[2],'base64'),ext=m[1]==='font/woff2'?'woff2':m[1]==='image/svg+xml'?'svg':m[1]==='image/gif'?'gif':null;
  if(!ext){b=await sharp(b).resize({width:1920,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();ext='webp';}
  map.set(m[0],await asset(b,ext,ext==='woff2'?'font':'image'));
 }
 return text.replace(dataPattern,m=>relative+map.get(m));
}
html=await externalize(html);
// Keep the selected portrait in the performance build; retain its full square composition.
const portrait=await asset(await sharp(path.join(src,'assets','ryan-portrait-2026.png')).rotate().resize({width:960,withoutEnlargement:true}).webp({quality:86}).toBuffer(),'webp','portrait');
let portraitCount=0;
html=html.replace(/<img\b[^>]*alt="王冠行 \/ Ryan Wang 的个人头像"[^>]*>/g,tag=>{portraitCount++;return tag.replace(/src="[^"]*"/,`src="${portrait}"`);});
if(portraitCount!==1)throw new Error(`Expected one portrait, found ${portraitCount}`);
const poster=await asset(await sharp(path.join(legacy,'wide-draft.png')).resize({width:1600,withoutEnlargement:true}).webp({quality:80}).toBuffer(),'webp','poster');
html=html.replace('<canvas aria-label="完整雕塑','<img class="scene-poster" src="'+poster+'" alt="" fetchpriority="high" decoding="async"/><canvas aria-label="完整雕塑');
// Lazy-load below-the-fold images. Keep the single stage screen available for takeover.
html=html.replace(/<img\b([^>]*?)>/g,(tag,attrs)=>/scene-poster/.test(attrs)?tag:'<img loading="lazy" decoding="async"'+attrs+'>');
html=html.replace(/href="projects\//g,'href="'+prefix+'projects/');
// The animated covers and their HTML captions must share native scrolling.
// A viewport-fixed canvas can lag behind compositor-driven iOS scrolling.
const flightCanvas='<canvas aria-hidden="true" id="project-flight"></canvas>';
if(!html.includes(flightCanvas)||!html.includes('<div class="work-grid">'))throw new Error('Missing project flight mount');
html=html.replace(flightCanvas,'').replace('<div class="work-grid">','<div class="work-grid">'+flightCanvas);
const fixes=`
.portfolio-body .work-grid{isolation:isolate}
#project-flight{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.scene-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
html[data-theme=dark] .scene-poster{filter:brightness(.45)}
.studio-poster:not(.studio-reserved) .track{height:100svh}
html[data-scene-state=loading] #scene,html[data-scene-state=standby] #scene{opacity:0}
#scene{transition:opacity .3s ease}
.scene-gate{inset:auto var(--pad) 24px;background:none;color:var(--ink)}
.gate-inner{position:static}.gate-caption{font-size:10px}.gate-rail{margin-top:10px;background:var(--line)}.gate-rail i{background:var(--ink)}.gate-skip{margin-top:10px;color:var(--muted)}
.studio-poster .scene-foot{visibility:hidden}
html[data-scene-state=entering] #site-header.on-scene{opacity:1}
.reduced-motion #scene{transition:none}
html[data-scene-state=loading] #site-header.on-scene{color:var(--ink)}
.scene-failed .hero-copy{opacity:1!important}.scene-failed .scene-note,.scene-failed #report-stage,.scene-failed .takeover-heading,.scene-failed .takeover-foot{display:none}
.scene-failed .stage{background:var(--paper)}
`;
html=html.replace('</style>','\n'+fixes+'</style>');
html=html.replace('</head>',`<link rel="preload" as="image" href="${poster}"/><script>window.RYAN_STUDIO_MANIFEST=${JSON.stringify(manifest)};${preload.outputFiles[0].text}</script></head>`);
if(/__(CAMERA_PATH|SCREEN_CORNERS|SCREEN_GEOMETRY|NIGHT_MAPS)__/.test(html+runtime))throw new Error('Unresolved token');
await copyIdentity(out);
for(const name of identityFiles)inventory.push({name:identityPath+name,bytes:(await readFile(path.join(out,identityPath,name))).length});
html=withIdentity(html);
await writeFile(path.join(out,'renaissance-preview.html'),html);await writeFile(path.join(out,'index.html'),html);
await mkdir(path.join(assets,'projects'),{recursive:true});
for(const name of ['lark-retro','xmind','lark-dispatch','life']){
 let page=await readFile(path.join(legacy,'projects',name+'.html'),'utf8');
 page=await externalize(page,'../../../');
 page=page.replace(/\.\.\/index\.html/g,'../../../renaissance-preview.html');
 page=withIdentity(page,'../../../');
 await writeFile(path.join(assets,'projects',name+'.html'),page);
}
for(const f of ['THREE-LICENSE.txt','MESHOPT-LICENSE.md','LENIS-LICENSE.txt','instrumentsans-OFL.txt','instrumentserif-OFL.txt','notosanssc-OFL.txt'])await copyFile(path.join(legacy,f),path.join(assets,f));
await copyFile(path.join(legacy,'SOURCE-ACKNOWLEDGEMENT.txt'),path.join(assets,'SOURCE-ACKNOWLEDGEMENT.txt'));
await writeFile(path.join(assets,'CREDITS.md'),await readFile(path.join(legacy,'CREDITS.md'),'utf8')+'\n\n## Performance variants — 2026-10-21\n\nThe same seated figure, original pose and studio scene are retained. The figure and keyboard mesh have reduced tessellation. Mobile texture atlases are limited to 1024px (occlusion 512px); desktop atlases to 2048px (occlusion 1024px). Files use WebP and Meshopt compression. No David replacement or handoff animation is included.\n');
await writeFile(path.join(out,'asset-manifest.json'),JSON.stringify({...manifest,htmlBytes:Buffer.byteLength(html),runtimeBytes:Buffer.byteLength(runtime),files:inventory},null,2));
console.log(JSON.stringify({htmlBytes:Buffer.byteLength(html),runtimeBytes:Buffer.byteLength(runtime),mobileModelBytes:models.mobile.bytes,desktopModelBytes:models.desktop.bytes,posterBytes:inventory.find(x=>x.name===poster).bytes}));
