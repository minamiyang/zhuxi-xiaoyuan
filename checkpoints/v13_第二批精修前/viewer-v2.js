import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {createDaylight} from './daylight.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {installSoftSunShadows,createSkyEnvironment,patchMotionMaterial,tuneMaterial} from './surface-v2.js';
import {createHen,henPose} from './hen-v3.js';
import {createStream,createWakes} from './water-v2.js';
import {duckPose,peckAngle,windOffset,riverCenter,riverHalfWidth} from './motion.js';
import {createLesson} from './lesson.js';
import {createMusic} from './music.js';
import {createSoundscape} from './soundscape.js';
import {createSpringShoots} from './lesson-details.js';
import {refineGround,patchSurface} from './quality-v3.js';
installSoftSunShadows();
const $=id=>document.getElementById(id),stage=$('stage'),status=$('status');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.localClippingEnabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.00;stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#dedbd2');const env=createSkyEnvironment(renderer);scene.environment=env.texture;
const camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,100);camera.position.set(-13.8,12.4,15);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.95,0);controls.enableDamping=true;controls.dampingFactor=.12;controls.minZoom=.65;controls.maxZoom=3.2;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.485;controls.autoRotateSpeed=.42;controls.update();
const hemi=new THREE.HemisphereLight(0xcadfff,0x8a724c,.24);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2b3,4.15);sun.position.set(-5,8,4);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:35});sun.shadow.normalBias=.010;sun.shadow.bias=-.000045;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0xc6dcff,.14);fill.position.set(4,7,-5);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#bdb7a8',roughness:1,envMapIntensity:.18}));ground.rotation.x=-Math.PI/2;ground.position.y=-.418;ground.receiveShadow=true;scene.add(ground);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight);ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA=0;ao.depthRenderMaterial.defines.PERSPECTIVE_CAMERA=0;ao.ssaoMaterial.needsUpdate=true;ao.depthRenderMaterial.needsUpdate=true;ao.kernelRadius=.34;ao.minDistance=.001;ao.maxDistance=.075;composer.addPass(ao);const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.16,.4,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());composer.addPass(new SMAAPass());
// Match normal/depth passes to each moving surface so contact occlusion follows the current pose.
const noAO=[];const oldOverride=ao._overrideVisibility.bind(ao);ao._overrideVisibility=()=>{oldOverride();for(const o of noAO){if(o.visible){o.visible=false;ao._visibilityCache.push(o);}}};
ao._renderOverride=function(renderer,overrideMaterial,renderTarget,clearColor,clearAlpha){
 const previousColor=renderer.getClearColor(new THREE.Color()),previousAlpha=renderer.getClearAlpha(),auto=renderer.autoClear;
 renderer.setRenderTarget(renderTarget);renderer.autoClear=false;renderer.setClearColor(clearColor??0,clearAlpha??0);renderer.clear();const saved=[];
 scene.traverse(o=>{if(o.isMesh&&o.visible){saved.push([o,o.material]);o.material=o.userData.aoNormal||overrideMaterial;}});
 renderer.render(scene,camera);for(const [o,m] of saved)o.material=m;renderer.autoClear=auto;renderer.setClearColor(previousColor,previousAlpha);
};
const views={hero:{p:[-13.8,12.4,15],t:[0,1.95,0],zoom:1,img:'竹溪小院_主视角.png'},garden:{p:[-10,7,10],t:[-2.7,1.8,.6],zoom:1.85,img:'竹溪小院_瓜架近景.png'},bridge:{p:[-.5,6,10.5],t:[3.1,1.6,1.4],zoom:2,img:'竹溪小院_溪桥近景.png'}};
let view='hero',mode='explore',loaded=false,loading=false,transition=null,raf=0,disposed=false,dirty=true,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,time=0,lastNow=0,lastRender=0,lastShadow=-100,stream=null,wakes=null,model=null;
const actors=[],ducks=[],motionUniforms=[];let rebuiltHen=null;
const daylight=createDaylight({scene,renderer,sun,fill,hemi,ground,noAO,camera});let lastPractical=-100,lastClockLabel='';
function syncDaylight(){const d=daylight.apply(daylight.hourAt(time),time);bloom.strength=.04+.20*d.lamps;stream?.setLighting(d);daylight.patch(ground);const minutes=Math.floor(d.hour*60+1e-7),label=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');if(label!==lastClockLabel){$('daytime').textContent=label;lastClockLabel=label;}document.body.classList.toggle('night',d.day<.35);document.documentElement.style.backgroundColor=scene.background.getStyle();}
const music=createMusic(),soundscape=createSoundscape();let explorePose=null,lessonHour=8,rigSettling=false;
const lesson=createLesson({onChange(){dirty=true;request();},onToggle(){lastNow=0;dirty=true;request();}});
function applyLesson(dt){const state=lesson.tick(dt),shot=state.shot,k=1-Math.exp(-dt/1.05);const p=new THREE.Vector3(...shot.p),t=new THREE.Vector3(...shot.t);camera.position.lerp(p,k);controls.target.lerp(t,k);camera.zoom=THREE.MathUtils.lerp(camera.zoom,shot.zoom,k);lessonHour=THREE.MathUtils.lerp(lessonHour,state.hour,k);daylight.setHour(lessonHour,time);camera.updateProjectionMatrix();rigSettling=camera.position.distanceTo(p)>.003||controls.target.distanceTo(t)>.003||Math.abs(camera.zoom-shot.zoom)>.002||Math.abs(lessonHour-state.hour)>.004;}
function setHour(h){daylight.setHour(h,time);dirty=true;render(true);request();}
function playDay(){daylight.play(time);setPlaying(true);setMode('explore');dirty=true;request();}

function applyMotion(){rebuiltHen?.update(time);for(const a of actors){if(a.type==='duck'){const p=duckPose(time,a.index);a.object.position.set(p.x,p.y,p.z);a.object.rotation.set(0,p.heading,p.roll);}else a.uniforms.uPeck.value=peckAngle(time,a.index,a.type==='hen');}for(const u of motionUniforms)u.uSceneTime.value=time;if(wakes)wakes.update(time);scene.updateMatrixWorld(true);}
function render(force=false){if(disposed)return;syncDaylight();soundscape.update({mode,hour:daylight.state.hour,lesson:lesson.state});applyMotion();if(force||time-lastPractical>.35||lastPractical>time){daylight.refreshShadows();lastPractical=time;}if(force||time-lastShadow>.10||lastShadow<0||lastShadow>time){renderer.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=!sun.shadow.map||sun.intensity>.001;lastShadow=time;}const u=ao.ssaoMaterial.uniforms;u.cameraProjectionMatrix.value.copy(camera.projectionMatrix);u.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);u.cameraNear.value=camera.near;u.cameraFar.value=camera.far;
 // First render builds the shadow map, then the reflection can sample it.
 if(force){renderer.shadowMap.needsUpdate=true;const rt=renderer.getRenderTarget();renderer.setRenderTarget(composer.renderTarget1);renderer.render(scene,camera);renderer.setRenderTarget(rt);}if(stream&&sun.shadow.map)stream.update(time,force);composer.render();}
