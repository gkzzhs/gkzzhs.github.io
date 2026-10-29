/* Curved project planes. Textures are drawn from this site's actual report,
   fixed evidence metrics and mechanism, never from the reference site's art. */
window.createProjectFlight=async function(canvas,elements){
 const grid=canvas.closest('.work-grid');
 if(!grid)return null;
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});
 if(!gl)return null;
 await document.fonts.ready;
 await Promise.all(elements.flatMap(el=>Array.from(el.querySelectorAll('img')).map(img=>img.decode().catch(()=>{}))));
 const vs=`attribute vec2 aUV;varying vec2 vUV;
 uniform vec2 uViewport,uCenter,uSize;uniform vec3 uAngles;uniform float uBend,uScale,uFocal;
 void main(){vUV=aUV;vec3 p=vec3((aUV-.5)*uSize,0.);
  p.z+=sin(aUV.y*3.14159265)*sin(aUV.x*3.14159265)*uBend;
  float cx=cos(uAngles.x),sx=sin(uAngles.x),cy=cos(uAngles.y),sy=sin(uAngles.y),cz=cos(uAngles.z),sz=sin(uAngles.z);
  p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);p.xy=mat2(cz,sz,-sz,cz)*p.xy;
  float f=uFocal/(uFocal-p.z);vec2 screen=uCenter+vec2(p.x,-p.y)*f*uScale;
  gl_Position=vec4(screen.x/uViewport.x*2.-1.,1.-screen.y/uViewport.y*2.,0.,1.);
 }`;
 const fs=`precision highp float;varying vec2 vUV;uniform sampler2D uTexture;uniform vec2 uSize,uCenter,uViewport,uResolution;uniform float uBend;
 void main(){float radius=min(15.,uSize.x*.035);
  vec2 pixel=vec2(gl_FragCoord.x,uResolution.y-gl_FragCoord.y)*uViewport/uResolution;
  vec2 frame=abs(pixel-uCenter)-(uSize*.5-radius);
  float edge=length(max(frame,0.))+min(max(frame.x,frame.y),0.)-radius;
  if(edge>.8)discard;vec2 p=abs((vUV-.5)*uSize)-(uSize*.5-radius);float d=length(max(p,0.))+min(max(p.x,p.y),0.)-radius;if(d>1.)discard;
  vec3 c=texture2D(uTexture,vUV).rgb;float slope=cos(vUV.y*3.14159265)*sin(vUV.x*3.14159265)*uBend*3.14159265/uSize.y;
  float light=clamp(1.-slope*.13,.90,1.055);gl_FragColor=vec4(c*light,(1.-smoothstep(-.8,.8,d))*(1.-smoothstep(-.8,.8,edge)));
 }`;
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const nx=40,ny=26,points=[],indices=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)points.push(i/nx,j/ny);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
 const attr=gl.getAttribLocation(program,'aUV');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const uniforms={};for(const name of ['uViewport','uResolution','uCenter','uSize','uAngles','uBend','uScale','uFocal'])uniforms[name]=gl.getUniformLocation(program,name);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
 let width=1,height=1,lost=false,draws=0,lastDpr=0,gridTop=0,gridLeft=0;
 const mobile=()=>window.RyanStudioBoot?.quality.mobile??(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1||innerWidth<760);
 const maxDimension=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE));
 const planes=elements.map(el=>({el,cover:el.querySelector('.work-cover'),texture:gl.createTexture(),left:0,top:0,width:1,height:1}));
 // Read layout coordinates, not transformed screen rectangles. CSS aperture
 // and hover transforms must never feed back into the canvas geometry.
 function coverFrame(cover){
  let left=0,top=0,node=cover;
  while(node&&node!==grid){left+=node.offsetLeft;top+=node.offsetTop;node=node.offsetParent;}
  return {left,top,width:cover.offsetWidth,height:cover.offsetHeight};
 }
 function makeTexture(plane,index){
  const cover=plane.cover,w=plane.width,h=plane.height,dpr=lastDpr,surface=document.createElement('canvas');
  surface.width=Math.ceil(w*dpr);surface.height=Math.ceil(h*dpr);const c=surface.getContext('2d');c.scale(dpr,dpr);
  c.fillStyle=getComputedStyle(cover).backgroundColor;c.fillRect(0,0,w,h);
  const t=value=>window.RyanI18n?.t(value)??value;
  const pad=w*.043,cream='#F5F0E6',ink=index===1?'#25363B':index===3?'#5F393B':cream;
  function text(value,x,y,size=9,family='"Portfolio Sans", "Portfolio CJK", sans-serif',color=ink){c.fillStyle=color;c.font=`400 ${size}px ${family}`;c.textBaseline='alphabetic';c.fillText(value,x,y);}
  const label=cover.querySelector('.cover-caption').textContent.trim();text(label,pad,h*.07,w<400?9:10);
  const size=parseFloat(getComputedStyle(cover.querySelector('.cover-metric')||cover.querySelector('.award-cover')).fontSize);
  if(index===0){
   const image=cover.querySelector('img');if(image?.complete&&image.naturalWidth){c.save();c.translate(w*.27,h*.19);c.rotate(-.055);c.drawImage(image,0,0,w*.80,w*.80*image.naturalHeight/image.naturalWidth);c.restore();}
   text('<03',pad,h-30,size,'"Portfolio Sans", sans-serif');c.font=`400 ${size}px "Portfolio Sans"`;const tw=c.measureText('<03').width;text(t('分钟'),Math.min(pad+tw+12,w*.76),h-30,10);
  }else if(index===1){
   const gap=w*.014,r=(w-pad*2-gap*6)/14;
   for(let n=0;n<14;n++){const x=pad+r+(n%7)*(r*2+gap),y=h*.27+r+Math.floor(n/7)*(r*2+gap);c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle='#33495199';c.lineWidth=1;if(n<12){c.fillStyle='#334951cc';c.fill();}else c.stroke();}
   text('12',pad,h-70,size,'"Portfolio Sans", sans-serif');c.font=`400 ${size}px "Portfolio Sans"`;text('/14',pad+c.measureText('12').width,h-70,size*.55,'"Portfolio Sans", sans-serif');
  }else if(index===2){
   ['I','II','III'].forEach((n,i)=>{const x=pad+i*(w-pad*2)/3;text(t(['会议一','会议二','会议三'][i]),x,h*.26,10);text(['10','12','03'][i],x,h*.26+42,26,'"Portfolio Sans", sans-serif');});c.strokeStyle='#F5F0E666';c.beginPath();c.moveTo(pad,h*.26+61);c.lineTo(w-pad,h*.26+61);c.stroke();
   text('25',pad,h-70,size,'"Portfolio Sans", sans-serif');c.font=`400 ${size}px "Portfolio Sans"`;text('/25',pad+c.measureText('25').width,h-70,size*.55,'"Portfolio Sans", sans-serif');
  }else{
   c.save();c.translate(w*.05,h*.22);c.scale(w*.9/600,w*.9/600);c.strokeStyle=ink;c.lineWidth=1.2;c.stroke(new Path2D('M50 140H170M170 140L265 55M170 140L265 140M170 140L265 225M265 55H355L455 140H555M265 140H355M265 225H355L455 140'));
   [50,170,455,555].forEach(x=>{c.beginPath();c.arc(x,140,7,0,Math.PI*2);c.stroke();});text(t('情境'),25,180,12);text(t('选择'),145,180,12);text(t('属性变化'),275,34,12);text(t('后续叙事'),450,180,12);c.restore();text(t('全国三等奖'),pad,h*.83,size);
  }
  const foot=cover.querySelector('.cover-foot');if(foot)text(foot.textContent.trim(),pad,h-25,w<400?9:10);
  gl.bindTexture(gl.TEXTURE_2D,plane.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }
 function resize(){
  if(lost)return;
  const oldWidth=width,oldHeight=height,r=grid.getBoundingClientRect();gridTop=r.top+scrollY;gridLeft=r.left;
  width=Math.max(1,grid.clientWidth);height=Math.max(1,grid.offsetHeight);
  const pixelBudget=mobile()?1150000:3200000;
  const dpr=Math.min(devicePixelRatio||1,mobile()?1.2:1.5,Math.sqrt(pixelBudget/(width*height)),maxDimension/Math.max(width,height));
  const changed=planes.map(p=>{const frame=coverFrame(p.cover),changed=frame.width!==p.width||frame.height!==p.height;Object.assign(p,frame);return changed;});
  const ratioChanged=lastDpr!==dpr;lastDpr=dpr;
  if(oldWidth!==width||oldHeight!==height||ratioChanged){
   canvas.width=Math.max(1,Math.floor(width*dpr));canvas.height=Math.max(1,Math.floor(height*dpr));
   gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.uViewport,width,height);gl.uniform2f(uniforms.uResolution,canvas.width,canvas.height);
  }
  let rebuilt=false;planes.forEach((p,i)=>{if(ratioChanged||changed[i]){makeTexture(p,i);rebuilt=true;}});
  if(rebuilt)canvas.dataset.textureBuilds=String(Number(canvas.dataset.textureBuilds||0)+1);
  canvas.dataset.coordinateSpace='work-grid';canvas.dataset.pixelBudget=String(pixelBudget);
 }
 function draw(items,actualY,lag,reduced){
  if(lost)return;
  const visible=planes.filter(p=>{const screen=gridTop+p.top-actualY;return screen<innerHeight+200&&screen+p.height> -200;}).length;
  if(!reduced&&canvas.dataset.visible==='0'&&!visible)return;
  gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT);document.documentElement.classList.toggle('flight-ready',!reduced);
  if(reduced){canvas.dataset.mode='static';return;}
  // Keep all four covers in the bitmap, including offscreen ones. Native
  // scrolling can expose the next card before another JS frame runs.
  planes.forEach(p=>{
   const centerY=p.top+p.height*.5;
   const focused=p.el.matches(':focus-visible'),motion=focused?0:1;
   // Same restrained mobile factor as the earlier neoclassical portfolio.
   const factor=innerWidth<760?.65:1;
   const rx=motion*lag*19*factor,ry=0,rz=0;
   const bend=motion*lag*.24*p.height*factor,scale=1;
   // Clip each moving plane to its own cover window. The reserved caption
   // strip is outside this rectangle, including while scrolling backwards.
   const sx=canvas.width/width,sy=canvas.height/height,pad=6;
   const x0=Math.max(0,Math.floor((p.left-pad)*sx)),x1=Math.min(canvas.width,Math.ceil((p.left+p.width+pad)*sx));
   const y0=Math.max(0,Math.floor((p.top-pad)*sy)),y1=Math.min(canvas.height,Math.ceil((p.top+p.height+pad)*sy));
   if(x1<=x0||y1<=y0)return;
   gl.enable(gl.SCISSOR_TEST);gl.scissor(x0,canvas.height-y1,x1-x0,y1-y0);
   p.cover.dataset.frameRect=[gridLeft+p.left,gridTop+p.top-actualY,p.width,p.height].map(v=>v.toFixed(2)).join(',');
   gl.bindTexture(gl.TEXTURE_2D,p.texture);gl.uniform2f(uniforms.uCenter,p.left+p.width*.5,centerY);gl.uniform2f(uniforms.uSize,p.width,p.height);gl.uniform3f(uniforms.uAngles,rx*Math.PI/180,ry*Math.PI/180,rz*Math.PI/180);gl.uniform1f(uniforms.uBend,bend);gl.uniform1f(uniforms.uScale,scale);gl.uniform1f(uniforms.uFocal,Math.min(1200,p.width*1.6));gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
   p.cover.dataset.peakAngle=String(Math.max(Number(p.cover.dataset.peakAngle||0),Math.abs(rx)));
   p.cover.dataset.flight=`${rx.toFixed(3)},${ry.toFixed(3)},${bend.toFixed(3)}`;
  });
  if(visible){canvas.dataset.peakDown=String(Math.max(Number(canvas.dataset.peakDown||0),lag));canvas.dataset.peakUp=String(Math.min(Number(canvas.dataset.peakUp||0),lag));}
  canvas.dataset.mode='curved-planes';canvas.dataset.draws=String(++draws);canvas.dataset.visible=String(visible);canvas.dataset.impulse=lag.toFixed(5);
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;document.documentElement.classList.remove('flight-ready');canvas.style.display='none';});resize();return{resize,draw};
};
