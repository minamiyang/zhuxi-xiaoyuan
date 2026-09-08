import * as T from 'three';
// Self-authored spring shoots, with pointed, overlapping spiral sheaths.
export function createSpringShoots(){
 const root=new T.Group();root.name='春笋 · 课文细节';
 const mats=['#675234','#796543','#84794b','#9a8d5a','#77854b'].map(color=>new T.MeshStandardMaterial({color,roughness:.9,side:T.DoubleSide}));
 [[-5.13,.58,.48],[-5.52,.98,.36],[-5.31,1.39,.57],[-5.6,.27,.29],[-4.98,.13,.33]].forEach(([x,z,h],i)=>{
 const g=new T.Group();g.position.set(x,.47,z);g.rotation.z=(i-2)*.025;const r=h*.23;
 const c=new T.Mesh(new T.ConeGeometry(r,h,16,8),mats[4]);c.position.y=h*.5;g.add(c);
 for(let k=0;k<5;k++)for(let j=0;j<3;j++){
 const positions=[],indices=[],start=k*.155,span=Math.min(.40,1-start),a=j*Math.PI*2/3+k*1.37;
 for(let v=0;v<=10;v++)for(let u=0;u<=10;u++){const t=v/10,q=u/5-1,y=start+span*t,angle=a+q*(1-t)*1.18,rr=r*(1-y)*(1+.13*Math.sin(t*Math.PI))+.002+.005*Math.pow(Math.abs(q),5)*Math.sin(t*Math.PI);positions.push(Math.sin(angle)*rr,h*y,Math.cos(angle)*rr);}
 for(let v=0;v<10;v++)for(let u=0;u<10;u++){const n=v*11+u;indices.push(n,n+11,n+1,n+1,n+11,n+12);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();g.add(new T.Mesh(geo,mats[Math.min(4,k+(i%2))]));}
 root.add(g);
 });root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;
}