function frame(now){raf=0;if(disposed||document.hidden)return;const dt=lastNow?Math.min((now-lastNow)/1000,.10):0;lastNow=now;
 if(loaded){if(mode==='explore'&&playing)time+=dt;if(mode==='learn'){if(lesson.state.playing)time+=dt;applyLesson(dt);}}
 if(transition&&mode==='explore'){const t=Math.min(1,(now-transition.start)/650),e=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.a,transition.b,e);camera.zoom=THREE.MathUtils.lerp(transition.z0,transition.z1,e);camera.updateProjectionMatrix();if(t===1)transition=null;}
 const changed=controls.update(),active=mode==='learn'?(lesson.state.playing||rigSettling):playing;
 if(loaded&&(dirty||changed||transition||active)&&now-lastRender>30){render();dirty=false;lastRender=now;}
 if(active||changed||transition||dirty)request();}
function request(){if(!raf&&!disposed)raf=requestAnimationFrame(frame);}
controls.addEventListener('change',()=>{dirty=true;stream?.dirty();if(mode==='explore')request();});controls.addEventListener('start',()=>{transition=null;});
function windKind(name){return /wind_bamboo|竹叶飞簇|竹节环|竹秆_|竹枝/.test(name)?2:/wind_vine|掌叶攀覆|攀缘藤|棚上纵横/.test(name)?3:/wind_flower|wind_grass|五瓣花簇|花境叶片|凤仙花茎|花心|溪岸花|溪岸黄|草丛高低层|树根莎草/.test(name)?4:/wind_tree|榆树分层叶冠|一级分枝|二级细枝/.test(name)?1:0;}
function load(){if(loading||loaded)return;loading=true;status.textContent='正在展开这座小院…';new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('./node_modules/three/examples/jsm/libs/draco/gltf/')).load('./竹溪小院_动态.glb',g=>{model=g.scene;
 model.traverse(o=>{if(o.name.startsWith('actor_')){const type=o.name.includes('duck')?'duck':o.name.includes('chick')?'chick':'hen',index=type==='hen'?0:Number(o.name.split('_').at(-1))-1;const uniforms={uSceneTime:{value:0},uWindKind:{value:0},uPeck:{value:0},uBirdKind:{value:type==='hen'?1:type==='chick'?2:0}};o.userData.actor={object:o,type,index,uniforms};actors.push(o.userData.actor);motionUniforms.push(uniforms);if(type==='duck')ducks[index]=o;}});
 model.traverse(o=>{if(!o.isMesh)return;if(/water_replace|wake_replace|蜿蜒溪水|鸭后涟漪/.test(o.name)){o.visible=false;return;}o.castShadow=true;o.receiveShadow=true;let ancestor=o.parent,actor=null;while(ancestor){if(ancestor.userData.actor){actor=ancestor.userData.actor;break;}ancestor=ancestor.parent;}
 const wk=windKind(o.name),uniforms=actor?.uniforms||{uSceneTime:{value:0},uWindKind:{value:wk},uPeck:{value:0},uBirdKind:{value:0}};const moving=!!actor||wk>0;if(moving){if(!actor)motionUniforms.push(uniforms);o.frustumCulled=false;}
 const convert=mat=>{const m=tuneMaterial(mat.clone(),mat.name);m.side=THREE.DoubleSide;if(moving)patchMotionMaterial(m,uniforms);patchSurface(m,mat.name);return m;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 if(moving)o.userData.aoNormal=patchMotionMaterial(new THREE.MeshNormalMaterial({side:THREE.DoubleSide}),uniforms);
 if(moving)o.customDepthMaterial=patchMotionMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide}),uniforms);
 });scene.add(model);refineGround(model);
 const oldHen=actors.find(a=>a.type==='hen');if(oldHen){oldHen.object.visible=false;oldHen.object.name='previous_hen_hidden';rebuiltHen=createHen();rebuiltHen.root.name='actor_hen';rebuiltHen.root.position.copy(oldHen.object.position);rebuiltHen.root.rotation.copy(oldHen.object.rotation);rebuiltHen.root.scale.copy(oldHen.object.scale);scene.add(rebuiltHen.root);oldHen.object=rebuiltHen.root;}
 const shoots=createSpringShoots();scene.add(shoots);daylight.patch(shoots);daylight.patch(model);if(rebuiltHen)daylight.patch(rebuiltHen.root);
 stream=createStream(renderer,scene,camera,sun);wakes=createWakes(scene,ducks);stream.excluded.push(...wakes.objects,...daylight.fogObjects);noAO.push(stream.water,...wakes.objects);loaded=true;loading=false;status.textContent='';window.sceneReady=true;render(true);stream.dirty();render(true);lastNow=0;request();},p=>{if(p.total)status.textContent=`正在展开这座小院… ${Math.round(p.loaded/p.total*100)}%`;},e=>{console.error(e);loading=false;status.textContent='模型未能载入，请检查本地服务后刷新。';});}
