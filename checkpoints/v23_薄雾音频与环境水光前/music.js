export function createMusic(){
 const audio=document.getElementById('music-audio'),button=document.getElementById('music');let blocked=false,muted=false,suspended=false;
 audio.volume=.26;
 function draw(){button.textContent=muted?'配乐已静音':blocked?'开启配乐':'配乐已开启';button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'开启背景配乐':blocked?'点击播放背景配乐':'静音背景配乐');}
 async function play(){if(suspended||document.hidden)return;try{await audio.play();blocked=false;}catch(e){blocked=true;if(e.name!=='NotAllowedError'&&e.name!=='AbortError')console.warn('Music playback:',e.name);}draw();}
 button.onclick=()=>{if(blocked&&!muted){play();return;}muted=!muted;audio.muted=muted;draw();if(!muted)play();};
 function unlock(e){if(!muted&&audio.paused&&!suspended&&!e.target.closest?.('#music'))play();}
 document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
 audio.addEventListener('playing',()=>{blocked=false;draw();});audio.addEventListener('error',()=>{button.textContent='配乐暂未载入';});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();else if(!suspended)play();});
 draw();play();return {audio,play,suspend(value){suspended=value;if(value)audio.pause();else play();},get state(){return {muted,blocked,paused:audio.paused,suspended};}};
}
