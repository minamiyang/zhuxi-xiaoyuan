import * as THREE from 'three';
export function installSoftSunShadows(){
 const old=THREE.ShaderChunk.shadowmap_pars_fragment;
 const start='\t\t\tvec2 texelSize = vec2( 1.0 ) / shadowMapSize;';
 const a=old.indexOf(start,old.indexOf('#if defined( SHADOWMAP_TYPE_PCF )')),b=old.indexOf('\n\t\t#elif defined( SHADOWMAP_TYPE_PCF_SOFT )',a);
 if(a<0||b<0)throw Error('Pinned Three.js shadow shader anchor changed');
 // Bounded Poisson PCF with a blocker-distance estimate: sharp contact, wider penumbra at separation.
 const replacement=`
 vec2 texelSize=vec2(1.0)/shadowMapSize;
 float blocked=0.0,avgDepth=0.0;
 for(int i=0;i<12;i++){
  float angle=float(i)*2.39996323;vec2 off=vec2(cos(angle),sin(angle))*sqrt((float(i)+.5)/12.0)*.004;
  float depth=unpackRGBAToDepth(texture2D(shadowMap,shadowCoord.xy+off));
  if(depth<shadowCoord.z-.00025){avgDepth+=depth;blocked+=1.0;}
 }
 float separation=blocked>0.0?max(0.0,shadowCoord.z-avgDepth/max(blocked,1.0)):0.0;
 float radius=clamp(1.1+separation*1900.0,1.1,20.0);
 shadow=0.0;
 for(int i=0;i<24;i++){
  float angle=float(i)*2.39996323;vec2 off=vec2(cos(angle),sin(angle))*sqrt((float(i)+.5)/24.0)*texelSize*radius;
  shadow+=texture2DCompare(shadowMap,shadowCoord.xy+off,shadowCoord.z);
 }
 shadow/=24.0;
 `;
 THREE.ShaderChunk.shadowmap_pars_fragment=old.slice(0,a)+replacement+old.slice(b);
}
export function createSkyEnvironment(renderer){
 const sky=new THREE.Scene();
 const mat=new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 vDir;void main(){vec3 d=normalize(vDir);float h=clamp(d.y*.5+.5,0.,1.);vec3 c=mix(vec3(.20,.16,.105),vec3(.45,.61,.86),smoothstep(.05,.96,h));c=mix(c,vec3(.90,.82,.67),exp(-pow(d.y/.20,2.))*.46);vec3 sun=normalize(vec3(-5.,8.,4.));float halo=pow(max(dot(d,sun),0.),32.);c+=vec3(1.,.78,.48)*halo*.6;gl_FragColor=vec4(c,1.);}`});
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(20,32,16),mat);sky.add(sphere);const pmrem=new THREE.PMREMGenerator(renderer);const rt=pmrem.fromScene(sky,.12,.1,100);sphere.geometry.dispose();mat.dispose();pmrem.dispose();return rt;
}
const GLSL=`
 uniform float uSceneTime;uniform float uWindKind;uniform float uPeck;uniform float uBirdKind;
 vec3 animatePoint(vec3 p){
  if(uBirdKind>.5){
   float lo=uBirdKind<1.5?.42:.14;float hi=uBirdKind<1.5?.83:.31;
   float w=smoothstep(lo,hi,p.y)*smoothstep(-.06,.15,p.z);
   float a=uPeck*w;vec3 pivot=uBirdKind<1.5?vec3(0.,.38,.08):vec3(0.,.13,.06);
   vec3 q=p-pivot;p=pivot+vec3(q.x,q.y*cos(a)-q.z*sin(a),q.y*sin(a)+q.z*cos(a));
  }
  if(uWindKind>.5){
   float h=max(0.,p.y-.44);float limit=(uWindKind>3.5)? .55:(uWindKind>2.5?3.:5.4);
   float w=pow(clamp(h/limit,0.,1.),2.);float amp=uWindKind<1.5?.045:uWindKind<2.5?.065:uWindKind<3.5?.022:.036;
   float gust=.70+.30*sin(uSceneTime*.26+.3);float phase=p.x*.38+p.z*.24;
   p+=vec3(w*amp*sin(uSceneTime*.95+phase)*gust,w*.005*sin(uSceneTime*1.3+p.x),w*amp*.48*sin(uSceneTime*.87+phase+.7));
  }
  return p;
 }
`;
export function patchMotionMaterial(material,uniforms){
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=GLSL+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=animatePoint(transformed);');
 // Rotate the normal by the same local neck angle; wind derivatives are small at these amplitudes.
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 if(uBirdKind>.5){float lo=uBirdKind<1.5?.42:.14;float hi=uBirdKind<1.5?.83:.31;float a=uPeck*smoothstep(lo,hi,position.y)*smoothstep(-.06,.15,position.z);objectNormal=vec3(objectNormal.x,objectNormal.y*cos(a)-objectNormal.z*sin(a),objectNormal.y*sin(a)+objectNormal.z*cos(a));}`);
 };
 material.customProgramCacheKey=()=>`breeze-neck-v2-${uniforms.uWindKind.value}-${uniforms.uBirdKind.value}`;
 return material;
}
export function tuneMaterial(m,name){
 m.envMapIntensity=.16;
 if(name.includes('桥石')||name.includes('砂岩')){m.roughness=.94;if(m.normalScale)m.normalScale.set(.50,.50);}
 if(name.includes('筒瓦')||name.includes('瓦口')){m.roughness=.86;if(m.normalScale)m.normalScale.set(.40,.40);}
 if(name.includes('叶色')||name.includes('凤仙花')){m.roughness=.65;m.envMapIntensity=.21;}
 if(name.includes('木')){m.roughness=.83;if(m.normalScale)m.normalScale.set(.45,.45);}
 if(m.map)m.map.anisotropy=8;if(m.normalMap)m.normalMap.anisotropy=8;if(m.roughnessMap)m.roughnessMap.anisotropy=8;
 return m;
}
