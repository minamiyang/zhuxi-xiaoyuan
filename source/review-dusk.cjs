const {chromium}=require('playwright'),fs=require('fs');
const dir=process.argv[3]||'verification/暮色与夜景减法_20260909',phase=process.argv[2]||'before';
fs.mkdirSync(dir,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],states=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await p.goto('http://127.0.0.1:8770/preview/?v=dusk-'+phase);await p.waitForFunction(()=>window.sceneReady,null,{timeout:120000});
for(const h of [16,17,17.6,18.2,18.7,19.3,21]){await p.evaluate(h=>viewer.seekFrame({seconds:9,hour:h,camera:{position:[-13.8,12.4,15],target:[0,1.95,0],zoom:1}}),h);await p.screenshot({path:`${dir}/${phase}-${h}.png`});states.push(await p.evaluate(()=>({hour:viewer.dayCycle.state.hour,...viewer.storySky.state})));}
fs.writeFileSync(`${dir}/${phase}-check.json`,JSON.stringify({errors,states},null,2));console.log(JSON.stringify({errors,states}));await b.close();})();
