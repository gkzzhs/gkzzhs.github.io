import * as THREE from 'three';
// Baked day and night bounce share the exact same geometry and UV1 atlas.
// The mix happens in linear light; metal/specular reflections stay live.

export function installNightLighting(model,scene,dayLights,quality){
 const sources=window.RYAN_STUDIO_MANIFEST.models[quality.name].nightMaps;
 const initial=document.documentElement.dataset.theme==='dark'?1:0,uniform={value:initial};let target=initial;
 const loader=new THREE.TextureLoader(),textures={};

 const materials=new Set();model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});
 let mapsRequested=false;
 function loadMaps(){
  if(mapsRequested)return;mapsRequested=true;
  // Optional night maps never block the first day/night frame or the portfolio.
  Promise.allSettled(Object.entries(sources).map(async([name,url])=>{
   const map=await loader.loadAsync(url);map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;map.channel=1;map.name='Night bounce / '+name;
   for(const m of materials)if(m.name===name&&m.emissiveMap){
    m.onBeforeCompile=shader=>{shader.uniforms.studioNight=uniform;shader.uniforms.nightBounce={value:map};shader.fragmentShader='uniform float studioNight;\nuniform sampler2D nightBounce;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#ifdef USE_EMISSIVEMAP\nvec3 dayBounce=texture2D(emissiveMap,vEmissiveMapUv).rgb;\nvec3 nightColor=texture2D(nightBounce,vEmissiveMapUv).rgb;\ntotalEmissiveRadiance*=mix(dayBounce,nightColor,studioNight);\n#endif`);};
    m.customProgramCacheKey=()=> 'studio-linear-day-night-v2';m.needsUpdate=true;
   }
   window.RyanMotion?.request();
  })).then(()=>{document.querySelector('#scene').dataset.nightMaps='settled';window.RyanMotion?.request();});
 }
 for(const m of materials)if(m.name==='Ivory / Penelope scan'){m.roughness=.88;if(m.normalScale)m.normalScale.multiplyScalar(.65);}
 const lamp=new THREE.SpotLight('#ffba72',0,4,Math.PI*.34,.85,2);lamp.position.set(1.947,1.181,-.245);lamp.target.position.set(1.76,.80,-.16);lamp.castShadow=quality.lampShadow;lamp.shadow.mapSize.set(512,512);lamp.shadow.camera.near=.02;lamp.shadow.bias=-.0001;lamp.shadow.normalBias=.001;scene.add(lamp,lamp.target);
 const bounce=new THREE.PointLight('#ffb478',0,2.4,2);bounce.position.set(1.78,.86,-.22);scene.add(bounce);
 const screen=new THREE.RectAreaLight('#9dc9ff',0,.294,.191);screen.position.set(1.05,.94,.07);screen.lookAt(1.05,1.24,-1);scene.add(screen);
 const backgroundDay=new THREE.Color('#c2ccc9'),backgroundNight=new THREE.Color('#101b2d');
 const nightColors=dayLights.map((_,i)=>new THREE.Color(i===3?'#8096d6':'#849fdf'));
 const levels=dayLights.map(light=>({light,intensity:light.intensity,color:light.color.clone()}));
 const mix=THREE.MathUtils.lerp;
 function apply(){const n=uniform.value;scene.background.copy(backgroundDay).lerp(backgroundNight,n);scene.environmentIntensity=mix(.12,.025,n);
  levels.forEach(({light,intensity,color},i)=>{light.intensity=mix(intensity,[.05,.05,.12,.16,.12][i]??.08,n);light.color.copy(color).lerp(nightColors[i],n);});
  lamp.intensity=3.4*n;bounce.intensity=.25*n;screen.intensity=1.2*n;
  for(const m of materials){if(m.name==='MacBook Pro satin aluminium')m.envMapIntensity=mix(.85,.16,n);if(m.name==='Task lamp opal bulb'){m.emissive.set('#ffd299');m.emissiveIntensity=mix(.03,3.5,n);}if(m.name==='Task lamp ceramic reflector'){m.emissive.set('#ffc98d');m.emissiveIntensity=.30*n;}if(m.name==='Ryan personal desktop'){m.emissive.setRGB(1,1,1);m.emissiveIntensity=mix(.22,.82,n);}}
 }
 apply();new MutationObserver(()=>{target=document.documentElement.dataset.theme==='dark'?1:0;if(target)loadMaps();window.RyanMotion.request();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 return {begin(){if(target)loadMaps();},update(dt,reduced){if(uniform.value===target)return false;uniform.value=reduced?target:uniform.value+(target-uniform.value)*(1-Math.exp(-dt/90));if(Math.abs(target-uniform.value)<.001)uniform.value=target;apply();return uniform.value!==target;},get value(){return uniform.value;}};
}
