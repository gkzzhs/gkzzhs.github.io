import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {build} from '../real-3d-atelier/node_modules/esbuild/lib/main.js';

test('poster-only mode starts neither the 3D preload nor the model request',async()=>{
 const bundled=await build({entryPoints:[new URL('./preload.js',import.meta.url).pathname],bundle:true,format:'iife',write:false,tsconfigRaw:{compilerOptions:{}}});
 const classes=new Set(),appended=[];let requests=0;
 const root={classList:{add:x=>classes.add(x)},dataset:{}};
 const window={WebAssembly};
 window.RYAN_STUDIO_MANIFEST={runtime:'scene.js',models:{mobile:{model:'model.glb'}}};
 const document={documentElement:root,createElement:()=>({}),head:{append:x=>appended.push(x)}};
 runInNewContext(bundled.outputFiles[0].text,{window,document,location:{search:'?scene=poster',hash:'',protocol:'https:'},navigator:{maxTouchPoints:5},innerWidth:390,innerHeight:844,devicePixelRatio:2,matchMedia:()=>({matches:true}),URLSearchParams,AbortController,performance:{now:()=>0},fetch:()=>{requests++;throw Error('Unexpected request');}});
 assert.equal(appended.length,0);assert.equal(requests,0);assert.equal(window.RyanStudioBoot.promise,null);
});
