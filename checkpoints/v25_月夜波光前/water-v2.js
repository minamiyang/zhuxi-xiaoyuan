import * as THREE from 'three';
import {riverCenter,riverHalfWidth} from './motion.js';
import {refractStreamBed} from './water-light.js';
export function createStream(renderer,scene,camera,sun){
 const positions=[],indices=[];const rows=200,cols=16;
 for(let j=0;j<=rows;j++){const z=-4.96+9.92*j/rows,center=riverCenter(z),w=riverHalfWidth(z)+.024;for(let i=0;i<=cols;i++)positions.push(center-w+2*w*i/cols,0,z);}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;indices.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const reflection=new THREE.WebGLRenderTarget(1024,1024,{type:THREE.HalfFloatType});
 const uniforms=THREE.UniformsUtils.merge([THREE.UniformsLib.lights,{uTime:{value:0},daylightGain:{value:1},keyIsMoon:{value:0},solarEnergy:{value:1},moonEnergy:{value:0},golden:{value:0},sunColor:{value:new THREE.Color()},moonColor:{value:new THREE.Color()},moonDir:{value:new THREE.Vector3()},keyColor:{value:new THREE.Color(1,.91,.7)},skyTop:{value:new THREE.Color(.13,.24,.36)},skyHorizon:{value:new THREE.Color(.74,.80,.86)},reflectionBG:{value:scene.background.clone()},mirror:{value:reflection.texture},textureMatrix:{value:new THREE.Matrix4()},eyeDir:{value:new THREE.Vector3()},sunDir:{value:sun.position.clone().normalize()},waterColor:{value:new THREE.Color().setRGB(.18,.275,.325)}}]);
 const waterSun={value:1};const refractedMaterials=refractStreamBed(scene,uniforms.uTime,waterSun,uniforms.sunDir);
 const mat=new THREE.ShaderMaterial({uniforms,lights:true,transparent:true,depthWrite:false,side:THREE.FrontSide,vertexShader:`
 varying vec3 vWorld;varying vec4 vMirror;uniform mat4 textureMatrix;
 #include <common>
 #include <shadowmap_pars_vertex>
 void main(){
  vec4 worldPosition=modelMatrix*vec4(position,1.);vWorld=worldPosition.xyz;vMirror=textureMatrix*worldPosition;
  vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <shadowmap_vertex>
 }`,fragmentShader:`
 uniform float uTime;uniform float daylightGain;uniform float keyIsMoon;uniform float solarEnergy,moonEnergy,golden;uniform vec3 sunColor,moonColor,moonDir;uniform vec3 keyColor;uniform vec3 skyTop;uniform vec3 skyHorizon;uniform vec3 reflectionBG;uniform sampler2D mirror;uniform vec3 eyeDir;uniform vec3 sunDir;uniform vec3 waterColor;varying vec3 vWorld;varying vec4 vMirror;
 #include <common>
 #include <packing>
 #include <lights_pars_begin>
 #include <shadowmap_pars_fragment>
 #include <shadowmask_pars_fragment>
 void main(){
  vec2 p=vWorld.xz;float t=uTime;
  float dx=.11*cos(p.x*13.+p.y*7.-t*1.55)+.045*cos(p.x*28.-p.y*11.+t*.94)+.021*cos(p.x*68.+p.y*27.-t*2.2);
  float dz=.12*cos(p.y*18.-p.x*4.-t*1.65)+.045*cos(p.x*19.+p.y*33.+t*.76);
  vec3 n=normalize(vec3(-dx,1.,-dz));vec3 e=normalize(eyeDir);float fresnel=.025+.975*pow(1.-max(dot(n,e),0.),5.);
  vec2 uv=vMirror.xy/vMirror.w+n.xz*.027;vec3 refl=texture2D(mirror,uv).rgb;
  vec3 ray=reflect(-e,n);vec3 sky=mix(skyHorizon,skyTop,smoothstep(.12,.92,ray.y));
  float skyMask=1.-smoothstep(.005,.055,length(refl-reflectionBG));refl=mix(refl,sky,skyMask);
  float shadow=1.,moonShadow=1.;
 #ifdef USE_SHADOWMAP
 #if NUM_DIR_LIGHT_SHADOWS > 0
 DirectionalLightShadow ds=directionalLightShadows[0];shadow=getShadow(directionalShadowMap[0],ds.shadowMapSize,ds.shadowIntensity,ds.shadowBias,ds.shadowRadius,vDirectionalShadowCoord[0]);
 #endif
 #if NUM_DIR_LIGHT_SHADOWS > 1
 {DirectionalLightShadow ms=directionalLightShadows[1];moonShadow=getShadow(directionalShadowMap[1],ms.shadowMapSize,ms.shadowIntensity,ms.shadowBias,ms.shadowRadius,vDirectionalShadowCoord[1]);}
 #endif
 #endif
 // Two separate light responses: a fading sun must not erase moon or sky reflection.
  vec3 halfDir=normalize(sunDir+e),moonHalf=normalize(moonDir+e);
  float solarDot=max(dot(n,halfDir),0.),moonDot=max(dot(n,moonHalf),0.);
  float spec=pow(solarDot,160.)*7.+pow(solarDot,22.)*1.6;
  float moonSpec=pow(moonDot,110.)*3.2+pow(moonDot,24.)*.42;
  vec3 scatter=waterColor*(.70+.30*shadow)*daylightGain;
  float wave=sin(p.y*35.-p.x*9.-t*1.25+1.3*sin(p.x*7.+p.y*4.+t*.28));
  float crest=pow(max(0.,wave),24.);
  float breakup=smoothstep(.12,.88,.5+.5*sin(p.x*18.+p.y*6.+t*.7));
  breakup*=smoothstep(.14,.86,.5+.5*sin(p.x*9.1-p.y*4.7+sin(p.y*1.6+t*.2)));
  float ripple=crest*breakup*.30;
  // The open sky is a broad reflection source even where a branch shades direct sun.
  // Keep reflected geometry at its already-lit brightness, without another night multiplier.
  refl=mix(refl,sky,.08+.12*golden);
  float skySheen=pow(smoothstep(.18,.85,ray.y),3.)*.12;
  vec3 crestColor=mix(vec3(.80,.88,.94),skyHorizon,golden*.84);
  float skyEnergy=.16+.84*daylightGain;
  // Compose transmission and reflected radiance once; do not attenuate reflection
  // a second time through the transparent material's alpha blend.
  float reflectionWeight=clamp(.19+fresnel*.62,.19,.76);
  float absorption=.09;
  float alpha=reflectionWeight+absorption*(1.-reflectionWeight);
  vec3 color=(scatter*absorption*(1.-reflectionWeight)+refl*reflectionWeight)
    +crestColor*(skySheen+ripple*(.40+.60*shadow))*skyEnergy*.4
    // Broken warm sky radiance on the moving crests; keep the clear troughs cool.
    +sunColor*ripple*golden*solarEnergy*.85*(.30+.70*shadow)
    +sunColor*spec*solarEnergy*shadow*.4
    +moonColor*moonSpec*moonEnergy*moonShadow*(.30+.70*crest*breakup)*.4;
  float center=3.55+.48*sin(-p.y*.58)+.15*cos(-p.y*1.2);
  float depth=1.-smoothstep(.16,1.05,abs(p.x-center));
  gl_FragColor=vec4(color/max(alpha,.001),alpha);
 }`});
 const water=new THREE.Mesh(geometry,mat);water.name='living_stream';water.receiveShadow=true;water.position.y=.360;water.renderOrder=3;scene.add(water);
 const mirrorCamera=camera.clone();const normal=new THREE.Vector3(0,1,0),plane=new THREE.Plane(normal,-.359);const target=new THREE.Vector3(),pos=new THREE.Vector3();const bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
 let last=-100,dirty=true;const excluded=[];
 function update(t,force=false){uniforms.uTime.value=t;camera.getWorldDirection(uniforms.eyeDir.value).negate();if(!force&&!dirty&&t-last<.16)return;last=t;dirty=false;
  camera.getWorldPosition(pos);camera.getWorldDirection(target);target.add(pos);pos.y=2*.36-pos.y;target.y=2*.36-target.y;mirrorCamera.position.copy(pos);mirrorCamera.up.copy(camera.up).reflect(normal);mirrorCamera.lookAt(target);mirrorCamera.near=camera.near;mirrorCamera.far=camera.far;mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);mirrorCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);mirrorCamera.updateMatrixWorld();
  uniforms.textureMatrix.value.copy(bias).multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);
  const oldTarget=renderer.getRenderTarget(),oldClip=renderer.clippingPlanes,oldAuto=renderer.shadowMap.autoUpdate,oldNeeds=renderer.shadowMap.needsUpdate,viewport=new THREE.Vector4();renderer.getViewport(viewport);
  water.visible=false;const states=excluded.map(o=>o.visible);excluded.forEach(o=>o.visible=false);renderer.clippingPlanes=[plane];renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.setRenderTarget(reflection);renderer.clear();renderer.render(scene,mirrorCamera);renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.clippingPlanes=oldClip;renderer.shadowMap.autoUpdate=oldAuto;renderer.shadowMap.needsUpdate=oldNeeds;water.visible=true;excluded.forEach((o,i)=>o.visible=states[i]);
 }
 return {water,reflection,update,excluded,refractedMaterials,setLighting(d){waterSun.value=Math.min(1,d.sunPower/2.2);uniforms.daylightGain.value=.14+.86*Math.max(d.day,d.golden*.58);uniforms.keyIsMoon.value=d.sunPower>.01?0:1;uniforms.keyColor.value.copy(d.keyColor);uniforms.sunDir.value.copy(d.sunDirection);uniforms.moonDir.value.copy(d.moonDirection);uniforms.solarEnergy.value=Math.min(1.6,d.sunPower/2.2);uniforms.moonEnergy.value=.15*d.moonPower/.64*(d.hour>12?THREE.MathUtils.smoothstep(d.hour,18.65,19.45):1-THREE.MathUtils.smoothstep(d.hour,5.4,5.72));uniforms.golden.value=d.golden;uniforms.sunColor.value.copy(d.sunColor);uniforms.moonColor.value.copy(d.moonColor);uniforms.skyTop.value.copy(d.sky).multiplyScalar(.5);uniforms.skyHorizon.value.copy(d.horizon).lerp(new THREE.Color().setRGB(1.25,.65,.24),d.golden*.82);uniforms.reflectionBG.value.copy(scene.background);},dirty(){dirty=true;},dispose(){reflection.dispose();geometry.dispose();mat.dispose();}};
}
export function createWakes(scene,ducks){
 const wakes=ducks.map((duck,i)=>{const group=new THREE.Group();group.renderOrder=4;const rings=[];for(let j=0;j<3;j++){const g=new THREE.RingGeometry(.97,1,80);g.rotateX(-Math.PI/2);const m=new THREE.MeshBasicMaterial({color:0xd2dedc,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide});const r=new THREE.Mesh(g,m);group.add(r);rings.push(r);}scene.add(group);return {group,rings};});
 return {objects:wakes.map(w=>w.group),update(t){wakes.forEach((w,i)=>{const duck=ducks[i];if(!duck)return;w.group.position.set(duck.position.x,.367,duck.position.z);w.group.rotation.y=duck.rotation.y;w.rings.forEach((r,j)=>{const a=((t*.28+j/3)%1);r.scale.set(.16+.19*a,1,.28+.27*a);r.position.z=-.07-a*.12;r.material.opacity=.10*(1-a)*(1-a);});});}};
}
