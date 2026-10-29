// iPadOS can report a desktop user agent and a wide viewport. Touch matters.
export function qualityFor({width,height,dpr=1,touch=false,memory=8,forced=''}) {
 const mobile=touch||memory<=4||forced==='mobile'||(forced!=='desktop'&&width<760);
 const pixelBudget=mobile?1150000:3200000;
 const ratio=Math.min(dpr,mobile?1.2:1.5,Math.sqrt(pixelBudget/Math.max(1,width*height)));
 return {name:mobile?'mobile':'desktop',mobile,ratio,post:!mobile,shadowSize:mobile?0:2048,lampShadow:!mobile,textureSize:mobile?1024:2048};
}
export function browserQuality() {
 return qualityFor({width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,
  touch:matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1,
  memory:navigator.deviceMemory||8,forced:new URLSearchParams(location.search).get('quality')||''});
}
