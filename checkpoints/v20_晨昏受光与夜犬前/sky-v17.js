import * as T from 'three';
// A quiet illustrated sky behind the diorama, sharing its daylight clock.
// Analytic shapes and seeded stars only: no external image assets or second renderer.
export function createStorySky({scene,camera,controls,ground,noAO,renderer}){
 const u={skyBase:{value:new T.Color()},skyTop:{value:new T.Color()},skyHorizon:{value:new T.Color()},dusk:{value:0},sunVis:{value:1},moonVis:{value:0},starVis:{value:0},sunWarm:{value:0},day:{value:1},warm:{value:0},clock:{value:0},time:{value:0},aspect:{value:1},detail:{value:1},viewShift:{value:0},sunX:{value:.25},moonP:{value:new T.Vector2(.8,.8)}};
 const mat=new T.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:u,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy, .999999,1.);}`,fragmentShader:`
 varying vec2 vUv;uniform vec3 skyBase,skyTop,skyHorizon;uniform float dusk,sunVis,moonVis,starVis,sunWarm;uniform float day,warm,clock,time,aspect,detail,viewShift,sunX;uniform vec2 moonP;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float disc(vec2 p,float r){float aa=max(fwidth(length(p)),.0005);return 1.-smoothstep(r-aa,r+aa,length(p));}
 float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
 }
 float fbm(vec3 p){return noise3(p)*.55+noise3(p*2.07+11.7)*.28+noise3(p*4.21+27.3)*.12+noise3(p*8.43)*.05;}
 float cloudDensity(vec3 p,float seed){
  vec3 q=p+vec3(seed*3.1,0.,time*.055);
  float n=fbm(q*4.2);
  float body=1.-length(p/vec3(1.08,.38,.49));
  float puff=1.-length((p-vec3(-.35,.16,0.))/vec3(.49,.40,.45));
  float puff2=1.-length((p-vec3(.24,.22,-.02))/vec3(.42,.43,.40));
  float shape=max(body,max(puff,puff2));
  return max(0.,shape+(n-.53)*.60)*3.2;
 }
 vec4 cloud(vec2 p,float size,float seed){
  p/=size;
  if(abs(p.x)>1.30||p.y<-.56||p.y>.81)return vec4(0.);
  // Integrate changing density through a shallow cloud volume: a soft rim,
  // lit billows and darker interiors replace the former flat cloud silhouette.
  float alpha=0.;vec3 sum=vec3(0.);
  vec3 lightDir=normalize(mix(vec3(-.45,.8,.6),vec3(1.,.15,.35),dusk));
  for(int k=0;k<11;k++){
   vec3 q=vec3(p,.66-float(k)*.132);
   float density=cloudDensity(q,seed);
   if(density>.001){
    float ahead=cloudDensity(q+lightDir*.19,seed);
    float sunlit=clamp(.70+(density-ahead)*.7,.12,1.)*(.64+.36*smoothstep(-.25,.48,q.y));
    vec3 lit=mix(vec3(.31,.40,.48),vec3(1.18,1.15,1.04),sunlit);
    // Cool dense interiors with a thin, brighter edge toward the low sun.
    float rim=pow(clamp(1.-ahead*1.5,0.,1.),2.0);
    vec3 sunsetLit=mix(vec3(.19,.23,.30),vec3(.92,.37,.17),pow(sunlit,1.4));
    sunsetLit+=vec3(1.35,.65,.20)*rim*.65;
    lit=mix(lit,sunsetLit,dusk*.90);
    lit=mix(vec3(.055,.078,.13)+vec3(.10,.12,.16)*sunlit,lit,max(day,dusk*.8));
    float a=1.-exp(-density*.40);
    sum+=(1.-alpha)*a*lit;alpha+=(1.-alpha)*a;
   }
  }
  return vec4(sum/max(alpha,.0001),alpha);
 }
 float crater(vec2 p){
  vec2 cell=floor(p),f=fract(p);float value=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
   vec2 g=vec2(float(x),float(y));float h=hash(cell+g+17.1);
   vec2 c=vec2(hash(cell+g),hash(cell+g+9.2));float r=.08+.16*h;
   float d=length(g+c-f);
   value+=exp(-pow((d-r)/.033,2.))*.055-exp(-d*d/(r*r)*3.)*.07;
  }
  return value;
 }
 float stars(vec2 p,float scale,float seed){
  vec2 q=p*scale,cell=floor(q),f=fract(q);float h=hash(cell+seed),h2=hash(cell+seed+13.1);
  vec2 center=vec2(.2+.6*h,.2+.6*h2),delta=f-center;
  float r=mix(.013,.040,h2),d=length(delta);
  float aa=max(fwidth(q.x),fwidth(q.y))*.7;
  float core=1.-smoothstep(r*.25,r+aa,d);
  float phase=.5+.5*sin(time*(1.2+h*1.6)+h2*30.);
  float twinkle=.18+.82*phase*phase;
  float glow=exp(-d*d/(r*r*8.))*.035;
  float rays=(exp(-abs(delta.x)*210.-abs(delta.y)*33.)+exp(-abs(delta.y)*210.-abs(delta.x)*33.))*step(.89,h2)*.32;
  return (core+glow)*step(.885,h)*twinkle;
 }
 void main(){
 vec2 p=vUv*vec2(aspect,1.);
 vec3 color=mix(skyBase,skyTop,smoothstep(.25,1.,vUv.y)*.72);
 float night=1.-day;float scale=min(1.,aspect/.95);
 float starLight=stars(p+vec2(viewShift*.023,0.),15.,3.7);
 float moonSpace=smoothstep(.14,.28,length(p-moonP*vec2(aspect,1.)));
 float upper=smoothstep(.40,.68,vUv.y);
 color+=vec3(.37,.43,.51)*starLight*starVis*upper*detail*moonSpace;

 // Sun follows the existing east-west light arc; the camera adds small background parallax.
 vec2 sunP=vec2(sunX*aspect,mix(.73,.76,scale)+.18*scale*sin((clock-6.)*3.14159265/12.)-.12*smoothstep(16.,18.6,clock));
 // Evening air is layered around the descending light, not a uniform pink wash.
 float elevation=p.y-sunP.y;
 vec3 evening=mix(vec3(.28,.31,.36),vec3(.53,.205,.095),exp(-pow(elevation/.28,2.)));
 evening=mix(evening,vec3(.47,.20,.16),smoothstep(.025,.17,elevation));
 evening=mix(evening,vec3(.17,.29,.43),smoothstep(.12,.39,elevation));
 float afterglow=exp(-pow((p.x-sunP.x)/(.60*scale),2.)-pow(elevation/.16,2.));
 evening+=vec3(.30,.12,.025)*afterglow;
 color=mix(color,evening,dusk*.91*detail);
 vec2 sp=p-sunP;float sr=.029*scale*(1.-.08*dusk);
 float sunAlpha=sunVis*detail;
 float sd=length(sp)/sr;
 // Three scales of atmospheric scattering: broad amber air, a golden aureole,
 // and a luminous cream core. Preserve limb differences after tone mapping.
 vec3 aureole=mix(vec3(1.,.73,.35),vec3(1.,.43,.11),sunWarm);
 color+=aureole*(exp(-sd*sd/48.)*.27+exp(-sd*sd/9.)*.95+exp(-sd*sd/2.)*1.50)*sunAlpha;
 vec2 su=sp/sr;float sunZ=sqrt(max(0.,1.-dot(su,su)));
 float granules=(noise3(vec3(su*29.,sunZ*29.))-.5)*.025;
 vec3 sunTint=mix(vec3(2.4,1.2,.35),vec3(5.,4.2,2.4),sunZ);
 vec3 sunsetCore=mix(vec3(1.8,.54,.095),vec3(5.5,3.9,1.5),pow(sunZ,.65));
 sunTint=mix(sunTint,sunsetCore,sunWarm)*(1.+granules);
 float sunEdge=1.-smoothstep(.87,1.10,sd);
 color=mix(color,sunTint,sunEdge*sunAlpha);
 // A tight forward-scattering halo blends the limb into the surrounding air.
 color+=vec3(1.6,1.0,.32)*exp(-sd*sd/1.7)*sunAlpha;
 // Fine, wind-stretched veils partly cross the light; their lower rims catch gold.
 // World-free background coordinates keep these subtle bands behind the diorama.
 if(dusk*detail>.001){
  for(int j=0;j<4;j++){
   float fj=float(j);
   float cx=sunP.x+(-.22+.15*fj)*scale+sin(time*.018+fj)*.055;
   float cy=sunP.y+(-.025+.066*fj)*scale;
   if(j==1)cy=sunP.y+.010*scale;
   vec2 q=vec2((p.x-cx)/(.33*scale),(p.y-cy)/(.014*scale));
   float bend=(noise3(vec3(p.x*3.8+fj*11.,fj,time*.014))-.5)*.75;
   float fiber=fbm(vec3(p.x*8.+time*.018,p.y*115.,fj*17.));
   float body=exp(-pow((q.y+bend)/(.38+fiber*.8),2.))*exp(-q.x*q.x*1.3);
   float broken=smoothstep(.27,.62,noise3(vec3(p.x*14.+fj*8.,fj*4.,time*.018)));
   float veil=body*(.35+.65*broken);
   vec3 shade=mix(vec3(.27,.29,.36),vec3(.74,.32,.12),afterglow*.75);
   color=mix(color,shade,veil*dusk*.52*detail);
   float rim=exp(-pow((q.y+bend+.45)/.13,2.))*exp(-q.x*q.x*1.6)*(.35+.65*broken);
   color+=vec3(.72,.34,.085)*rim*afterglow*dusk*.26*detail;
  }
 }
 // The full yellow moon now travels on its own night arc with the scene clock.
 vec2 mp=p-moonP*vec2(aspect,1.);
 float moonVisibility=moonVis*detail;
 float mr=.034*scale,moonA=disc(mp,mr)*moonVisibility;
 float md=length(mp)/mr;
 color+=vec3(.43,.33,.14)*(exp(-md*md/15.)*.31+exp(-md*md/3.6)*.40)*moonVisibility;
 if(moonA>.0001){
  vec2 m=mp/mr;float limb=sqrt(max(0.,1.-dot(m,m)));vec3 sphere=vec3(m,limb);
  float field=fbm(sphere*3.5+vec3(8.2,4.1,1.9));
  float maria=smoothstep(.43,.66,field);
  float fine=fbm(sphere*38.)-.5;
  float surface=(1.-maria*.36)+fine*.10+crater(m*9.);
  vec3 moonTint=vec3(1.43,1.10,.47)*surface*(.84+.16*limb);
  color=mix(color,moonTint,moonA);
 }
 for(int i=0;i<5;i++){
  if(aspect<.8&&i>2)break;
  float fi=float(i),seed=fi*7.13;
  float x=fract(.07+fi*mix(.38,.227,step(.8,aspect))+time*(.0026+.0007*hash(vec2(fi,2.1)))+viewShift*.019);
  float y=.69+.13*hash(vec2(fi,5.2))+.009*sin(time*.27+fi*2.1);
  vec2 center=vec2(x*aspect,y);
  vec2 cp=vec2(mod(p.x-center.x+aspect*.5,aspect)-aspect*.5,p.y-center.y);
  cp/=mix(vec2(1.),vec2(1.75,.65),dusk);
  vec4 c=cloud(cp,(.083+.025*hash(vec2(fi,3.2)))*scale*(1.+.025*sin(time*.19+fi)),seed);
  float cloudDay=max(day,dusk*.8);
  float cloudKeep=mix(i==0?1.:0.,1.,cloudDay);
  float visibility=mix(.045,.89,cloudDay)*cloudKeep*detail*mix(moonSpace,1.,cloudDay);
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
  u.skyBase.value.copy(scene.background);u.skyTop.value.copy(d.sky);u.skyHorizon.value.copy(d.horizon);u.day.value=d.day;u.warm.value=d.warm;u.clock.value=d.hour;u.time.value=seconds;
  const sm=(a,b,x)=>T.MathUtils.smoothstep(x,a,b),h=d.hour;
  u.dusk.value=sm(15.5,17.35,h)*(1.-sm(18.35,19.65,h));
  u.sunWarm.value=Math.max(d.warm*.45,sm(15.5,17.35,h));
  u.sunVis.value=sm(5.75,6.25,h)*(1.-sm(18.05,18.55,h));
  u.moonVis.value=(1.-sm(.08,.45,d.day))*(h>12?sm(18.65,19.45,h):1.-sm(5.40,5.72,h));
  u.starVis.value=(1.-d.day)*(h>12?sm(19.15,20.,h):1.);
  u.detail.value=1.-T.MathUtils.smoothstep(camera.zoom,1.2,2.7)*.93;
  const azimuth=Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z);u.viewShift.value=Math.sin(azimuth+.744);
  const nightPhase=((d.hour<12?d.hour+24:d.hour)-18)/12, responsive=Math.min(1,u.aspect.value/.95);
  u.moonP.value.set(.90-.56*nightPhase+u.viewShift.value*.025,.74+.17*Math.sin(Math.PI*nightPhase)*responsive);
  lightP.set(...d.sunPosition).project(camera);u.sunX.value=T.MathUtils.clamp(.5+lightP.x*.25-.10*(1.-T.MathUtils.smoothstep(d.hour,8,11)),.12,.85);
 }
 return {mesh,update,get state(){return {day:u.day.value,detail:u.detail.value,sunX:u.sunX.value,moon:u.moonP.value.toArray(),dusk:u.dusk.value,sunVisible:u.sunVis.value,moonVisible:u.moonVis.value,starsVisible:u.starVis.value,seconds:u.time.value};},dispose(){mesh.geometry.dispose();mat.dispose();}};
}
