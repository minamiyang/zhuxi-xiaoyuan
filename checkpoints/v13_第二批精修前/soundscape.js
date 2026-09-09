const AMBIENCE_LEVEL=.16;
const titles={morning:'清晨鸟鸣',hen:'母鸡咯咯',chicks:'小鸡叽叽',ducks:'鸭子戏水',river:'小河流水',evening:'归巢鸟鸣',night:'夜间虫鸣'};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const band=(h,a,b,w=.8)=>smooth((h-a)/w)*smooth((b-h)/w);
export function soundMix({mode,hour,lesson}){
 const h=(hour%24+24)%24;
 const day={river:.14,morning:.34*band(h,5,9.7),hen:.30*band(h,7.6,10.8)+.19*band(h,15.7,17.5),chicks:.23*band(h,7.7,10.9)+.16*band(h,15.8,17.5),ducks:.28*band(h,10.4,16.6),evening:.32*band(h,16.6,19.6),night:.36*(1-band(h,4.5,20.3,1.1))};
 if(mode!=='learn'||!lesson)return day;
 switch(lesson.index){
 case 0:return {river:.035,morning:.17};
 case 1:return {river:.025,morning:lesson.sentence>=1?.08:.22};
 case 2:return {river:.035,morning:.13};
 case 3:return {hen:.48,chicks:.36,river:.04};
 case 4:return {ducks:.28,river:.24};
 case 5:return {evening:.39,river:.06};
 case 6:return {night:.44,river:.025};
 default:return Object.fromEntries(Object.entries(day).map(([id,v])=>[id,v*.65]));
 }
}
export function createSoundscape(){
 const button=document.getElementById('sound-toggle'),label=document.getElementById('sound-now');
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context){button.disabled=true;button.textContent='音效不可用';return {update(){},dispose(){},get state(){return {unsupported:true};}};}
 const ctx=new Context({sampleRate:24000}),master=ctx.createGain(),limiter=ctx.createDynamicsCompressor();master.gain.value=AMBIENCE_LEVEL;limiter.threshold.value=-15;limiter.knee.value=12;limiter.ratio.value=4;limiter.attack.value=.015;limiter.release.value=.25;master.connect(limiter);limiter.connect(ctx.destination);
 let muted=false,disposed=false,lastLabel='',lastInput=null;const tracks=new Map(),failures=[];
 for(const [id,title]of Object.entries(titles)){const gain=ctx.createGain();gain.gain.value=0;gain.connect(master);tracks.set(id,{id,title,gain,target:0,buffer:null,normalization:1,source:null,loaded:false,timer:0});}
 function envelope(param,value,seconds=1.3){const now=ctx.currentTime;param.cancelScheduledValues(now);param.setTargetAtTime(value,now,seconds);}
 function ui(){const blocked=ctx.state!=='running';button.textContent=muted?'音效已关闭':blocked?'开启音效':'音效已开启';button.setAttribute('aria-pressed',String(!muted));button.setAttribute('aria-label',muted?'开启环境音效':blocked?'点击播放环境音效':'关闭环境音效');const active=[...tracks.values()].filter(t=>t.target>.11&&t.loaded).sort((a,b)=>b.target-a.target).slice(0,3).map(t=>t.title).join(' · ');const text=muted?'':blocked?'点击页面，听见小院':active?'正在听 · '+active:failures.length?'部分音效暂未载入':'';if(text!==lastLabel){label.textContent=text;lastLabel=text;}}
 // Overlap loop tails and heads, so short insect/bird clips do not click at the join.
 function schedule(t,when=ctx.currentTime+.04){if(disposed||!t.buffer)return;const source=ctx.createBufferSource(),edge=ctx.createGain();source.buffer=t.buffer;source.connect(edge);edge.connect(t.gain);const duration=t.buffer.duration,fade=Math.min(1.2,duration*.14);edge.gain.setValueAtTime(0,when);edge.gain.linearRampToValueAtTime(1,when+fade);edge.gain.setValueAtTime(1,when+duration-fade);edge.gain.linearRampToValueAtTime(0,when+duration);source.start(when);source.stop(when+duration+.01);source.onended=()=>{source.disconnect();edge.disconnect();};t.source=source;t.next=when+duration-fade;}
 function tick(){if(disposed)return;if(ctx.state==='running')for(const t of tracks.values()){if(t.loaded&&!t.source)schedule(t);else if(t.loaded&&t.next<ctx.currentTime+.5)schedule(t,Math.max(ctx.currentTime+.02,t.next));}ui();}
 async function unlock(){if(disposed||document.hidden)return;try{await ctx.resume();}catch{}tick();}
 function gesture(e){if(!muted&&!e.target.closest?.('#sound-toggle'))unlock();}
 document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
 button.onclick=()=>{if(ctx.state!=='running'&&!muted){unlock();return;}muted=!muted;envelope(master.gain,muted?0:AMBIENCE_LEVEL,.14);if(!muted)unlock();ui();};
 function visibility(){if(document.hidden)ctx.suspend();else unlock();}document.addEventListener('visibilitychange',visibility);
 const ready=Promise.all([...tracks.values()].map(async t=>{try{const response=await fetch(`./audio/ambience/${t.id}.mp3`);if(!response.ok)throw Error(response.status);const buffer=await ctx.decodeAudioData(await response.arrayBuffer());let sum=0,peak=0,count=0;for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i+=12){const v=data[i];sum+=v*v;peak=Math.max(peak,Math.abs(v));count++;}}const rms=Math.sqrt(sum/Math.max(1,count));t.normalization=Math.min(18,.12/Math.max(rms,.003),1.8/Math.max(peak,.02));t.rms=rms;t.peak=peak;t.buffer=buffer;t.loaded=true;envelope(t.gain.gain,t.target*t.normalization);tick();}catch(error){failures.push(t.id);console.warn('Ambient audio unavailable:',t.id,String(error));}}));
 const timer=setInterval(tick,200);unlock();
 return {ready,update(input){lastInput=input;const mix=soundMix(input);for(const t of tracks.values()){const next=mix[t.id]||0;if(Math.abs(next-t.target)>.002){t.target=next;envelope(t.gain.gain,next*t.normalization);}}ui();},get state(){return {context:ctx.state,muted,failures,input:lastInput,tracks:[...tracks.values()].map(t=>({id:t.id,target:t.target,gain:t.gain.gain.value,loaded:t.loaded,duration:t.buffer?.duration,rms:t.rms,peak:t.peak,normalization:t.normalization}))};},dispose(){disposed=true;clearInterval(timer);document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('visibilitychange',visibility);ctx.close();}};
}
