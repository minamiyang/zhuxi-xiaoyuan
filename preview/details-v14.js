// Authored local refinements: preserve placements, attachment endpoints and animation owners.
import * as T from 'three';
import {pieces} from './quality-v3.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const NOISE=`
float detailHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float detailNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(detailHash(i),detailHash(i+vec3(1,0,0)),f.x),mix(detailHash(i+vec3(0,1,0)),detailHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(detailHash(i+vec3(0,0,1)),detailHash(i+vec3(1,0,1)),f.x),mix(detailHash(i+vec3(0,1,1)),detailHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 detailBump(vec3 n,float height){vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);vec3 r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);return normalize(abs(det)*n-sign(det)*(dFdx(height)*r1+dFdy(height)*r2));}
`;
// glTF splits UV seams into coincident vertices. Recomputed normals at collapsed
// leaf tips inherit the neighboring surface limit instead of a zero vector.
function repairTipNormals(g){
 const p=g.attributes.position,n=g.attributes.normal;if(!n)return;const sums=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e6)).join(',');
 for(let i=0;i<n.count;i++){const v=V().fromBufferAttribute(n,i);if(v.lengthSq()<1e-10)continue;const k=key(i);if(!sums.has(k))sums.set(k,V());sums.get(k).add(v);}
 for(let i=0;i<n.count;i++){if(V().fromBufferAttribute(n,i).lengthSq()>1e-10)continue;const v=sums.get(key(i));if(v&&v.lengthSq()>1e-10){v.normalize();n.setXYZ(i,v.x,v.y,v.z);}}
 n.needsUpdate=true;
}
function patchMaterial(m,kind){
 const prev=m.onBeforeCompile,key=m.customProgramCacheKey();
 if(kind==='bark'){m.map=null;m.normalMap=null;m.roughnessMap=null;m.color.set('#79654b');m.roughness=.93;}
 if(kind==='wall'){m.map=null;m.normalMap=null;m.roughnessMap=null;m.color.set('#d9d1bc');m.roughness=.94;}
 m.onBeforeCompile=s=>{prev.call(m,s);s.vertexShader='varying vec3 vDetailP;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvDetailP=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='varying vec3 vDetailP;\n'+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('void main() {',NOISE+'\nvoid main() {');
 const field=kind==='bark'?`
 vec3 q=vDetailP;float longGrain=detailNoise(q*vec3(23.,.65,23.));float fibers=detailNoise(q*vec3(140.,2.1,140.));float broad=detailNoise(q*vec3(5.,.55,5.));float fissure=1.-smoothstep(.24,.41,longGrain);
 float detailHeight=.0035*longGrain+.0012*fibers;
 diffuseColor.rgb*=mix(vec3(.78,.75,.69),vec3(1.06,1.03,.97),longGrain)*(.89+.17*broad)*(1.-.16*fissure)*(.80+.28*fibers);
 `:`
 vec3 q=vDetailP;float plaster=detailNoise(q*2.2),grain=detailNoise(q*19.),fine=detailNoise(q*155.);float base=(1.-smoothstep(.78,1.48,q.y))*(.35+.65*detailNoise(q*vec3(4.,1.5,4.)));
 float front=1.-smoothstep(.10,.18,abs(q.z));float windowMask=exp(-pow((q.x-.3)/.51,4.))+exp(-pow((q.x+3.1)/.51,4.));
 float sill=front*windowMask*smoothstep(.86,1.25,q.y)*(1.-smoothstep(1.36,1.49,q.y));float streak=detailNoise(q*vec3(22.,.6,22.));
 float weather=clamp(base*.24+sill*.17*streak,0.,.3);float detailHeight=.0018*plaster+.0009*grain+.00035*fine;
 diffuseColor.rgb*=(.88+.14*plaster)*(.97+.06*fine);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.66,.62,.49),weather);
 `;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+field);
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=detailBump(normal,detailHeight);');
 };m.customProgramCacheKey=()=>key+'-detail-v14-'+kind;m.needsUpdate=true;
}
function curlLeaves(o){
 const g=o.geometry.clone(),p=g.attributes.position,norm=g.attributes.normal,{groups,root}=pieces(g),leafUV=new Float32Array(p.count*2);
 for(const c of groups.values()){c.ids=[];c.center=V();c.normal=V();}
 for(let i=0;i<p.count;i++){const c=groups.get(root(i));c.ids.push(i);c.center.add(V().fromBufferAttribute(p,i));c.normal.add(V().fromBufferAttribute(norm,i));}
 let maxMove=0;
 for(const c of groups.values()){
 c.center.multiplyScalar(1/c.ids.length);c.normal.normalize();if(c.normal.lengthSq()<.5)continue;
 const cov=new T.Matrix3().set(0,0,0,0,0,0,0,0,0),e=cov.elements;
 for(const i of c.ids){const q=V().fromBufferAttribute(p,i).sub(c.center),a=q.toArray();for(let r=0;r<3;r++)for(let k=0;k<3;k++)e[k*3+r]+=a[r]*a[k];}
 let axis=V(.7,.4,.3);for(let j=0;j<12;j++)axis.applyMatrix3(cov).normalize();axis.addScaledVector(c.normal,-axis.dot(c.normal)).normalize();const cross=c.normal.clone().cross(axis).normalize();
 let lo=Infinity,hi=-Infinity,width=0;for(const i of c.ids){const q=V().fromBufferAttribute(p,i).sub(c.center),t=q.dot(axis);lo=Math.min(lo,t);hi=Math.max(hi,t);width=Math.max(width,Math.abs(q.dot(cross)));}
 for(const i of c.ids){const q=V().fromBufferAttribute(p,i),d=q.clone().sub(c.center),t=clamp((d.dot(axis)-lo)/(hi-lo),0,1),u=clamp(d.dot(cross)/Math.max(width,.001),-1,1),bend=Math.sin(Math.PI*t)*((hi-lo)*.11*u*u+.012*u*Math.sin(t*5.));q.addScaledVector(c.normal,bend);p.setXYZ(i,q.x,q.y,q.z);leafUV[i*2]=u;leafUV[i*2+1]=t;maxMove=Math.max(maxMove,Math.abs(bend));}
 }
 g.setAttribute('detailLeaf',new T.BufferAttribute(leafUV,2));p.needsUpdate=true;g.computeVertexNormals();repairTipNormals(g);g.computeBoundingSphere();g.computeBoundingBox();o.geometry=g;
 const m=o.material,prev=m.onBeforeCompile,key=m.customProgramCacheKey();m.roughness=.64;m.envMapIntensity=.22;
 m.onBeforeCompile=s=>{prev.call(m,s);s.vertexShader='attribute vec2 detailLeaf;varying vec2 vDetailLeaf;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDetailLeaf=detailLeaf;');s.fragmentShader='varying vec2 vDetailLeaf;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float midrib=1.-smoothstep(.018,.045,abs(vDetailLeaf.x));float ribs=1.-smoothstep(.035,.10,abs(sin((vDetailLeaf.y-abs(vDetailLeaf.x)*.29)*27.)));ribs*=1.-smoothstep(.78,1.,abs(vDetailLeaf.x));
 diffuseColor.rgb*=.90+.08*sin(vDetailLeaf.y*3.14159);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,1.15,.83),max(midrib,ribs*.40)*.35);`);
 s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 #if NUM_DIR_LIGHTS > 0
 for(int i=0;i<NUM_DIR_LIGHTS;i++){reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[i].color*.035*pow(max(dot(-normal,directionalLights[i].direction),0.),1.7);}
 #endif
 `);};m.customProgramCacheKey=()=>key+'-curled-veined-v14';m.needsUpdate=true;return {name:o.name,leaves:groups.size,maxMove};
}
function refineBird(o,actor){
 const m=o.material,name=m.name;
 if(actor.type==='chick'&&/颈羽金黄/.test(name))m.color.set('#bd9654');
 if(actor.type==='chick'&&/小鸡绒羽/.test(name))m.roughness=.96;
 if(actor.type==='duck'&&/鸭羽米褐/.test(name))m.color.set('#b2a086');
 if(actor.type==='duck'&&/细羽片/.test(name))m.color.set(name.endsWith('3')?'#b4a68e':name.endsWith('4')?'#ad9e85':'#bbaa91');
 if(actor.type==='duck'&&/鸭翼褐色/.test(name))m.color.set('#827460');
 if(actor.type==='duck'&&/鸭羽浅缘/.test(name))m.color.set('#c2b397');
 // A shared smooth head transform keeps eye, beak, feather and skin attachments together.
 const g=o.geometry.clone(),p=g.attributes.position;
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const w=T.MathUtils.smoothstep(y,actor.type==='duck'?.37:.245,actor.type==='duck'?.53:.32),cy=actor.type==='duck'?.55:.34,cz=actor.type==='duck'?.34:.13,s=actor.type==='duck'?.94:.92;x*=1-(1-s)*w;y=cy+(y-cy)*(1-(1-s)*w);z=cz+(z-cz)*(1-(1-s)*w);p.setXYZ(i,x,y,z);}
 p.needsUpdate=true;g.computeVertexNormals();repairTipNormals(g);g.computeBoundingBox();g.computeBoundingSphere();o.geometry=g;
 // Subtle aligned down/feather grain, lit by the existing sun rather than emissive noise.
 if(!/羽|绒/.test(name))return;const prev=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=s=>{prev.call(m,s);s.vertexShader='varying vec3 vBirdDetail;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBirdDetail=position;');s.fragmentShader='varying vec3 vBirdDetail;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float barb=sin(vBirdDetail.z*280.+sin(vBirdDetail.x*58.)*1.4+vBirdDetail.y*80.);diffuseColor.rgb*=.98+.02*barb;`);};m.customProgramCacheKey=()=>key+'-down-v14';m.needsUpdate=true;
}
export function refineDetails(model){const report={leaves:[],birds:0,materials:[]};model.traverse(o=>{if(!o.isMesh)return;
 if(/02B_·_灰泥脱落露土/.test(o.name)){o.visible=false;return;}
 if(/掌叶攀覆/.test(o.name))report.leaves.push(curlLeaves(o));
 for(const m of Array.isArray(o.material)?o.material:[o.material]){if(/老树树皮/.test(m.name)){patchMaterial(m,'bark');report.materials.push(o.name);}else if(/米白灰泥/.test(m.name)){patchMaterial(m,'wall');report.materials.push(o.name);}}
 let ancestor=o.parent;while(ancestor&&!ancestor.userData.actor)ancestor=ancestor.parent;
 if(ancestor&&['chick','duck'].includes(ancestor.userData.actor.type)){refineBird(o,ancestor.userData.actor);report.birds++;}
 });return report;}
