// Dispose shared GLTF resources once, including ImageBitmaps owned by textures.
export function disposeSceneGraph(root,{excludeTextures=new Set()}={}){
 if(!root)return;
 const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set(),skeletons=new Set();
 root.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  if(object.skeleton)skeletons.add(object.skeleton);
  for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)materials.add(material);
 });
 for(const material of materials){
  for(const value of Object.values(material))if(value?.isTexture&&!excludeTextures.has(value))textures.add(value);
 }
 for(const texture of textures){
  const image=texture.source?.data??texture.image;
  if(image?.close)images.add(image);
  texture.dispose();
 }
 for(const image of images)image.close();
 for(const material of materials)material.dispose();
 for(const geometry of geometries)geometry.dispose();
 for(const skeleton of skeletons)skeleton.dispose();
}
