import {NodeIO} from '../real-3d-atelier/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '../real-3d-atelier/node_modules/@gltf-transform/extensions/dist/index.js';
import {weldPrimitive,simplifyPrimitive,reorder,quantize,cloneDocument} from '../real-3d-atelier/node_modules/@gltf-transform/functions/dist/index.js';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from '../real-3d-atelier/node_modules/meshoptimizer/index.js';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const sharp=createRequire(new URL('../real-3d-atelier/package.json',import.meta.url))('sharp');
const out=new URL('../../outputs/ryan-renaissance-performance/',import.meta.url);
await mkdir(out,{recursive:true});
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const original=await io.read(new URL('../../outputs/ryan-renaissance-3d-preview/studio-web.glb',import.meta.url).pathname);
function stats(doc){return {triangles:doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||0)/3,0),0),textures:doc.getRoot().listTextures().length};}
const before=stats(original),results={before};
for(const tier of ['desktop','mobile']) {
 const doc=cloneDocument(original),root=doc.getRoot();
 // Reduce only the two dominant meshes. Preserve thin floor seams, paper,
 // joinery and laptop shell geometry exactly, including their bevel borders.
 for(const mesh of root.listMeshes())if(['Penelope','Laptop black display inset'].includes(mesh.getName())){
  for(const primitive of mesh.listPrimitives()){
   weldPrimitive(primitive);
   simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio:tier==='mobile'?.40:.65,error:.00025,lockBorder:true});
  }
 }
 for(const tex of root.listTextures()){
  const normal=/normal/i.test(tex.getName()),ao=/occlusion/i.test(tex.getName());
  const max=tier==='mobile'?(ao?512:1024):(ao?1024:2048);
  const image=await sharp(Buffer.from(tex.getImage())).resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).webp({quality:normal?90:tier==='mobile'?80:88,effort:5}).toBuffer();
  tex.setImage(new Uint8Array(image)).setMimeType('image/webp');
 }
 // Preserve decoded positions: requantizing the already-quantized floor creates
 // z-fighting along coplanar tile seams. Meshopt still compresses the floats.
 await doc.transform(reorder({encoder:MeshoptEncoder,target:'size'}),quantize({pattern:/^(?!POSITION$).*/,quantizeNormal:12,quantizeTexcoord:16}));
 doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 const data=await io.writeBinary(doc);await writeFile(new URL(`studio-${tier}.glb`,out),data);
 results[tier]={...stats(doc),bytes:data.length};
 console.log(tier,results[tier]);
}
await writeFile(new URL('model-optimization.json',out),JSON.stringify(results,null,2));
