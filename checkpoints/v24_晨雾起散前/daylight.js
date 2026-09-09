import * as T from 'three';
const clamp=T.MathUtils.clamp, mix=T.MathUtils.lerp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const wrapHour=h=>((h%24)+24)%24;
// A continuous solar arc and eased radiometric controls, not a four-image crossfade.
export function sampleDay(hour){
 const h=wrapHour(hour),angle=(h-6)*Math.PI/12,altitude=Math.sin(angle),day=smooth(-.10,.20,altitude),high=smooth(.10,.8,altitude);
 const sunrise=smooth(5.35,6.15,h)*(1-smooth(6.65,8.6,h)),sunset=smooth(15.4,17.1,h)*(1-smooth(18.1,18.55,h));
 const golden=Math.max(sunrise,sunset),warm=Math.max((1-high)*day,golden*.96);
 const solarVisibility=smooth(5.75,6.25,h)*(1-smooth(18.05,18.55,h));
 const sunPower=3.65*Math.pow(Math.max(.095,altitude),.24)*solarVisibility*(1+.32*golden);
 const skySunPosition=[-13*Math.cos(angle)-3.5*Math.max(0,altitude),Math.max(.12,12*altitude),6-3*Math.cos(angle)];
 const sunPosition=[skySunPosition[0],Math.max(.12,12*Math.max(0,altitude)+4.3*golden),skySunPosition[2]];
 const lamps=1-smooth(-.13,.11,altitude);
 return {hour:h,altitude,day,high,warm,golden,sunrise,sunset,sunPower,lamps,moonPower:.64*(1-day),fog:.16*Math.exp(-(((h-6.2)/1.13)**2))*(1-smooth(7.3,8.5,h)),sunPosition,skySunPosition,exposure:mix(.97,1.03,day)};
}
const PALETTE=[
 [0,'#303948','#223859','#152a43'],[4.8,'#111c30','#344362','#131b2b'],
 [5.65,'#92929b','#8e9cad','#d6946e'],[6.35,'#c9ccc9','#c9d7e2','#efbd86'],[7.2,'#d0d4d1','#d1e0eb','#e6d5b5'],
 [8,'#d4d8d4','#d4e2ed','#c1d5e7'],[12,'#d5dce2','#cde2f5','#b8ccdf'],
 [15.5,'#d8d1c3','#d7e0e7','#c7cfd2'],[16.4,'#d1d2ce','#d5dde1','#efc48e'],[17.2,'#c7c8c1','#d1d3d7','#edb16f'],
 // Sunset warmth drains through neutral grey into blue-grey; no magenta sky or violet water.
 [17.8,'#aaa8a0','#afb6c3','#d88b53'],[18.3,'#7d828c','#78899f','#b66c43'],[19.1,'#485467','#465e7e','#78685e'],[20.3,'#303948','#223859','#152a43'],[24,'#303948','#223859','#152a43']
].map(([h,...c])=>[h,...c.map(x=>new T.Color(x))]);
function colorsAt(h){let i=0;while(i<PALETTE.length-2&&h>PALETTE[i+1][0])i++;const a=PALETTE[i],b=PALETTE[i+1],t=smooth(a[0],b[0],h);return a.slice(1).map((c,j)=>c.clone().lerp(b[j+1],t));}
export function createDaylight({scene,renderer,sun,fill,hemi,ground,noAO,camera}){
 let running=true,duration=240,anchorHour=6.35,anchorSeconds=0,lastHour=6.35,state=sampleDay(6.35);
 const fogUniforms={uGolden:{value:0},uDawnFog:{value:0},uFogTint:{value:new T.Color()},uWeatherTime:{value:0},uFogViewDir:{value:new T.Vector3()}};
 const patched=new Set(),practicals=[],panes=[],fixtures=[],fogObjects=[];
 // Broad, softly broken mist across the courtyard, bamboo roots and stream.
 const fogMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:fogUniforms,vertexShader:'varying vec3 fogP;void main(){vec4 p=modelMatrix*vec4(position,1.);fogP=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:`
 varying vec3 fogP;uniform float uDawnFog;uniform vec3 uFogTint;uniform float uWeatherTime;
 void main(){
  vec3 p=fogP;float t=uWeatherTime;
  float bank=3.55+.48*sin(-p.z*.58)+.15*cos(-p.z*1.2);
  float bounds=(1.-smoothstep(4.6,5.8,abs(p.x)))*(1.-smoothstep(3.7,4.95,abs(p.z)));
  float creek=exp(-pow((p.x-bank)/1.4,2.));
  float garden=exp(-pow((p.x+2.6)/2.5,2.)-pow((p.z-2.)/2.7,2.));
  float bamboo=exp(-pow((p.x+3.9)/1.8,2.)-pow((p.z+1.8)/3.,2.));
  float envelope=bounds*(.24+.44*creek+.48*garden+.38*bamboo);
  float wisps=.60+.25*sin(p.z*1.4+p.x*1.3-t*.095)+.15*sin(p.z*2.9-p.x*1.9+t*.064);
  float height=exp(-max(0.,p.y-.46)*1.65);
  gl_FragColor=vec4(uFogTint,envelope*max(.08,wisps)*height*uDawnFog*(.48*11./48.));
 }`});
 for(let i=0;i<48;i++){const o=new T.Mesh(new T.PlaneGeometry(11.6,9.9),fogMat);o.rotation.x=-Math.PI/2;o.position.set(0,.48+i*(1.3/47),0);o.renderOrder=5+i;o.name='小院晨雾 '+i;scene.add(o);fogObjects.push(o);noAO.push(o);}

 const warmColor=new T.Color('#ffbf71');
 function patch(root){root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m?.isMeshStandardMaterial||patched.has(m))continue;patched.add(m);const prev=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);const key=cache(),thinLeaf=/叶|凤仙花|草绿/.test(m.name);
 m.onBeforeCompile=shader=>{prev.call(m,shader);Object.assign(shader.uniforms,fogUniforms);
 shader.vertexShader='varying vec3 vWeatherWorld;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 weatherP=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 weatherP=instanceMatrix*weatherP;
 #endif
 vWeatherWorld=(modelMatrix*weatherP).xyz;`);
 shader.fragmentShader=`uniform float uGolden;varying vec3 vWeatherWorld;uniform float uDawnFog;uniform vec3 uFogTint;uniform float uWeatherTime;uniform vec3 uFogViewDir;\n`+shader.fragmentShader;
 if(thinLeaf)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 #if NUM_DIR_LIGHTS > 0
 // A bounded transmission lobe for thin foliage, lit by the same shadowed sun.
 float leafShadow=1.;
 #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
 DirectionalLightShadow leafDS=directionalLightShadows[0];
 leafShadow=getShadow(directionalShadowMap[0],leafDS.shadowMapSize,leafDS.shadowIntensity,leafDS.shadowBias,leafDS.shadowRadius,vDirectionalShadowCoord[0]);
 #endif
 float leafBack=pow(clamp(dot(-normal,directionalLights[0].direction)*.5+.5,0.,1.),2.);
 float leafEdge=pow(1.-max(dot(normal,geometryViewDir),0.),2.);
 reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[0].color*leafBack*(.12+.24*leafEdge)*leafShadow*uGolden;
 #endif
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
 if(uDawnFog>.00001){
 vec3 rd=uFogViewDir,origin=vWeatherWorld-rd*dot(vWeatherWorld-cameraPosition,rd), inv=1./(rd+vec3(.000001));
 vec3 aa=(vec3(-5.8,.38,-4.95)-origin)*inv,bb=(vec3(5.8,2.6,4.95)-origin)*inv;
 vec3 lo=min(aa,bb),hi=max(aa,bb);float t0=max(0.,max(lo.x,max(lo.y,lo.z))),t1=min(length(vWeatherWorld-origin),min(hi.x,min(hi.y,hi.z)));
 float fogDepth=0.;
 if(t1>t0){for(int i=0;i<6;i++){vec3 q=origin+rd*mix(t0,t1,(float(i)+.5)/6.);float height=exp(-max(0.,q.y-.38)*1.85);float bank=.72+.28*exp(-pow((q.x-3.6)/2.,2.));float drift=.76+.15*sin(q.x*1.25+q.z*.8-uWeatherTime*.055)+.09*sin(q.x*3.2-q.z*1.4+uWeatherTime*.038);fogDepth+=height*bank*drift;}fogDepth*=(t1-t0)/6.;}
 gl_FragColor.rgb=mix(gl_FragColor.rgb,uFogTint,1.-exp(-fogDepth*uDawnFog));
 }`);
 };m.customProgramCacheKey=()=>key+'-height-mist-v23-'+thinLeaf;m.needsUpdate=true;
 }});}
 // Lights originate inside existing Boolean openings; lattice geometry casts the projected pattern.
 function windowLight(name,p,w,h,side=false){
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{power:{value:0},tint:{value:warmColor}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float power;uniform vec3 tint;void main(){float center=exp(-length((vUv-vec2(.44,.58))*vec2(1.,.6))*1.6);float paper=.98+.02*sin(vUv.x*157.)*sin(vUv.y*193.);gl_FragColor=vec4(tint*(.6+1.8*center)*paper,power*.92);}'});
 const pane=new T.Mesh(new T.PlaneGeometry(w,h),mat);pane.name=name+' · 窗内柔光';pane.position.set(...p);if(side)pane.rotation.y=-Math.PI/2;scene.add(pane);panes.push(pane);noAO.push(pane);
 const light=new T.SpotLight('#ffc078',0,8,.69,.55,2);light.name=name+' · 透窗投光';light.position.set(p[0]+(side?.48:0),p[1]+.15,p[2]-(side?0:.55));light.target.position.set(p[0]-(side?3.0:0),.48,p[2]+(side?0:3.3));light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.00015;light.shadow.normalBias=.012;light.shadow.camera.near=.08;light.shadow.camera.far=9;light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;scene.add(light,light.target);practicals.push({light,power:side?18:25});
 }
 windowLight('西窗',[-3.1,2.2,-.13],.78,1.23);windowLight('东窗',[.3,2.2,-.13],.78,1.23);windowLight('山墙窗',[-3.87,2.25,-2.25],.83,1.08,true);
 const door=new T.SpotLight('#ffbb6d',0,9,.71,.65,2);door.name='堂屋 · 穿门暖光';door.position.set(-1.25,2.45,-.75);door.target.position.set(-1.25,.45,2.45);door.castShadow=true;door.shadow.mapSize.set(1024,1024);door.shadow.camera.near=.08;door.shadow.camera.far=10;door.shadow.normalBias=.013;door.shadow.bias=-.00012;door.shadow.autoUpdate=false;door.shadow.needsUpdate=true;scene.add(door,door.target);practicals.push({light:door,power:42});
 const lantern=new T.Mesh(new T.SphereGeometry(.085,16,12),new T.MeshStandardMaterial({color:'#d8b27d',emissive:'#ffc279',emissiveIntensity:0,roughness:.55}));lantern.position.set(-1.25,2.46,-.75);lantern.name='堂屋小灯';scene.add(lantern);fixtures.push(lantern);
 fill.castShadow=true;fill.shadow.mapSize.set(2048,2048);Object.assign(fill.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:40});fill.shadow.bias=-.0001;fill.shadow.normalBias=.02;fill.shadow.autoUpdate=false;fill.shadow.needsUpdate=true;fill.position.set(-3,10,-7);
 function apply(hour,seconds){lastHour=wrapHour(hour);state=sampleDay(hour);const s=state,[bg,sky,horizon]=colorsAt(s.hour);scene.background.copy(bg);scene.environmentIntensity=mix(.30,mix(.72,.86,s.high),s.day);scene.environmentRotation.y=(s.hour-12)*Math.PI/12;
 sun.position.set(...s.sunPosition);sun.intensity=s.sunPower;sun.color.set('#fff1de').lerp(new T.Color('#ffb65e'),s.warm*.92);hemi.color.set('#a7bddb').lerp(sky,s.day).lerp(new T.Color('#ffe0b3'),s.golden*.24);hemi.groundColor.set('#655141').lerp(new T.Color('#172035'),1-s.day);hemi.intensity=mix(.48,mix(.86,.58,s.high),s.day);fill.color.set('#a7c5ff');fill.intensity=s.moonPower+.18*s.day;renderer.toneMappingExposure=s.exposure;
 ground.material.color.copy(bg).multiplyScalar(mix(.65,.36,s.day));ground.material.emissive.copy(bg).multiplyScalar(mix(.82,.42,s.day));fogUniforms.uGolden.value=s.golden;fogUniforms.uDawnFog.value=s.fog;fogUniforms.uFogTint.value.copy(sky).lerp(new T.Color('#f3e2c5'),.44);fogUniforms.uWeatherTime.value=seconds;camera.getWorldDirection(fogUniforms.uFogViewDir.value);fogObjects.forEach(o=>o.visible=s.fog>.0001);
 panes.forEach(p=>{p.material.uniforms.power.value=s.lamps;p.visible=s.lamps>.0001;});fixtures.forEach(p=>p.material.emissiveIntensity=3*s.lamps);
 // Very small flame variation, entirely deterministic for narration-frame export.
 practicals.forEach(({light,power},i)=>{light.intensity=power*s.lamps*(1+.013*Math.sin(seconds*2.1+i)+.007*Math.sin(seconds*5.4+i*2));});
 return {...s,sky:sky.clone(),horizon:horizon.clone(),sunColor:sun.color.clone(),moonColor:fill.color.clone(),sunDirection:sun.position.clone().normalize(),moonDirection:fill.position.clone().normalize(),keyColor:(s.sunPower>.01?sun.color:fill.color).clone(),keyDirection:s.sunPower>.01?sun.position.clone().normalize():fill.position.clone().normalize()};
 }
 function hourAt(seconds){return running?wrapHour(anchorHour+(seconds-anchorSeconds)*24/duration):anchorHour;}
 return {patch,apply,hourAt,sample:sampleDay,get state(){return {...state,running,duration};},setHour(h,seconds){if(!Number.isFinite(h))throw Error('hour must be finite');anchorHour=wrapHour(h);anchorSeconds=seconds;running=false;},play(seconds){anchorHour=lastHour;anchorSeconds=seconds;running=true;},pause(seconds){anchorHour=hourAt(seconds);anchorSeconds=seconds;running=false;},setDuration(value,seconds){if(!Number.isFinite(value)||value<20)throw Error('cycle duration must be at least 20 seconds');anchorHour=hourAt(seconds);anchorSeconds=seconds;duration=value;},refreshShadows(){fill.shadow.needsUpdate=true;practicals.forEach(({light})=>light.shadow.needsUpdate=!light.shadow.map||state.lamps>.001);},dispose(){fogObjects.forEach(o=>o.geometry.dispose());fogMat.dispose();panes.forEach(p=>{p.geometry.dispose();p.material.dispose();});fixtures.forEach(p=>{p.geometry.dispose();p.material.dispose();});practicals.forEach(({light})=>light.dispose());fill.shadow.dispose();},practicals,panes,fogObjects};
}
