import * as T from 'three';
const V=(x,y,z)=>new T.Vector3(x,y,z),smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function henPose(t){const p=((t%15.6)+15.6)%15.6;let bend=0,tap=0;
 if(p>2&&p<6.3){bend=smooth((p-2)/1.25)*(1-smooth((p-5.2)/1.1));for(const at of [3.65,4.28,4.95]){const u=(p-at)/.30;if(u>=0&&u<=1)tap=Math.sin(Math.PI*u)**2;}}
 return {bend,tap,headY:.82+(.165-.82)*bend-.031*tap,headZ:.32+.265*bend,headPitch:.02+.47*bend+.10*tap,bodyPitch:.21*bend,crouch:.057*bend,look:.065*Math.sin(t*.62)*(1-bend)};
}
export function createHen(){
 const root=new T.Group();root.name='母鸡 · 重建的自然体态';const body=new T.Group();root.add(body);body.position.y=.29;
 const standard=(color,roughness=.79)=>new T.MeshStandardMaterial({color,roughness,envMapIntensity:.16});
 const brown=standard('#995c2d'),gold=standard('#b97a3c'),wingmat=standard('#87512b'),dark=standard('#493b28'),red=standard('#a93225',.64),legmat=standard('#9e7946'),horn=standard('#b89a65',.57),black=standard('#17100b',.24),iris=standard('#a77932',.48);
 function mesh(g,m,parent=root){const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function ellipsoid(pos,scale,mat,parent=root){const o=mesh(new T.SphereGeometry(1,32,20),mat,parent);o.position.copy(pos);o.scale.copy(scale);return o;}
 function tube(points,r,mat,parent=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,r,7,false),mat,parent);}
 ellipsoid(V(0,.225,-.025),V(.248,.228,.353),brown,body);ellipsoid(V(0,.17,-.21),V(.19,.18,.21),brown,body);
 function feather(){const p=[],ix=[],uv=[];const rows=14,cols=6;for(let j=0;j<=rows;j++){const v=j/rows,w=Math.pow(Math.sin(Math.PI*(.05+.93*v)),.66)*.5;for(let i=0;i<=cols;i++){const q=i/cols*2-1;p.push(q*w,.035*(1-q*q)+.022*Math.sin(Math.PI*v)-.40*(v-.5)**2+.006*Math.cos(v*28+Math.abs(q)*3)*Math.abs(q),v-.5);uv.push(i/cols,v);}}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;ix.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
 const fg=feather();const fm=standard('#ffffff');fm.side=T.DoubleSide;
 function instanceSet(n,parent,name){const o=new T.InstancedMesh(fg,fm,n);o.name=name;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;parent.add(o);return o;}
 function put(o,k,p,n,d,w,len,color){n=n.clone().normalize();const z=d.clone().addScaledVector(n,-d.dot(n)).normalize(),x=n.clone().cross(z).normalize(),y=z.clone().cross(x).normalize();const m=new T.Matrix4().makeBasis(x,y,z);m.scale(V(w,w,len));m.setPosition(p);o.setMatrixAt(k,m);o.setColorAt(k,new T.Color(color));}
 const colors=['#9b5f30','#a46634','#a66b38','#935b31','#ae713d','#9e6031'];
 const plumage=instanceSet(22*26,body,'背胸腹 · 顺体表覆羽');let k=0;
 for(let row=0;row<22;row++){const phi=.12+(Math.PI-.24)*row/21;for(let j=0;j<26;j++){const a=2*Math.PI*(j+(row%2)*.5)/26;const n=V(Math.sin(phi)*Math.cos(a)/.249,Math.sin(phi)*Math.sin(a)/.229,Math.cos(phi)/.355).normalize();const p=V(.250*Math.sin(phi)*Math.cos(a),.225+.232*Math.sin(phi)*Math.sin(a),-.025+.356*Math.cos(phi));put(plumage,k++,p,n,V(0,-.20,-1),.059,.10,colors[(j*7+row*3)%colors.length]);}}
 for(const side of [-1,1]){ellipsoid(V(side*.221,.247,-.04),V(.048,.128,.257),wingmat,body);const wings=instanceSet(40,body,'折叠翼 · 短覆羽与飞羽');let k=0;for(let row=0;row<4;row++)for(let j=0;j<10;j++){const yy=.305-row*.035-j*.003,zz=.13-j*.04,xx=.221+.048*Math.sqrt(Math.max(.05,1-((yy-.247)/.128)**2-((zz+.04)/.257)**2))+.004;const p=V(side*xx,yy,zz);put(wings,k++,p,V(side*(xx-.221)/(.048*.048),(yy-.247)/(.128*.128),(zz+.04)/(.257*.257)),V(0,-.35,-1),.047,row===3?.145:.094,colors[(row+j)%colors.length]);}}
 const tail=instanceSet(9,body,'母鸡短尾 · 圆端扇羽');for(let j=0;j<9;j++){const a=(j-4)*.14;put(tail,j,V(Math.sin(a)*.09,.345,-.39),V(0,1,.52),V(Math.sin(a)*.40,.50,-1),.076,.29, j%3===0?'#5f4c31':'#433d2e');}
 // Rigid feet, articulated upper legs; no sliding foot or stretched head geometry.
 const shins=[];
 for(const side of [-1,1]){const x=side*.102;const upper=mesh(new T.CylinderGeometry(.023,.016,1,12),legmat);shins.push({o:upper,side});tube([V(x,.165,.0),V(x,.08,.018),V(x,.033,.03)],.013,legmat);for(let j=0;j<5;j++)ellipsoid(V(x,.053+j*.020,.028),V(.014,.003,.007),horn);
 for(const toe of [-1,0,1]){const end=V(x+toe*.041,.013,.137-Math.abs(toe)*.016);tube([V(x,.03,.031),V(x+toe*.018,.018,.074),end],.007,legmat);tube([end,end.clone().add(V(toe*.004,-.003,.022))],.0035,horn);}tube([V(x,.031,.014),V(x+side*.013,.018,-.041),V(x+side*.02,.013,-.065)],.006,legmat);}
 const head=new T.Group();head.name='头部 · 刚性关节';root.add(head);ellipsoid(V(0,0,0),V(.083,.09,.098),gold,head);ellipsoid(V(0,-.032,.055),V(.065,.059,.065),gold,head);
 for(const side of [-1,1]){ellipsoid(V(side*.074,.015,.040),V(.0065,.017,.019),iris,head);ellipsoid(V(side*.080,.016,.047),V(.005,.0085,.010),black,head);ellipsoid(V(side*.083,.019,.050),V(.002,.002,.002),horn,head);ellipsoid(V(side*.064,-.026,-.033),V(.009,.012,.016),horn,head);ellipsoid(V(side*.018,-.080,.058),V(.012,.025,.016),red,head);}
 const beak=mesh(new T.ConeGeometry(.027,.086,20),horn,head);beak.position.set(0,-.025,.120);beak.rotation.x=Math.PI/2+.12;
 tube([V(-.020,-.036,.083),V(0,-.036,.155),V(.020,-.036,.083)],.0017,dark,head);
 for(const side of [-1,1])ellipsoid(V(side*.018,-.017,.100),V(.002,.003,.006),dark,head);
 const shape=new T.Shape();shape.moveTo(-.065,.066);for(const [z,y] of [[-.055,.109],[-.039,.094],[-.025,.130],[-.009,.109],[.009,.143],[.028,.116],[.045,.128],[.062,.100],[.069,.057]])shape.lineTo(z,y);shape.closePath();const cg=new T.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.006,bevelThickness:.005});cg.translate(0,0,-.007);cg.rotateY(Math.PI/2);mesh(cg,red,head);
 const neckGeom=new T.BufferGeometry(),neckPos=new Float32Array(25*21*3),neckIndex=[];for(let j=0;j<24;j++)for(let i=0;i<20;i++){const a=j*21+i;neckIndex.push(a,a+21,a+1,a+1,a+21,a+22);}neckGeom.setAttribute('position',new T.BufferAttribute(neckPos,3).setUsage(T.DynamicDrawUsage));neckGeom.setIndex(neckIndex);mesh(neckGeom,gold);
 const neckFeathers=instanceSet(10*16,root,'颈披羽 · 沿弯曲颈部排列');neckFeathers.instanceMatrix.setUsage(T.DynamicDrawUsage);
 let last=-1;
 function update(t){if(t===last)return;last=t;const p=henPose(t);body.rotation.x=p.bodyPitch;body.position.y=.29-p.crouch;body.updateMatrix();head.position.set(p.look*.10,p.headY,p.headZ);head.rotation.set(p.headPitch,p.look,0);
 for(const {o,side} of shins){const top=V(side*.105,.085,0).applyMatrix4(body.matrix),bottom=V(side*.102,.165,0),d=top.clone().sub(bottom);o.position.copy(top).add(bottom).multiplyScalar(.5);o.scale.y=d.length();o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());}
 const start=V(0,.300,.186).applyMatrix4(body.matrix),end=head.position.clone().add(V(0,-.040,-.025).applyEuler(head.rotation));
 const curve=new T.CatmullRomCurve3([start,V(0,.65-(.65-.365)*p.bend,.19+.14*p.bend),V(p.look*.04,.765-(.765-.235)*p.bend,.242+.24*p.bend),end]);
 function frame(u){const c=curve.getPoint(u),tangent=curve.getTangent(u).normalize(),x=V(1,0,0),v=tangent.clone().cross(x).normalize();return {c,tangent,x,v};}
 const radius=u=>.108*(1-u)+.057*u;
 let n=0;for(let j=0;j<=24;j++){const u=j/24,{c,x,v}=frame(u),r=radius(u);for(let i=0;i<=20;i++){const a=i/20*Math.PI*2,pt=c.clone().addScaledVector(x,r*Math.cos(a)).addScaledVector(v,r*Math.sin(a));neckPos[n++]=pt.x;neckPos[n++]=pt.y;neckPos[n++]=pt.z;}}neckGeom.attributes.position.needsUpdate=true;neckGeom.computeVertexNormals();neckGeom.computeBoundingSphere();
 let k=0;for(let row=0;row<10;row++){const u=.035+.9*row/9,{c,tangent,x,v}=frame(u),r=radius(u)+.002;for(let j=0;j<16;j++){const a=(j+(row%2)*.5)/16*Math.PI*2,normal=x.clone().multiplyScalar(Math.cos(a)).addScaledVector(v,Math.sin(a));put(neckFeathers,k++,c.clone().addScaledVector(normal,r),normal,tangent.clone().negate(),.039,.068,row%3===0?'#b58449':'#a57136');}}neckFeathers.instanceMatrix.needsUpdate=true;neckFeathers.instanceColor.needsUpdate=true;
 }
 update(0);return {root,update,pose:henPose};
}
