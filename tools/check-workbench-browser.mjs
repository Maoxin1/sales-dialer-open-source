import { createAdbGuardFactory } from '../packages/core/src/adb-guard-transport.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync,existsSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve,dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { ObservedTrial } from '../packages/core/src/observed-trial.mjs';
import { TrialWorkspace } from '../packages/core/src/trial-workspace.mjs';
import { SQLiteStore } from '../packages/core/src/sqlite-store.mjs';
import { createWorkbench } from '../packages/core/src/workbench-server.mjs';
import { createHash } from 'node:crypto';
import { AndroidWorkspace } from '../packages/core/src/android-workspace.mjs';
import { AndroidDeviceBinding } from '../packages/core/src/android-device-binding.mjs';
import { AdbSyntheticTransport } from '../packages/core/src/adb-synthetic-transport.mjs';
import { PhoneCapabilities } from '../packages/core/src/phone-capabilities.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dest=process.env.DIALER_EVIDENCE_DIR||resolve(root,'evidence/browser-'+Date.now());mkdirSync(dest,{recursive:true});
const profile=resolve(root,'.local/browser-check-'+Date.now());mkdirSync(profile,{recursive:true});
const browser=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if(!browser)throw new Error('NO_LOCAL_BROWSER');
const db=join(profile,'workbench.db');let android=null,observed=null;const deviceCommands=[];
if(process.env.DIALER_ANDROID_SERIAL){
 const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial:process.env.DIALER_ANDROID_SERIAL,record:r=>deviceCommands.push(r)});
 const expectedApkHash=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
 android=new AndroidWorkspace({store:new SQLiteStore(db+'.android.db'),binding:new AndroidDeviceBinding({transport,expectedApkHash}),phone:new PhoneCapabilities({read:()=>transport.readPhoneCapabilities(expectedApkHash)})});
}
if(process.env.DIALER_OBSERVED_SERIAL){
 const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial:process.env.DIALER_OBSERVED_SERIAL,record:r=>deviceCommands.push(r)});
 const hash=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
 observed=new ObservedTrial({guardFactory:createAdbGuardFactory(transport,hash),store:new SQLiteStore(db+'.observed.db'),phone:new PhoneCapabilities({read:()=>transport.readPhoneCapabilities(hash)})});
}
const app=await createWorkbench({store:new SQLiteStore(db),port:0,android,observed,trial:new TrialWorkspace(new SQLiteStore(db+'.trial.db'))});
const child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+join(profile,'browser'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let stderr='',ws,id=0;child.stderr.on('data',b=>{stderr+=b.toString();});
const pending=new Map(),steps=[],errors=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label){const until=Date.now()+25000;while(Date.now()<until){if(await fn())return;await delay(100);}throw new Error('TIMEOUT: '+label);}
async function rpc(method,params={}){const key=++id;return new Promise((resolve,reject)=>{pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});}
async function evaluate(expression){const r=await rpc('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+': '+r.result.description);return r.result.value;}
async function click(id){await evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);await waitFor(()=>evaluate(`!document.getElementById(${JSON.stringify(id)}).disabled`),id+' complete');}
async function set(id,value){await evaluate(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)}`);}
async function expect(expression,label){await waitFor(()=>evaluate(expression),label);steps.push({name:label,passed:true});}
let passed=false;
try {
  await waitFor(()=>existsSync(join(profile,'browser/DevToolsActivePort')),'browser ready');
  const port=readFileSync(join(profile,'browser/DevToolsActivePort'),'utf8').split('\n')[0];
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
  await rpc('Runtime.enable');await rpc('Page.enable');
  const version=await rpc('Browser.getVersion');writeFileSync(join(dest,'browser-version.json'),JSON.stringify(version,null,2));
  await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await rpc('Page.navigate',{url:app.url});
  await expect(`document.getElementById('metrics')?.children.length===6`,'workbench loads');
  await click('sample');await click('import-button');
  await expect(`document.getElementById('contact-count').textContent==='2 个目标'`,'self import visible before tasks');
  await click('create-task');await expect(`document.querySelectorAll('#tasks tr').length===1`,'own task created');
  await set('outcome','UNKNOWN');await click('trigger');
  await expect(`document.getElementById('attempt-state').textContent==='待核对'`,'unknown submission stays pending');
  await rpc('Page.reload');await expect(`document.getElementById('metrics')?.children[5]?.querySelector('strong').textContent==='1'`,'reload preserves unknown, no replay');
  await evaluate(`document.querySelector('#tasks button').click()`);
  await evaluate(`document.getElementById('no-active-call').checked=true`);await click('reconcile');
  await expect(`document.getElementById('attempt-state').textContent==='已结束'`,'explicit manual reconciliation');
  await click('refuse');await click('retry');
  await expect(`document.getElementById('message').textContent.includes('拒绝联系')`,'refusal prevents another attempt');
  await set('target','SYNTHETIC-TARGET-2');await click('create-task');
  await expect(`document.querySelectorAll('#tasks tr').length===2`,'second task created');
  await click('pause');await click('resume');await click('tick');
  await expect(`document.getElementById('message').textContent.includes('重新安排')`,'resume does not replay paused plan');
  await click('replan');await set('outcome','SUBMITTED');await click('tick');
  await expect(`document.getElementById('attempt-state').textContent==='已提交，待核对'`,'replanned task accepted');
  await click('observed-outgoing');await click('observed-connected');
  await expect(`document.getElementById('metrics').children[4].querySelector('strong').textContent==='1'`,'simulated observations separate from submission');
  await set('manual-result','COMPLETED');await evaluate(`document.getElementById('no-active-call').checked=true`);await click('reconcile');
  await expect(`document.getElementById('attempt-state').textContent==='已结束'`,'second task finishes');
  const snapshot=await evaluate(`fetch('/api/status',{headers:{Authorization:'Bearer '+document.querySelector('meta[name="session-token"]').content}}).then(r=>r.json())`);
  assert.deepEqual([snapshot.metrics.U,snapshot.metrics.G,snapshot.metrics.Q,snapshot.metrics.O,snapshot.metrics.C,snapshot.metrics.unknownPending],[2,2,1,1,1,0]);
  writeFileSync(join(dest,'browser-final-state.json'),JSON.stringify(snapshot,null,2));
  await rpc('Page.navigate',{url:app.url+'/trial'});
  await expect(`document.getElementById('trial-quota')?.textContent.includes('剩余 1 / 1')`,'T177 trial preset visible');
  await click('trial-submit');await expect(`document.getElementById('trial-message').textContent.includes('先选择')`,'T177 explicit selection required');
  await click('trial-select');await click('trial-submit');
  await expect(`document.getElementById('trial-state').textContent==='结果未知，待核对'`,'T177 unknown receipt visible');
  await rpc('Page.reload');await expect(`document.getElementById('trial-quota')?.textContent.includes('剩余 0 / 1')`,'T177 reload retains spent quota');
  await click('trial-submit');await expect(`document.getElementById('trial-message').textContent.includes('不会再次提交')`,'T177 duplicate blocked');
  await click('trial-reconcile');await expect(`document.getElementById('trial-message').textContent.includes('先勾选')`,'T177 explicit confirmation required');
  await evaluate(`document.getElementById('trial-confirm').checked=true`);await click('trial-reconcile');
  await expect(`document.getElementById('trial-state').textContent==='已核对，额度不返还'`,'T177 reconciliation without refund');
  const trialState=await evaluate(`fetch('/api/trial/status',{headers:{Authorization:'Bearer '+document.querySelector('meta[name="session-token"]').content}}).then(r=>r.json())`);
  assert.equal(trialState.used,1);assert.equal(trialState.realCallsEnabled,false);writeFileSync(join(dest,'trial-final-state.json'),JSON.stringify(trialState,null,2));
  writeFileSync(join(dest,'trial-desktop.png'),Buffer.from((await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await expect(`document.documentElement.scrollWidth<=390`,'T177 trial narrow layout');
  writeFileSync(join(dest,'trial-narrow.png'),Buffer.from((await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await rpc('Page.navigate',{url:app.url});await expect(`document.getElementById('metrics')?.children.length===6`,'T177 return to main workbench');
  if(observed){
   await rpc('Page.navigate',{url:app.url+'/observed'});
   await expect(`document.getElementById('observed-quota')?.textContent==='尚未建立轮次'`,'T188 observed page unbound');
   await click('observed-submit');await expect(`document.getElementById('observed-message').textContent.includes('先读取')`,'T188 no implicit binding');
   await click('observed-refresh');await expect(`document.getElementById('observed-accounts').options.length>1`,'T188 actual phone accounts displayed');
   assert.equal(await evaluate(`document.getElementById('observed-accounts').value`),'');steps.push({name:'T188 no default SIM',passed:true});
   const label=process.env.DIALER_OBSERVED_ACCOUNT;if(!label)throw Error('EXPLICIT_OBSERVED_ACCOUNT_REQUIRED');
   await evaluate(`{const s=document.getElementById('observed-accounts');const matches=[...s.options].filter(o=>o.textContent===${JSON.stringify(label)});if(matches.length!==1)throw Error('AMBIGUOUS_ACCOUNT');s.value=matches[0].value;}`);
   await click('observed-bind');await expect(`document.getElementById('observed-selected').textContent.includes('观察绑定：')`,'T188 explicit observed account binding');
   await click('observed-submit');await expect(`document.getElementById('observed-result').textContent==='原生检查就绪，待核对；尚未拨号'`,'T207 native ready receipt after real preflight');
   await rpc('Page.reload');await expect(`document.getElementById('observed-quota')?.textContent.includes('已使用 1 / 1')`,'T188 reload keeps consumed quota');
   await click('observed-submit');await expect(`document.getElementById('observed-message').textContent.includes('不会重复提交')`,'T188 duplicate blocked');
   await click('observed-reconcile');await expect(`document.getElementById('observed-message').textContent.includes('先勾选')`,'T188 no-active confirmation required');
   await evaluate(`document.getElementById('observed-confirm').checked=true`);await click('observed-reconcile');
   await expect(`document.getElementById('observed-result').textContent==='模拟占用已关闭，额度不返还'`,'T188 explicit closure without refund');
   const state=observed.status();assert.equal(state.attempt.nativeGuardReceipt.status,'DRY_RUN_READY');assert.equal(state.attempt.apiSubmission,'UNKNOWN');assert.equal(state.realCallsEnabled,false);assert.equal(state.requests.length,1);assert.equal(state.used,1);
   writeFileSync(join(dest,'observed-final-state.json'),JSON.stringify(state,null,2));
   writeFileSync(join(dest,'observed-desktop.png'),Buffer.from((await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
   await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
   await expect(`document.documentElement.scrollWidth<=390`,'T188 observed narrow layout');
   writeFileSync(join(dest,'observed-narrow.png'),Buffer.from((await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
   await rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});await rpc('Page.navigate',{url:app.url});await expect(`document.getElementById('metrics')?.children.length===6`,'T188 return from observation');
  }
  if(android){
   await click('phone-create');await expect(`document.getElementById('phone-tasks').options.length===1`,'T124 independent wall-clock task created');
   await click('phone-send');await expect(`document.getElementById('phone-result').textContent.includes('先绑定')`,'T124 unbound phone blocks submission');
   await click('phone-bind');await expect(`document.getElementById('phone-status').textContent.includes('绑定至')`,'T124 actual S23 APK and boot capability checked');
   await click('phone-send');await expect(`document.getElementById('phone-result').textContent.includes('手机收到合成任务')`,'T124 browser to USB phone synthetic receipt');
   await click('phone-send');assert.equal(android.status().metrics.G,1);steps.push({name:'T124 duplicate button does not authorize twice',passed:true});
   await rpc('Page.reload');await expect(`document.getElementById('phone-count').textContent.includes('授权 1')`,'T124 reload keeps pending phone task');
   await evaluate(`document.getElementById('phone-confirm').checked=true`);await click('phone-reconcile');
   await expect(`document.getElementById('phone-tasks').textContent.includes('已关闭')`,'T124 explicit synthetic reconciliation');
   await set('phone-target','SYNTHETIC-TIMER-BROWSER');await click('phone-create');
   await evaluate(`const s=document.getElementById('phone-tasks');s.selectedIndex=s.options.length-1;s.dispatchEvent(new Event('change'))`);
   await click('phone-bind');await click('phone-schedule');
   await expect(`document.getElementById('phone-schedule-state').textContent.includes('等待到点')`,'T135 timed plan saved from browser');
   await rpc('Page.navigate',{url:'about:blank'});
   await waitFor(()=>android.status().schedules.some(p=>p.status==='COMPLETED'),'T135 timer fires with browser page closed');
   assert.equal(android.status().metrics.G,2);steps.push({name:'T135 browser closed, host timer delivered one synthetic task to S23',passed:true});
   await rpc('Page.navigate',{url:app.url});await expect(`document.getElementById('phone-count').textContent.includes('授权 2')`,'T135 reopening shows durable timer result');
   await evaluate(`const s=document.getElementById('phone-tasks');s.selectedIndex=s.options.length-1;s.dispatchEvent(new Event('change'));document.getElementById('phone-confirm').checked=true`);
   await click('phone-reconcile');await expect(`document.getElementById('phone-tasks').selectedOptions[0].textContent.includes('已关闭')`,'T135 timed attempt explicitly reconciled');
   await click('phone-pause');
   await click('phone-cap-refresh');await expect(`document.getElementById('phone-accounts').options.length>1`,'T140 read-only phone accounts shown');
   await evaluate(`{const s=document.getElementById('phone-accounts');s.value=[...s.options].find(o=>o.textContent==='电销卡')?.value??'';}`);
   await click('phone-account-select');await expect(`document.getElementById('phone-selected-account').textContent.includes('只读绑定：电销卡')`,'T140 explicitly selected sales SIM remains separate from synthetic SIM');
   assert.equal(android.status().phoneCapabilities.callAuthorization,'DENY');steps.push({name:'T140 phone observation never enables real calls',passed:true});
   assert.equal(android.status().metrics.O,0);assert.equal(android.status().metrics.C,0);
   writeFileSync(join(dest,'android-final-state.json'),JSON.stringify(android.status(),null,2));
  }
  const shot=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'workbench-desktop.png'),Buffer.from(shot.data,'base64'));
  await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await expect(`document.documentElement.scrollWidth<=390`,'narrow layout has no page overflow');
  const small=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'workbench-narrow.png'),Buffer.from(small.data,'base64'));
  assert.equal(errors.length,0,'no browser runtime exceptions');passed=true;
}catch(error){steps.push({name:'browser failure',passed:false,error:String(error),stack:error.stack});process.exitCode=1;}
finally {
  if(android)writeFileSync(join(dest,'android-exit-state.json'),JSON.stringify(android.status(),null,2));
  if(ws?.readyState===WebSocket.OPEN){try{await rpc('Browser.close');}catch{}ws.close();}
  if(child.exitCode===null)child.kill();
  await app.close();
  writeFileSync(join(dest,'browser-check.json'),JSON.stringify({passed,browser,steps,errors,profile,realPhoneAdapterConnected:false,scope:observed?'Browser + Android native guard linked to durable synthetic ticket; zero phone API':android?'Browser plus USB Android synthetic E2E; no phone API':'Automated desktop browser against local synthetic server; no Android/iPhone E2E'},null,2));
  if(android||observed)writeFileSync(join(dest,'android-commands.json'),JSON.stringify(deviceCommands,null,2));
  writeFileSync(join(dest,'browser-stderr.log'),stderr);
  console.log(JSON.stringify({passed,checks:steps.length,evidence:dest}));
}
