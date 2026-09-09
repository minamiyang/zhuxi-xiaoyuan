const {chromium}=require('playwright'),fs=require('fs');
const phase=process.argv[2]||'before',dir='verification/天空质感动态_20260909';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await p.goto('http://127.0.0.1:8770/preview/?v=sky-motion-'+phase);await p.waitForFunction(()=>window.sceneReady,null,{timeout:120000});
const report={errors,samples:[]};
for(const [name,hour]of [['night',21],['day',8]]){
 await p.evaluate(h=>{viewer.seekFrame({seconds:9,hour:h,camera:{position:[-13.8,12.4,15],target:[0,1.95,0],zoom:1}});viewer.dayCycle.play();},hour);
 const start=Date.now();
 for(let i=0;i<4;i++){if(i)await p.waitForTimeout(2200);await p.screenshot({path:`${dir}/${phase}-running-${name}-${i}.png`});report.samples.push(await p.evaluate(({name,wall})=>({name,wall,...viewer.storySky.state,hour:viewer.dayCycle.state.hour}),{name,wall:(Date.now()-start)/1000}));}
 await p.evaluate(()=>viewer.setPlaying(false));
}
fs.writeFileSync(`${dir}/${phase}-motion.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await b.close();})();
