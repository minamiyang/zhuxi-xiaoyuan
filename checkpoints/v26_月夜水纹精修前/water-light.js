// Shared world-space refracted sunlight: gently moving wave-lens folds on the stream bed.
// No image textures; the same field is stable across meshes and viewpoints.
export const causticGLSL=`
float waterCaustic(vec2 p,float t){
 // A smooth wave lens field: bright folds appear where refracted rays converge.
 // Its determinant contours make curved light ribbons, without polygonal cell edges.
 p*=8.5;
 p+=vec2(.45*sin(p.y*.63-t*.21),.38*sin(p.x*.57+t*.18));
 float a=cos(p.x+p.y*.28-t*.61);
 float b=cos(-p.x*.32+p.y*1.13+t*.43);
 float c=cos(p.x*.83-p.y*.76+t*.32);
 float d=cos(p.x*1.47+p.y*.51-t*.47);
 float xx=1.+.94*a+.13*b+.43*c+.29*d;
 float zz=1.+.08*a+1.04*b+.37*c+.035*d;
 float xz=.26*a-.37*b-.40*c+.10*d;
 float determinant=xx*zz-xz*xz;
 float width=max(.035,fwidth(determinant)*.72);
 float ribbon=1.-smoothstep(width,width+.13,abs(determinant));
 float focus=.62+.38*sin(p.x*.41+p.y*.63-t*.35);
 return ribbon*ribbon*focus;
}
`;
export function refractStreamBed(scene,time,sunEnergy,lightDirection){
 let count=0;
 scene.traverse(o=>{if(!o.isMesh||!/连通地形|浅溪透视河床石|砾石与溪岸卵石|树根半埋石/.test(o.name))return;
 for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(m.userData.streamRefraction)continue;m.userData.streamRefraction=true;count++;
  const previous=m.onBeforeCompile,cache=m.customProgramCacheKey();
  m.onBeforeCompile=shader=>{previous.call(m,shader);shader.uniforms.uWaterTime=time;shader.uniforms.uWaterSun=sunEnergy;shader.uniforms.uWaterLightDir=lightDirection;
   shader.vertexShader='varying vec3 vRefractedP;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvRefractedP=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader='varying vec3 vRefractedP;uniform float uWaterTime;uniform float uWaterSun;uniform vec3 uWaterLightDir;\n'+causticGLSL+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float streamCenter=3.55+.48*sin(-vRefractedP.z*.58)+.15*cos(-vRefractedP.z*1.2);
    float streamWidth=.72+.16*cos(vRefractedP.z*.8);
    float underwater=(1.-smoothstep(.335,.365,vRefractedP.y))*(1.-smoothstep(streamWidth-.05,streamWidth+.02,abs(vRefractedP.x-streamCenter)))*(1.-smoothstep(4.88,4.97,abs(vRefractedP.z)));
    float bedValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=mix(diffuseColor.rgb,bedValue*vec3(.66,.85,.97),underwater*.45);
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
    if(underwater>.001){
     vec3 transmitted=refract(-normalize(uWaterLightDir),vec3(0.,1.,0.),1./1.333);
     vec2 offset=transmitted.xz/max(.2,-transmitted.y)*max(0.,.36-vRefractedP.y);
     float caustic=waterCaustic(vRefractedP.xz-offset,uWaterTime);
     reflectedLight.directDiffuse*=1.+caustic*underwater*uWaterSun*1.7;
    }
   `);
  };m.customProgramCacheKey=()=>cache+'-lit-stream-v24';m.needsUpdate=true;
 }
 });return count;
}
