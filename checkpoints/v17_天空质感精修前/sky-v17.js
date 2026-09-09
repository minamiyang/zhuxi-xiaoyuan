import * as T from 'three';
// A quiet illustrated sky behind the diorama, sharing its daylight clock.
// Analytic shapes and seeded stars only: no external image assets or second renderer.
export function createStorySky({scene,camera,controls,ground,noAO,renderer}){
 const u={skyBase:{value:new T.Color()},skyTop:{value:new T.Color()},day:{value:1},warm:{value:0},clock:{value:0},time:{value:0},aspect:{value:1},detail:{value:1},viewShift:{value:0},sunX:{value:.25}};
 const mat=new T.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:u,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy, .999999,1.);}`,fragmentShader:`
 varying vec2 vUv;uniform vec3 skyBase,skyTop;uniform float day,warm,clock,time,aspect,detail,viewShift,sunX;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float disc(vec2 p,float r){float aa=max(fwidth(length(p)),.0005);return 1.-smoothstep(r-aa,r+aa,length(p));}
 float ellipse(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
 float softMin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
 vec4 cloud(vec2 p,float size,float seed){
 p/=size;float d=ellipse(p-vec2(-.35,-.03),vec2(.42,.22));
 d=softMin(d,ellipse(p-vec2(-.09,.15),vec2(.31,.32)),.13);
 d=softMin(d,ellipse(p-vec2(.24,.08),vec2(.38,.28)),.13);
 d=softMin(d,ellipse(p-vec2(.52,-.055),vec2(.35,.18)),.13);
 d=softMin(d,ellipse(p-vec2(.03,-.10),vec2(.56,.15)),.12);
 float a=1.-smoothstep(-.005,.025,d);
 float light=smoothstep(-.23,.29,p.y)*.62+.29;
 vec3 shade=mix(vec3(.49,.58,.62),vec3(.94,.95,.91),light);
 shade=mix(shade,shade*vec3(1.10,.93,.77),warm*.4);
 shade=mix(vec3(.10,.15,.23),shade,day);
 return vec4(shade,a);
 }
 float stars(vec2 p,float scale,float seed){
 vec2 q=p*scale,cell=floor(q),f=fract(q);float h=hash(cell+seed),h2=hash(cell+seed+13.1);
 vec2 center=vec2(.2+.6*h,.2+.6*h2);float r=mix(.013,.038,h2);
 float d=length(f-center),a=1.-smoothstep(r*.35,r+max(fwidth(q.x),fwidth(q.y))*.7,d);
 float twinkle=.78+.22*sin(time*(.32+h*.23)+h2*30.);
 return a*step(.65,h)*twinkle;
 }
 void main(){
 vec2 p=vUv*vec2(aspect,1.);
 vec3 color=mix(skyBase,skyTop,smoothstep(.25,1.,vUv.y)*.72);
 float night=1.-day;float scale=min(1.,aspect/.95);
 float starLight=stars(p+vec2(viewShift*.023,0.),15.,3.7)+stars(p+vec2(viewShift*.011,.07),24.,19.3)*.46;
 float upper=smoothstep(.40,.68,vUv.y);
 color+=vec3(.58,.65,.73)*starLight*night*night*upper*detail;
 // Sun follows the existing east-west light arc; the camera adds small background parallax.
 vec2 sunP=vec2(sunX*aspect,mix(.73,.76,scale)+.18*scale*sin((clock-6.)*3.14159265/12.));
 vec2 sp=p-sunP;float sr=.029*scale;
 float sunAlpha=smoothstep(.50,.88,day)*detail;
 color=mix(color,vec3(1.,.72,.32),exp(-dot(sp,sp)/.004)*.095*sunAlpha);
 vec3 sunTint=mix(vec3(1.55,1.27,.73),vec3(1.5,.85,.35),warm*.7);
 color=mix(color,sunTint,disc(sp,sr)*sunAlpha);
 // Full, softly yellow moon; subtle broad surface marks, never cold white.
 vec2 mp=p-vec2((.80+viewShift*.025)*aspect,mix(.70,.80,scale));
 float moonVisibility=(1.-smoothstep(.08,.45,day))*detail;
 float mr=.034*scale,moonA=disc(mp,mr)*moonVisibility;
 vec2 m=mp/mr;float limb=sqrt(max(0.,1.-dot(m,m)));
 float maria=exp(-length((m-vec2(-.25,.18))*vec2(2.8,2.1))*3.)
   +.6*exp(-length((m-vec2(.30,-.23))*vec2(3.4,2.8))*3.);
 vec3 moonTint=vec3(1.28,.99,.39)*(.88+.12*limb)*(1.-maria*.15);
 color=mix(color,vec3(.85,.70,.35),exp(-dot(mp,mp)/.0045)*moonVisibility*.055);
 color=mix(color,moonTint,moonA);
 for(int i=0;i<5;i++){
  if(aspect<.8&&i>2)break;
  float fi=float(i),seed=fi*7.13;
  float x=fract(.07+fi*mix(.38,.227,step(.8,aspect))+time*.00043+viewShift*.019);
  float y=.69+.13*hash(vec2(fi,5.2))+.012*sin(time*.018+fi);
  vec2 center=vec2(x*aspect,y);
  vec2 cp=vec2(mod(p.x-center.x+aspect*.5,aspect)-aspect*.5,p.y-center.y);
  vec4 c=cloud(cp,(.083+.025*hash(vec2(fi,3.2)))*scale,seed);
  float visibility=(.10+.63*day)*detail;
  color=mix(color,c.rgb,c.a*visibility);
 }
 gl_FragColor=vec4(color,1.);
 }`});
 const mesh=new T.Mesh(new T.PlaneGeometry(2,2),mat);mesh.name='绘本天空 · 日月云星';mesh.frustumCulled=false;mesh.renderOrder=-100;scene.add(mesh);noAO.push(mesh);
 // Fade the distant support plane into the sky, keeping the model's contact shadow.
 const floorU={skyViewportHeight:{value:1000}};const previous=ground.material.onBeforeCompile,cache=ground.material.customProgramCacheKey();
 ground.material.transparent=true;ground.material.depthWrite=false;ground.renderOrder=-20;
 ground.material.onBeforeCompile=shader=>{previous.call(ground.material,shader);Object.assign(shader.uniforms,floorU);
 shader.vertexShader='varying vec3 vSkyFloor;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSkyFloor=(modelMatrix*vec4(transformed,1.)).xyz;');
 shader.fragmentShader='varying vec3 vSkyFloor;uniform float skyViewportHeight;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`diffuseColor.a*=(1.-smoothstep(7.5,15.,length(vSkyFloor.xz)))*(1.-smoothstep(.56,.91,gl_FragCoord.y/skyViewportHeight));\n#include <opaque_fragment>`);
 };ground.material.customProgramCacheKey=()=>cache+'-sky-floor-v17';ground.material.needsUpdate=true;
 const size=new T.Vector2(),lightP=new T.Vector3();
 function update(d,seconds){
  renderer.getDrawingBufferSize(size);floorU.skyViewportHeight.value=size.y;u.aspect.value=size.x/size.y;
  u.skyBase.value.copy(scene.background);u.skyTop.value.copy(d.sky);u.day.value=d.day;u.warm.value=d.warm;u.clock.value=d.hour;u.time.value=seconds;
  u.detail.value=1.-T.MathUtils.smoothstep(camera.zoom,1.2,2.7)*.93;
  const azimuth=Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z);u.viewShift.value=Math.sin(azimuth+.744);
  lightP.set(...d.sunPosition).project(camera);u.sunX.value=T.MathUtils.clamp(.5+lightP.x*.25-.10*(1.-T.MathUtils.smoothstep(d.hour,8,11)),.12,.85);
 }
 return {mesh,update,get state(){return {day:u.day.value,detail:u.detail.value,sunX:u.sunX.value,seconds:u.time.value};},dispose(){mesh.geometry.dispose();mat.dispose();}};
}
