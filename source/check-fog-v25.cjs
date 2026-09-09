const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert');
(async()=>{
 const dir='verification/晨雾起散_20260909';
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[],frames=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8770/preview/?v=25-fog',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.sceneReady,null,{timeout:120000});
 await page.evaluate(()=>{
  viewer.seekFrame({seconds:0,hour:4.6,camera:{position:[-13.8,12.4,15],target:[0,1.95,0],zoom:1}});
  window.fogRun=[];
  window.fogLog=setInterval(()=>fogRun.push({wall:performance.now(),...viewer.dayCycle.state}),250);
  viewer.dayCycle.play();
 });
 for(const h of [4.8,5.5,6.2,6.8,7.4,8.5]){
  await page.waitForFunction(h=>viewer.dayCycle.state.hour>=h,h,{timeout:120000});
  frames.push(await page.evaluate(()=>({wall:performance.now(),...viewer.dayCycle.state})));
  await page.screenshot({path:`${dir}/morning-${h}.png`});
  console.log('Captured hour '+h);
 }
 const telemetry=await page.evaluate(()=>{clearInterval(fogLog);viewer.setPlaying(false);return fogRun});
 assert(telemetry.length>30);assert(frames[0].fogBuild<.1);assert(frames[2].fogBuild===1);assert(frames.at(-1).fogClear===1);assert(frames.at(-1).fog===0);
 assert(telemetry.every(x=>x.fog<=.160001));assert(!errors.length,errors.join('\n'));
 fs.writeFileSync(`${dir}/check.json`,JSON.stringify({passed:true,method:'Sequential frames and telemetry from actual running scene at default 240-second day cycle; no native video review.',frames,telemetry,errors},null,2));
 await browser.close();console.log('Fog formation and clearing passed.');
})().catch(e=>{console.error(e);process.exit(1)});
