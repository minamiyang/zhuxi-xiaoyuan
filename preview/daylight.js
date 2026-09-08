import * as T from 'three';
const clamp=T.MathUtils.clamp, mix=T.MathUtils.lerp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const wrapHour=h=>((h%24)+24)%24;
// A continuous solar arc and eased radiometric controls, not a four-image crossfade.
export function sampleDay(hour){
 const h=wrapHour(hour),angle=(h-6)*Math.PI/12,altitude=Math.sin(angle),day=smooth(-.10,.20,altitude),high=smooth(.10,.8,altitude),warm=(1-high)*day;
 const sunPower=4.8*Math.pow(Math.max(0,altitude),.24)*smooth(-.035,.09,altitude);
 const lamps=1-smooth(-.13,.11,altitude);
 return {hour:h,altitude,day,high,warm,sunPower,lamps,moonPower:.64*(1-day),fog:.105*Math.exp(-(((h-6.35)/1.32)**2)),sunPosition:[-13*Math.cos(angle),Math.max(.12,13*altitude),6-3*Math.cos(angle)],exposure:mix(.97,1.03,day)};
}
const PALETTE=[
 [0,'#303948','#223859','#152a43'],[4.8,'#111c30','#344362','#131b2b'],
 [5.65,'#757d85','#9da8b1','#52616e'],[6.35,'#beb1a1','#d6cdbe','#a2a4ae'],
 [8,'#d4d8d4','#d4e2ed','#c1d5e7'],[12,'#d5dce2','#cde2f5','#b8ccdf'],
 [15.5,'#d8d1c3','#d7e0e7','#b9cada'],[17.2,'#c5af98','#dbc3a5','#b2aaa0'],
 // Sunset warmth drains through neutral grey into blue-grey; no magenta sky or violet water.
 [17.8,'#7a7f81','#b4bebf','#b7afa0'],[18.3,'#535f6b','#8c9fac','#83909a'],[19.1,'#3c4a5a','#61758a','#45596a'],[20.3,'#303948','#223859','#152a43'],[24,'#303948','#223859','#152a43']
].map(([h,...c])=>[h,...c.map(x=>new T.Color(x))]);
function colorsAt(h){let i=0;while(i<PALETTE.length-2&&h>PALETTE[i+1][0])i++;const a=PALETTE[i],b=PALETTE[i+1],t=smooth(a[0],b[0],h);return a.slice(1).map((c,j)=>c.clone().lerp(b[j+1],t));}
export function createDaylight({scene,renderer,sun,fill,hemi,ground,noAO,camera}){
 let running=true,duration=240,anchorHour=6.35,anchorSeconds=0,lastHour=6.35,state=sampleDay(6.35);
 const fogUniforms={uDawnFog:{value:0},uFogTint:{value:new T.Color()},uWeatherTime:{value:0},uFogViewDir:{value:new T.Vector3()}};
 const patched=new Set(),practicals=[],panes=[],fixtures=[],fogObjects=[];
 // Thin world-space mist strata, depth-tested against the actual banks and bridge.
 const fogMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:fogUniforms,vertexShader:'varying vec3 fogP;void main(){vec4 p=modelMatrix*vec4(position,1.);fogP=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:`varying vec3 fogP;uniform float uDawnFog;uniform vec3 uFogTint;uniform float uWeatherTime;void main(){vec3 p=fogP;float bank=3.55+.48*sin(-p.z*.58)+.15*cos(-p.z*1.2);float envelope=exp(-pow((p.x-bank)/1.15,2.))*(1.-smoothstep(3.7,4.95,abs(p.z)));float wisps=.50+.25*sin(p.z*1.5+p.x*2.-uWeatherTime*.055)+.20*sin(p.z*3.4-p.x*1.6+uWeatherTime*.038);float height=exp(-(p.y-.46)*2.3);gl_FragColor=vec4(uFogTint,envelope*max(.05,wisps)*height*uDawnFog*.6);}`});
 for(let i=0;i<9;i++){const o=new T.Mesh(new T.PlaneGeometry(5,9.85),fogMat);o.rotation.x=-Math.PI/2;o.position.set(3,.48+i*.105,0);o.renderOrder=5+i;o.name='溪间薄雾 '+i;scene.add(o);fogObjects.push(o);noAO.push(o);}

 const warmColor=new T.Color('#ffbf71');
 function patch(root){root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m?.isMeshStandardMaterial||patched.has(m))continue;patched.add(m);const prev=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);const key=cache();
 m.onBeforeCompile=shader=>{prev.call(m,shader);Object.assign(shader.uniforms,fogUniforms);
 shader.vertexShader='varying vec3 vWeatherWorld;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 weatherP=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 weatherP=instanceMatrix*weatherP;
 #endif
 vWeatherWorld=(modelMatrix*weatherP).xyz;`);
 shader.fragmentShader=`varying vec3 vWeatherWorld;uniform float uDawnFog;uniform vec3 uFogTint;uniform float uWeatherTime;uniform vec3 uFogViewDir;\n`+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
 if(uDawnFog>.00001){
 vec3 rd=uFogViewDir,origin=vWeatherWorld-rd*dot(vWeatherWorld-cameraPosition,rd), inv=1./(rd+vec3(.000001));
 vec3 aa=(vec3(-5.8,.38,-4.95)-origin)*inv,bb=(vec3(5.8,2.1,4.95)-origin)*inv;
 vec3 lo=min(aa,bb),hi=max(aa,bb);float t0=max(0.,max(lo.x,max(lo.y,lo.z))),t1=min(length(vWeatherWorld-origin),min(hi.x,min(hi.y,hi.z)));
 float fogDepth=0.;
 if(t1>t0){for(int i=0;i<6;i++){vec3 q=origin+rd*mix(t0,t1,(float(i)+.5)/6.);float height=exp(-max(0.,q.y-.38)*2.9);float bank= .50+.50*exp(-pow((q.x-3.6)/2.,2.));float drift=.76+.15*sin(q.x*1.25+q.z*.8-uWeatherTime*.055)+.09*sin(q.x*3.2-q.z*1.4+uWeatherTime*.038);fogDepth+=height*bank*drift;}fogDepth*=(t1-t0)/6.;}
 gl_FragColor.rgb=mix(gl_FragColor.rgb,uFogTint,1.-exp(-fogDepth*uDawnFog));
 }`);
 };m.customProgramCacheKey=()=>key+'-height-mist-v1';m.needsUpdate=true;
 }});}
 // Lights originate inside existing Boolean openings; lattice geometry casts the projected pattern.
 function windowLight(name,p,w,h,side=false){
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{power:{value:0},tint:{value:warmColor}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float power;uniform vec3 tint;void main(){float center=exp(-length((vUv-vec2(.44,.58))*vec2(1.,.6))*1.6);float paper=.98+.02*sin(vUv.x*157.)*sin(vUv.y*193.);gl_FragColor=vec4(tint*(.6+1.8*center)*paper,power*.92);}'});
 const pane=new T.Mesh(new T.PlaneGeometry(w,h),mat);pane.name=name+' · 窗内柔光';pane.position.set(...p);if(side)pane.rotation.y=-Math.PI/2;scene.add(pane);panes.push(pane);noAO.push(pane);
 const light=new T.SpotLight('#ffc078',0,8,.69,.55,2);light.name=name+' · 透窗投光';light.position.set(p[0]+(side?.48:0),p[1]+.15,p[2]-(side?0:.55));light.target.position.set(p[0]-(side?3.0:0),.48,p[2]+(side?0:3.3));light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.00015;light.shadow.normalBias=.012;light.shadow.camera.near=.08;light.shadow.camera.far=9;light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;scene.add(light,light.target);practicals.push({light,power:side?15:20});
 }
 windowLight('西窗',[-3.1,2.2,-.13],.78,1.23);windowLight('东窗',[.3,2.2,-.13],.78,1.23);windowLight('山墙窗',[-3.87,2.25,-2.25],.83,1.08,true);
 const door=new T.SpotLight('#ffbb6d',0,9,.71,.65,2);door.name='堂屋 · 穿门暖光';door.position.set(-1.25,2.45,-.75);door.target.position.set(-1.25,.45,2.45);door.castShadow=true;door.shadow.mapSize.set(1024,1024);door.shadow.camera.near=.08;door.shadow.camera.far=10;door.shadow.normalBias=.013;door.shadow.bias=-.00012;door.shadow.autoUpdate=false;door.shadow.needsUpdate=true;scene.add(door,door.target);practicals.push({light:door,power:34});
 const lantern=new T.Mesh(new T.SphereGeometry(.085,16,12),new T.MeshStandardMaterial({color:'#d8b27d',emissive:'#ffc279',emissiveIntensity:0,roughness:.55}));lantern.position.set(-1.25,2.46,-.75);lantern.name='堂屋小灯';scene.add(lantern);fixtures.push(lantern);
 fill.castShadow=true;fill.shadow.mapSize.set(2048,2048);Object.assign(fill.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:40});fill.shadow.bias=-.0001;fill.shadow.normalBias=.02;fill.shadow.autoUpdate=false;fill.shadow.needsUpdate=true;fill.position.set(-3,10,-7);
 function apply(hour,seconds){lastHour=wrapHour(hour);state=sampleDay(hour);const s=state,[bg,sky,horizon]=colorsAt(s.hour);scene.background.copy(bg);scene.environmentIntensity=mix(.24,mix(.4,1,s.high),s.day);scene.environmentRotation.y=(s.hour-12)*Math.PI/12;
 sun.position.set(...s.sunPosition);sun.intensity=s.sunPower;sun.color.set('#fff1da').lerp(new T.Color('#ff9b46'),s.warm*.9);hemi.color.set('#a7bddb').lerp(sky,s.day);hemi.groundColor.set('#655141').lerp(new T.Color('#172035'),1-s.day);hemi.intensity=mix(.34,mix(.22,.48,s.high),s.day);fill.color.set('#a7c5ff');fill.intensity=s.moonPower+.10*s.day;renderer.toneMappingExposure=s.exposure;
 ground.material.color.copy(bg).multiplyScalar(.83);ground.material.emissive.copy(bg).multiplyScalar((1-s.day)*.82);fogUniforms.uDawnFog.value=s.fog;fogUniforms.uFogTint.value.copy(sky).lerp(new T.Color('#ecdbb8'),.25);fogUniforms.uWeatherTime.value=seconds;camera.getWorldDirection(fogUniforms.uFogViewDir.value);fogObjects.forEach(o=>o.visible=s.fog>.0001);
 panes.forEach(p=>{p.material.uniforms.power.value=s.lamps;p.visible=s.lamps>.0001;});fixtures.forEach(p=>p.material.emissiveIntensity=3*s.lamps);
 // Very small flame variation, entirely deterministic for narration-frame export.
 practicals.forEach(({light,power},i)=>{light.intensity=power*s.lamps*(1+.013*Math.sin(seconds*2.1+i)+.007*Math.sin(seconds*5.4+i*2));});
 return {...s,sky:sky.clone(),horizon:horizon.clone(),keyColor:(s.sunPower>.01?sun.color:fill.color).clone(),keyDirection:s.sunPower>.01?sun.position.clone().normalize():fill.position.clone().normalize()};
 }
 function hourAt(seconds){return running?wrapHour(anchorHour+(seconds-anchorSeconds)*24/duration):anchorHour;}
 return {patch,apply,hourAt,sample:sampleDay,get state(){return {...state,running,duration};},setHour(h,seconds){if(!Number.isFinite(h))throw Error('hour must be finite');anchorHour=wrapHour(h);anchorSeconds=seconds;running=false;},play(seconds){anchorHour=lastHour;anchorSeconds=seconds;running=true;},pause(seconds){anchorHour=hourAt(seconds);anchorSeconds=seconds;running=false;},setDuration(value,seconds){if(!Number.isFinite(value)||value<20)throw Error('cycle duration must be at least 20 seconds');anchorHour=hourAt(seconds);anchorSeconds=seconds;duration=value;},refreshShadows(){fill.shadow.needsUpdate=true;practicals.forEach(({light})=>light.shadow.needsUpdate=!light.shadow.map||state.lamps>.001);},dispose(){fogObjects.forEach(o=>o.geometry.dispose());fogMat.dispose();panes.forEach(p=>{p.geometry.dispose();p.material.dispose();});fixtures.forEach(p=>{p.geometry.dispose();p.material.dispose();});practicals.forEach(({light})=>light.dispose());fill.shadow.dispose();},practicals,panes,fogObjects};
}
