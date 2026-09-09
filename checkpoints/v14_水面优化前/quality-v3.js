// Local surface refinement; the authored house, full crown and animal assemblies stay intact.
import * as T from 'three';
import {riverCenter,riverHalfWidth} from './motion.js';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
const hash=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);};
function patchField(x,z){return .5+.24*Math.sin(x*3.2+Math.sin(z*2.3))+.18*Math.sin(z*4.1-x*.8);}
function pathAt(x,z){
 const laneX=-.7+.19*Math.sin(z*1.4), lane=(1-smooth(.58,1.23,Math.abs(x-laneX)))*smooth(.25,1.4,z);
 const bridge=(1-smooth(.38,.92,Math.abs(z-1.7)))*smooth(.2,2.1,x);
 return Math.max(lane,bridge);
}
// Join coincident split vertices before finding whole disconnected pieces. This avoids
// cutting triangles or leaving half a grass blade when thinning the exported merged meshes.
export function pieces(g){
 const p=g.attributes.position,n=p.count,parent=Int32Array.from({length:n},(_,i)=>i),lookup=new Map();
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a;};
 for(let i=0;i<n;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');const j=lookup.get(k);if(j===undefined)lookup.set(k,i);else join(i,j);}
 const index=g.index?.array||Uint32Array.from({length:n},(_,i)=>i);
 for(let i=0;i<index.length;i+=3){join(index[i],index[i+1]);join(index[i],index[i+2]);}
 const groups=new Map();
 for(let i=0;i<n;i++){const r=root(i);let c=groups.get(r);if(!c){c={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};groups.set(r,c);}for(let a=0;a<3;a++){const v=p.array[i*p.itemSize+a];c.min[a]=Math.min(c.min[a],v);c.max[a]=Math.max(c.max[a],v);}}
 return {groups,root,index};
}
export function refineGround(root){
 const audit=[];root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const grass=/草丛高低层/.test(o.name),crumb=/细碎土粒/.test(o.name),pebble=/砾石与溪岸卵石/.test(o.name),stone=/^04_|树根半埋石|浅溪透视河床石/.test(o.name),tile=/^02A_/.test(o.name)&&/瓦/.test(o.name);
 if(!grass&&!crumb&&!pebble&&!stone&&!tile)return;
 const g=o.geometry.clone(),{groups,root:piece,index}=pieces(g),world=new T.Vector3();let kept=0;
 for(const c of groups.values()){
  world.set(...c.min).add(new T.Vector3(...c.max)).multiplyScalar(.5).applyMatrix4(o.matrixWorld);
  const [x,y,z]=world.toArray(),path=pathAt(x,z),field=patchField(x,z),bank=Math.abs(x-riverCenter(z))-riverHalfWidth(z),radius=Math.max(...c.max.map((v,i)=>v-c.min[i]))/2;
  let probability=1;
  if(grass)probability=(.16+.84*smooth(.33,.66,field))*(1-.94*path);
  if(crumb)probability=(.12+.47*smooth(.3,.8,field))*(1-.92*path);
  if(pebble&&radius<.095&&bank>.35)probability=.30*(1-.94*path);
  c.keep=hash(x*1.03+2.1,z+.73)<probability;if(c.keep)kept++;
  const v=hash(x+1.31,z+.4);c.tint=tile?[.85+.16*v,.85+.155*v,.84+.16*v]:[.77+.22*v,.78+.20*v,.76+.19*v];
 }
 const ids=[];for(let i=0;i<index.length;i+=3)if(groups.get(piece(index[i])).keep)ids.push(index[i],index[i+1],index[i+2]);
 g.setIndex(ids);
 if(stone||tile||pebble){const colors=new Float32Array(g.attributes.position.count*3),old=g.attributes.color;for(let i=0;i<g.attributes.position.count;i++){const tint=groups.get(piece(i)).tint;for(let a=0;a<3;a++)colors[i*3+a]=tint[a]*(old?old.array[i*old.itemSize+a]:1);}g.setAttribute('color',new T.BufferAttribute(colors,3));for(const m of Array.isArray(o.material)?o.material:[o.material]){m.vertexColors=true;m.needsUpdate=true;}}
 o.geometry=g;g.computeBoundingBox();g.computeBoundingSphere();audit.push({name:o.name,pieces:groups.size,kept,trianglesBefore:index.length/3,trianglesAfter:ids.length/3});
 });root.userData.surfaceRefinement=audit;return audit;
}
export function patchSurface(m,name){
 const soil=/压实院土/.test(name),stone=/桥石|砂岩/.test(name);
 if(!soil&&!stone)return;
 const previous=m.onBeforeCompile,cache=m.customProgramCacheKey();
 m.onBeforeCompile=shader=>{previous.call(m,shader);
 shader.vertexShader='varying vec3 vSurfaceP;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSurfaceP=(modelMatrix*vec4(transformed,1.)).xyz;');
 shader.fragmentShader='varying vec3 vSurfaceP;\n'+shader.fragmentShader;
 const code=soil?`
 vec3 q=vSurfaceP;float bank=3.55+.48*sin(-q.z*.58)+.15*cos(-q.z*1.2);float bankD=abs(q.x-bank);
 float broad=.5+.25*sin(q.x*1.4+sin(q.z*.9))+.15*sin(q.z*2.1-q.x*.6);
 float damp=(1.-smoothstep(.32,.60,q.y))*(.65+.35*broad);
 diffuseColor.rgb*=mix(vec3(.78,.73,.65),vec3(.96,.91,.82),broad);
 diffuseColor.rgb*=mix(vec3(1.),vec3(.72,.79,.77),damp*.6);
 `:`
 vec3 q=vSurfaceP;float uneven=.5+.3*sin(q.x*7.1+sin(q.z*6.3))+.2*sin(q.z*11.3+q.y*4.);
 float wet=(1.-smoothstep(.35,.61,q.y))*(.8+.2*uneven);
 diffuseColor.rgb*=mix(vec3(1.),vec3(.57,.64,.61),wet);
 `;
 if(!shader.fragmentShader.includes('#include <color_fragment>'))throw Error('Surface shader anchor missing');
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
 if(stone)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.55,wet*.75);');
 };m.customProgramCacheKey=()=>cache+'-surface-v13-'+(soil?'earth':'stone');m.needsUpdate=true;
}
