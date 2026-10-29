import {NodeIO} from '../real-3d-atelier/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from '../real-3d-atelier/node_modules/@gltf-transform/extensions/dist/index.js';
import {draco,dequantize} from '../real-3d-atelier/node_modules/@gltf-transform/functions/dist/index.js';
import {MeshoptDecoder} from '../real-3d-atelier/node_modules/meshoptimizer/index.js';
import draco3d from '../real-3d-atelier/node_modules/draco3dgltf/draco3dgltf.js';
import {writeFile} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
 'meshopt.decoder':MeshoptDecoder,'draco3d.encoder':await draco3d.createEncoderModule()
});
const out=new URL('../../outputs/ryan-renaissance-performance/',import.meta.url);
for(const tier of ['mobile','desktop']){
 const doc=await io.read(new URL(`studio-${tier}.glb`,out).pathname);
 for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
 await doc.transform(dequantize(),draco({quantizePosition:24,quantizeNormal:12,quantizeTexcoord:16,encodeSpeed:0,decodeSpeed:5}));
 const data=await io.writeBinary(doc);
 await writeFile(new URL(`studio-${tier}-draco.glb`,out),data);
 console.log(tier,data.length);
}
