import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from '../real-3d-atelier/node_modules/esbuild/lib/main.js';
import {disposeSceneGraph} from './dispose-scene.js';

const require=createRequire(new URL('../real-3d-atelier/package.json',import.meta.url));
const THREE=require('three');
const result=await build({entryPoints:[new URL('./night-lighting.js',import.meta.url).pathname],bundle:true,format:'cjs',platform:'node',external:['three'],write:false,tsconfigRaw:{compilerOptions:{}}});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
const {installNightLighting}=module.exports;
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('scene cleanup disposes shared geometry, materials and textures only once',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),texture=new THREE.Texture(),environment=new THREE.Texture();
 material.map=texture;material.roughnessMap=texture;material.envMap=environment;
 let geometryCount=0,materialCount=0,textureCount=0,envCount=0,closed=0;
 geometry.addEventListener('dispose',()=>geometryCount++);material.addEventListener('dispose',()=>materialCount++);
 texture.addEventListener('dispose',()=>textureCount++);environment.addEventListener('dispose',()=>envCount++);texture.image={close(){closed++;}};
 const root=new THREE.Group();root.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));
 disposeSceneGraph(root,{excludeTextures:new Set([environment])});
 assert.deepEqual([geometryCount,materialCount,textureCount,envCount,closed],[1,1,1,0,1]);
});

test('night maps wait for activation, load serially on mobile, and release on disposal',async()=>{
 const previous={window:globalThis.window,document:globalThis.document,MutationObserver:globalThis.MutationObserver};
 const original=THREE.TextureLoader.prototype.loadAsync,requests=[],pending=[],maps=[];let observer;
 THREE.TextureLoader.prototype.loadAsync=function(url){requests.push(url);return new Promise(resolve=>pending.push(resolve));};
 globalThis.document={documentElement:{dataset:{theme:'dark'}},querySelector:()=>({dataset:{}})};
 globalThis.window={RYAN_STUDIO_MANIFEST:{models:{mobile:{nightMaps:{first:'1',second:'2',third:'3',fourth:'4'}}}},RyanMotion:{request(){}}};
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){this.disconnected=true;}};
 try{
  const root=new THREE.Group();for(const name of ['first','second','third','fourth']){const mat=new THREE.MeshStandardMaterial();mat.name=name;mat.emissiveMap=new THREE.Texture();root.add(new THREE.Mesh(new THREE.BoxGeometry(),mat));}
  const scene=new THREE.Scene();scene.background=new THREE.Color();const lights=[new THREE.HemisphereLight(),new THREE.DirectionalLight(),new THREE.DirectionalLight(),new THREE.RectAreaLight(),new THREE.RectAreaLight()];
  const night=installNightLighting(root,scene,lights,{name:'mobile',mobile:true,lampShadow:false});
  await flush();assert.equal(requests.length,0);night.begin();night.begin();await flush();assert.deepEqual(requests,['1']);
  const first=new THREE.Texture();let firstDisposed=0;first.addEventListener('dispose',()=>firstDisposed++);maps.push(first);pending.shift()(first);await flush();assert.deepEqual(requests,['1','2']);
  night.dispose();assert.equal(firstDisposed,1);assert.equal(observer.disconnected,true);
  const second=new THREE.Texture();let secondDisposed=0;second.addEventListener('dispose',()=>secondDisposed++);pending.shift()(second);await flush();assert.equal(secondDisposed,1);assert.deepEqual(requests,['1','2']);
 }finally{THREE.TextureLoader.prototype.loadAsync=original;Object.assign(globalThis,previous);}
});

test('switching back to light releases night textures and switching to dark loads them again',async()=>{
 const previous={window:globalThis.window,document:globalThis.document,MutationObserver:globalThis.MutationObserver};
 const original=THREE.TextureLoader.prototype.loadAsync,maps=[];let observer,requests=0;
 THREE.TextureLoader.prototype.loadAsync=async()=>{requests++;const map=new THREE.Texture();map.addEventListener('dispose',()=>map.wasDisposed=true);maps.push(map);return map;};
 globalThis.document={documentElement:{dataset:{theme:'dark'}},querySelector:()=>({dataset:{}})};
 globalThis.window={RYAN_STUDIO_MANIFEST:{models:{mobile:{nightMaps:{first:'1'}}}},RyanMotion:{request(){}}};
 globalThis.MutationObserver=class{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){}};
 try{
  const material=new THREE.MeshStandardMaterial();material.name='first';material.emissiveMap=new THREE.Texture();
  const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(),material));const scene=new THREE.Scene();scene.background=new THREE.Color();
  const lights=[new THREE.HemisphereLight(),new THREE.DirectionalLight(),new THREE.DirectionalLight(),new THREE.RectAreaLight(),new THREE.RectAreaLight()];
  const night=installNightLighting(root,scene,lights,{name:'mobile',mobile:true,lampShadow:false});night.begin();await flush();assert.equal(requests,1);
  document.documentElement.dataset.theme='light';observer.callback();night.update(1000,true);assert.equal(maps[0].wasDisposed,true);
  document.documentElement.dataset.theme='dark';observer.callback();await flush();assert.equal(requests,2);night.dispose();assert.equal(maps[1].wasDisposed,true);
 }finally{THREE.TextureLoader.prototype.loadAsync=original;Object.assign(globalThis,previous);}
});