function setMode(next){if(!['explore','learn'].includes(next))return;const previous=mode;
 if(next==='learn'&&previous!=='learn'){explorePose={p:camera.position.clone(),t:controls.target.clone(),zoom:camera.zoom,hour:daylight.hourAt(time),running:daylight.state.running};lessonHour=daylight.hourAt(time);transition=null;controls.enableDamping=false;controls.update();controls.enableDamping=true;controls.autoRotate=false;}
 mode=next;controls.enabled=next==='explore';document.body.classList.toggle('learning',next==='learn');for(const id of ['explore','learn']){$(id).classList.toggle('active',next===id);$(id).setAttribute('aria-pressed',String(next===id));}
 if(next==='learn'&&previous!=='learn'){lesson.start();music.suspend(false);rigSettling=true;}
 if(next==='explore'&&previous==='learn'){if(explorePose){camera.position.copy(explorePose.p);controls.target.copy(explorePose.t);camera.zoom=explorePose.zoom;daylight.setHour(explorePose.hour,time);daylight.apply(explorePose.hour,time);if(explorePose.running)daylight.play(time);controls.update();}music.suspend(false);playing=true;}
 lastNow=0;load();resize();dirty=true;request();}
function go(key){if(!views[key])return;view=key;const v=views[key];transition={start:performance.now(),from:camera.position.clone(),to:new THREE.Vector3(...v.p),a:controls.target.clone(),b:new THREE.Vector3(...v.t),z0:camera.zoom,z1:v.zoom};dirty=true;request();}
function setPlaying(value){playing=value;lastNow=0;if(loaded)syncDaylight();dirty=true;request();}
$('explore').onclick=()=>setMode('explore');$('learn').onclick=()=>setMode('learn');
function resize(){const w=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight),aspect=w/height,h=Math.max(13.7,16.8/aspect);camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();renderer.setSize(w,height);composer.setSize(w,height);stream?.dirty();dirty=true;if(loaded)render(true);request();}
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastNow=0;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else{dirty=true;request();}});renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='图形上下文暂时中断，请刷新恢复。';});window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);controls.dispose();soundscape.dispose();composer.dispose();stream?.dispose();daylight.dispose();env.dispose();renderer.dispose();});
window.viewer={setMode,go,setPlaying,lesson,music,soundscape,
 dayCycle:{setHour,play:playDay,pause(){daylight.pause(time);dirty=true;render(true);},setDuration(seconds){daylight.setDuration(seconds,time);},sample:daylight.sample,get state(){return daylight.state;}},
 // One deterministic entry point for a future narration/audio master clock.
 seekFrame({seconds,hour,camera:shot}={}){if(!Number.isFinite(seconds)||seconds<0)throw Error('seconds must be finite and nonnegative');setMode('explore');setPlaying(false);transition=null;controls.autoRotate=false;const wasDamping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=wasDamping;time=seconds;if(hour!==undefined)daylight.setHour(hour,time);if(shot){transition=null;controls.autoRotate=false;if(shot.position)camera.position.fromArray(shot.position);if(shot.target)controls.target.fromArray(shot.target);if(shot.zoom!==undefined)camera.zoom=THREE.MathUtils.clamp(shot.zoom,.65,3.2);camera.updateProjectionMatrix();controls.update();}render(true);return {seconds:time,hour:daylight.state.hour};},
setTime(t){setPlaying(false);time=t;render(true);},duckPose,peckAngle,windOffset,riverCenter,riverHalfWidth,get state(){return {mode,view,loaded,playing,time,meshes:renderer.info.memory.geometries,zoom:camera.zoom,actors:actors.map(a=>({name:a.object.name,type:a.type,index:a.index,position:a.object.position.toArray(),rotation:a.object.rotation.toArray(),peck:a.uniforms.uPeck.value})),daylight:daylight.state,movingGroups:motionUniforms.length};},scene,camera,controls,renderer,henPose,hen:()=>rebuiltHen,stream:()=>stream};resize();setPlaying(playing);setMode('explore');