export function createSupper(model){
 model.traverse(o=>{if(/^07_/.test(o.name)&&/米白瓷器|盘中青蔬|米糕与玉米金黄/.test(o.name))o.visible=false;});
 const root=new T.Group();root.name='晚饭 · 手作瓷盘与自然堆叠';
 const ceramic=new T.MeshStandardMaterial({color:'#d8ceb4',roughness:.30,envMapIntensity:.23}),green=new T.MeshStandardMaterial({color:'#657239',roughness:.62,side:T.DoubleSide}),cake=new T.MeshStandardMaterial({color:'#dec48a',roughness:.73}),corn=new T.MeshStandardMaterial({color:'#d1a74d',roughness:.58}),tea=new T.MeshStandardMaterial({color:'#493725',roughness:.23});
 const add=(g,m,p)=>{const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
 const lathe=(profile,m,p)=>add(new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),40),m,p);
 const plateProfile=r=>[[0,.002],[.068,.002],[r*.90,.021],[r,.036],[r,.043],[r*.94,.047],[r*.84,.038],[.070,.024],[0,.024]];
 const plates=[[.13,.92,.15],[.60,.94,.145],[.92,1.17,.12]];plates.forEach(([x,z,r])=>lathe(plateProfile(r),ceramic,V(x,1.22,z)));
 const leaf=new T.BufferGeometry(),pos=[],ix=[];for(let j=0;j<=8;j++){const t=j/8,w=.020*Math.sin(Math.PI*t);for(const u of [-1,0,1])pos.push(u*w,.008*Math.sin(Math.PI*t)*(1-u*u),t*.095-.048);}for(let j=0;j<8;j++){const a=j*3;ix.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}leaf.setAttribute('position',new T.Float32BufferAttribute(pos,3));leaf.setIndex(ix);leaf.computeVertexNormals();
 for(let i=0;i<17;i++){const a=i*2.399,r=.087*Math.sqrt((i+.5)/17),o=add(leaf,green,V(.13+r*Math.cos(a),1.246+(i%3)*.006,.92+r*Math.sin(a)));o.rotation.y=a+.4;}
 // Corn cut into short sections; kernels are a continuous corrugated surface.
 const vs=[],idx=[];for(let j=0;j<=10;j++)for(let k=0;k<=48;k++){const a=k/48*Math.PI*2,y=j/10*.034,r=.032+.003*Math.cos(a*9)*Math.sin(j/10*Math.PI*4)**2;vs.push(Math.cos(a)*r,y,Math.sin(a)*r);}for(let j=0;j<10;j++)for(let k=0;k<48;k++){const a=j*49+k;idx.push(a,a+49,a+1,a+1,a+49,a+50);}const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(vs,3));cg.setIndex(idx);cg.computeVertexNormals();
 for(let i=0;i<5;i++){const a=i*2.4,r=.065*Math.sqrt((i+.3)/5);const p=V(.60+r*Math.cos(a),1.245,.94+r*Math.sin(a));add(cg,corn,p);const top=add(new T.CircleGeometry(.032,32),corn,p.clone().add(V(0,.034,0)));top.rotation.x=-Math.PI/2;const core=add(new T.CircleGeometry(.008,20),cake,p.clone().add(V(0,.0342,0)));core.rotation.x=-Math.PI/2;const bottom=add(new T.CircleGeometry(.032,32),corn,p.clone());bottom.rotation.x=Math.PI/2;}
 const shape=new T.Shape();shape.moveTo(-.029,-.029);shape.lineTo(.029,-.026);shape.lineTo(.024,.029);shape.lineTo(-.028,.027);shape.closePath();const cakeG=new T.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:2,steps:1});cakeG.rotateX(-Math.PI/2);
 for(const [i,dx,dz,y,a]of [[0,-.037,-.028,1.247,.3],[1,.032,-.029,1.247,-.18],[2,-.028,.033,1.247,.12],[3,.037,.031,1.247,.7],[4,0,0,1.272,-.35]]){const o=add(cakeG,cake,V(.92+dx,y,1.17+dz));o.rotation.y=a;}
 for(const [x,z]of [[.84,.84],[.29,1.20]]){lathe([[0,0],[.025,0],[.035,.008],[.039,.062],[.038,.070],[.032,.070],[.030,.016],[0,.016]],ceramic,V(x,1.22,z));const t=add(new T.CircleGeometry(.031,32),tea,V(x,1.272,z));t.rotation.x=-Math.PI/2;}
 root.traverse(o=>{if(o.isMesh){repairTipNormals(o.geometry);o.name='晚饭 · '+o.geometry.type;}});return root;
}
