import {NodeIO} from '../real-3d-atelier/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '../real-3d-atelier/node_modules/@gltf-transform/extensions/dist/index.js';
import {quantize,prune,reorder} from '../real-3d-atelier/node_modules/@gltf-transform/functions/dist/index.js';
import {MeshoptEncoder,MeshoptDecoder} from '../real-3d-atelier/node_modules/meshoptimizer/index.js';
import {writeFile} from 'node:fs/promises';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const out=new URL('../../outputs/ryan-renaissance-performance/',import.meta.url);
const quantizedNames=new Set(['Penelope','Laptop black display inset']);
for(const tier of ['mobile','desktop']){
 const doc=await io.read(new URL(`studio-${tier}.glb`,out).pathname),root=doc.getRoot();
 // Quantize only the two dense meshes. Restore every other primitive and node
 // exactly, so coplanar floor seams and MacBook shell clearances cannot drift.
 const preserved=root.listMeshes().filter(m=>!quantizedNames.has(m.getName())).flatMap(m=>m.listPrimitives().map(p=>({p,attributes:p.listSemantics().map(s=>[s,p.getAttribute(s).clone()]),indices:p.getIndices()?.clone()})));
 const nodes=root.listNodes().filter(n=>!quantizedNames.has(n.getMesh()?.getName())).map(n=>({n,matrix:n.getMatrix()}));
 if(root.listNodes().some(n=>n.getMesh()&&n.listChildren().length))throw Error('Unexpected parent mesh');
 await doc.transform(quantize({pattern:/^POSITION$/,quantizePosition:16,cleanup:false}));
 for(const {p,attributes,indices} of preserved){for(const [s,a] of attributes)p.setAttribute(s,a);if(indices)p.setIndices(indices);}
 for(const {n,matrix} of nodes)n.setMatrix(matrix);
 await doc.transform(prune({keepAttributes:true,keepIndices:true,keepLeaves:true,keepSolidTextures:true}),reorder({encoder:MeshoptEncoder,target:'size'}));
 doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 const data=await io.writeBinary(doc);await writeFile(new URL(`studio-${tier}-transfer.glb`,out),data);
 console.log(tier,data.length);
}
