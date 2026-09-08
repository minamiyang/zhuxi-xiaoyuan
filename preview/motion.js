// Deterministic world-space paths and anatomically bounded poses, shared by runtime and checks.
export const riverCenter=z=>3.55+.48*Math.sin(-z*.58)+.15*Math.cos(-z*1.2);
export const riverHalfWidth=z=>.72+.16*Math.cos(z*.8);
const TAU=Math.PI*2;
// A long two-lane creek route; the only U-turns are moving hairpins at its ends.
function route(u){u=((u%1)+1)%1;let z,x;const lane=.23;
 if(u<.44){z=2.45-5.05*u/.44;x=lane;}
 else if(u<.5){const a=(u-.44)/.06*Math.PI;z=-2.6-.52*Math.sin(a);x=lane*Math.cos(a);}
 else if(u<.94){z=-2.6+5.05*(u-.5)/.44;x=-lane;}
 else{const a=(u-.94)/.06*Math.PI;z=2.45+.52*Math.sin(a);x=-lane*Math.cos(a);}
 return {x:riverCenter(z)+x+(.385-x/.23*.235)*Math.exp(-(((z+.9)/.78)**2)),y:.305,z};
}
const N=4096,entries=[{s:0,u:0}];let total=0,prev=route(0);
for(let k=1;k<=N;k++){const p=route(k/N);total+=Math.hypot(p.x-prev.x,p.z-prev.z);entries.push({s:total,u:k/N});prev=p;}
export function duckPose(t,i){const period=164,d=(((t/period+(i?0:.09))%1)+1)%1*total;let lo=0,hi=N;while(hi-lo>1){const m=(hi+lo)>>1;if(entries[m].s<d)lo=m;else hi=m;}const u=entries[lo].u+(entries[hi].u-entries[lo].u)*(d-entries[lo].s)/(entries[hi].s-entries[lo].s);const p=route(u),a=route(u-.00001),b=route(u+.00001);return {...p,y:p.y+.002*Math.sin(t*1.65+i),heading:Math.atan2(b.x-a.x,b.z-a.z),roll:.006*Math.sin(t*1.2+i),period,speed:total/period};}
export function peckAngle(t,index,hen=false){const period=hen?11.8:8.9+index*.73,p=(t+index*1.81)%period;function pulse(start,duration){const u=(p-start)/duration;return u<0||u>1?0:Math.pow(Math.sin(u*Math.PI),2);}return (hen?1.43:1.00)*Math.max(pulse(.65,1.65),pulse(2.65,1.05));}
export function windOffset(x,y,z,t,kind){const h=Math.max(0,y-.44),w=kind==='flower'||kind==='grass'?Math.min(1,h/.55)**2:kind==='vine'?Math.min(1,h/3)**2:Math.min(1,h/5.4)**2;const gust=.70+.30*Math.sin(t*.26+.3);const sway=Math.sin(t*.95+x*.38+z*.24)*gust;const amplitude=kind==='bamboo'?.065:kind==='tree'?.045:kind==='vine'?.022:.036;return [w*amplitude*sway,w*.005*Math.sin(t*1.3+x),w*amplitude*.48*Math.sin(t*.87+x*.38+z*.24+.7)];}
