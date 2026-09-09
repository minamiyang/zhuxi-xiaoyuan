const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert');
(async()=>{const phase=process.argv[2]||'after',dir='verification/全天受光波光_20260909';
const b=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],states=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.goto('http://127.0.0.1:8770/preview/?v=26-'+phase,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.sceneReady,null,{timeout:120000});
for(const h of phase==='before'?[21]:[5.8,6.5,12,17.3,18.8,21,2]){
for(const close of [false,true]){
await p.evaluate(({h,close})=>viewer.seekFrame({seconds:9,hour:h,camera:close?{position:[8.5,6.8,8],target:[3.35,1,.2],zoom:2.35}:{position:[-13.8,12.4,15],target:[0,1.95,0],zoom:1}}),{h,close});
await p.screenshot({path:`${dir}/${phase}-${h}-${close?'water':'hero'}.png`});
states.push(await p.evaluate(()=>({hour:viewer.dayCycle.state.hour,moon:viewer.stream().water.material.uniforms.moonEnergy.value})));
}}
if(phase==='after'){
await p.evaluate(()=>{viewer.seekFrame({seconds:9,hour:21,camera:{position:[8.5,6.8,8],target:[3.35,1,.2],zoom:2.35}});viewer.setPlaying(true)});
for(let i=0;i<3;i++){await p.waitForTimeout(2000);await p.screenshot({path:`${dir}/motion-${i}.png`});states.push(await p.evaluate(()=>({time:viewer.stream().water.material.uniforms.uTime.value})));}
}
assert(!errors.length,errors.join('\n'));fs.writeFileSync(`${dir}/${phase}-check.json`,JSON.stringify({passed:true,states,errors},null,2));console.log(JSON.stringify({phase,errors}));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
