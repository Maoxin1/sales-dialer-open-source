import {ContactWorkspace} from '../packages/core/src/contact-workspace.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {SQLiteStore} from '../packages/core/src/sqlite-store.mjs';
import {createWorkbench} from '../packages/core/src/workbench-server.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dest=process.env.DIALER_EVIDENCE_DIR??join(root,'evidence','attempt-browser-'+Date.now());mkdirSync(dest,{recursive:true});
const profile=mkdtempSync(join(root,'.local/contact-browser-'));
let now=Date.parse('2026-10-15T09:00:00+08:00');
const contacts=new ContactWorkspace({path:join(profile,'contacts.db'),actor:{tenantId:'TEST-TENANT',salesId:'TEST-SALES',permissions:['read','import','qualify','refuse','plan','trigger','reconcile']},now:()=>now});
const app=await createWorkbench({store:new SQLiteStore(join(profile,'workbench.db')),contacts});
const browser=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);if(!browser)throw Error('BROWSER_REQUIRED');
const child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+join(profile,'browser'),'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,id=0,passed=false;const pending=new Map(),checks=[],errors=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,name){const until=Date.now()+20000;while(Date.now()<until){if(await fn())return;await delay(100);}throw Error('TIMEOUT '+name);}
function rpc(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function evaluate(expression){const r=await rpc('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.result.description);return r.result.value;}
async function expect(expression,name){await wait(()=>evaluate(expression),name);checks.push({name,passed:true});}
try{
 await wait(()=>existsSync(join(profile,'browser/DevToolsActivePort')),'browser');const port=readFileSync(join(profile,'browser/DevToolsActivePort'),'utf8').split('\n')[0];const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};await rpc('Runtime.enable');await rpc('Page.enable');writeFileSync(join(dest,'browser-version.json'),JSON.stringify(await rpc('Browser.getVersion'),null,2));
 await rpc('Emulation.setDeviceMetricsOverride',{width:1280,height:1100,deviceScaleFactor:1,mobile:false});await rpc('Page.navigate',{url:app.url+'/contacts'});
 await expect(`document.getElementById('schedule-reason')?.textContent.includes('未配置可信运行会话')&&document.getElementById('schedule-start').disabled`,'missing runtime disables web start');
 await expect(`document.getElementById('total')?.textContent.includes('共 0 条')`,'empty list');
 await evaluate(`document.getElementById('numbers').value='19900000001\\n19900000002';document.getElementById('source').value='GENERATED FIXTURES';document.getElementById('qualification').value='CONFIRMED';document.getElementById('import').click()`);
 await expect(`document.getElementById('total').textContent.includes('共 2 条')&&!document.getElementById('import').disabled`,'two contacts imported');
 await evaluate(`document.getElementById('plan-time').value='2026-10-16T10:00';document.getElementById('create-plan').click()`);
 await expect(`document.querySelectorAll('#plans .plan-state').length===1&&!document.getElementById('create-plan').disabled`,'first plan saved');
 await evaluate(`Array.from(document.querySelectorAll('#plans button')).find(b=>b.textContent==='检查安卓对应关系（不拨号）').click()`);
 await expect(`document.querySelector('#plans .preflight-result')?.textContent.includes('未配置可信目标、设备与SIM对应关系')&&!document.getElementById('import').disabled`,'unconfigured trusted preflight blocks explicitly');
 await evaluate(`Array.from(document.querySelectorAll('#plans button')).find(b=>b.textContent==='立即本地演练（不拨号）').click()`);
 await expect(`document.querySelector('#rehearsals .rehearsal-state')?.textContent.includes('结果未知')&&!document.getElementById('import').disabled`,'unknown recording visible');
 await expect(`document.querySelector('#rehearsals button').disabled&&document.querySelector('#rehearsals .rehearsal-state').textContent.includes('实际呼出/接通：无证据')`,'explicit confirmation and evidence boundary');
 await rpc('Page.reload');await expect(`document.querySelectorAll('#rehearsals .rehearsal-state').length===1&&document.querySelector('#rehearsals .rehearsal-state').textContent.includes('结果未知')&&!document.getElementById('create-plan').disabled`,'reload does not replay');
 await evaluate(`document.getElementById('plan-target').selectedIndex=1;document.getElementById('plan-time').value='2026-10-16T11:00';document.getElementById('create-plan').click()`);
 await expect(`document.querySelectorAll('#plans .plan-state').length===2&&!document.getElementById('import').disabled`,'next plan available without dispatch');
 await expect(`Array.from(document.querySelectorAll('#plans button')).filter(b=>b.textContent==='立即本地演练（不拨号）').every(b=>b.disabled)`,'occupancy blocks all new rehearsals');
 await evaluate(`const c=document.querySelector('#rehearsals input[type=checkbox]');c.checked=true;c.dispatchEvent(new Event('change'));document.querySelector('#rehearsals button').click()`);
 await expect(`document.querySelector('#rehearsals .rehearsal-state').textContent.includes('演练已结束')&&!document.getElementById('import').disabled`,'explicit local closure');
 await evaluate(`Array.from(document.querySelectorAll('#plans button')).find(b=>b.textContent==='立即本地演练（不拨号）'&&!b.disabled).click()`);
 await expect(`document.querySelectorAll('#rehearsals .rehearsal-state').length===2&&Array.from(document.querySelectorAll('#rehearsals .rehearsal-state')).filter(p=>p.textContent.includes('结果未知')).length===1&&!document.getElementById('import').disabled`,'next plan records once');
 await expect(`document.getElementById('recording-counts').textContent.includes('涉及不同目标 2')&&document.getElementById('recording-counts').textContent.includes('本地记录尝试 2')&&document.getElementById('recording-counts').textContent.includes('已核对结束 1')&&document.getElementById('recording-counts').textContent.includes('待核对 1')`,'classified current seller totals');
 await expect(`document.getElementById('call-evidence').textContent==='实际呼出：暂无证据 · 实际接通：暂无证据'`,'manual completion never claims actual phone success');

 // Controlled hold fixture uses an independent trusted constructor, never a phone port.
 for(const a of contacts.status().rehearsals.filter(a=>a.status!=='FINISHED'))contacts.execute({op:'closeRehearsal',attemptId:a.attemptId,confirmed:true,result:'UNKNOWN'});
 const target=contacts.execute({op:'import',rows:['19900000003'],source:'GENERATED FIXTURE',qualification:'CONFIRMED'}).rows[0].targetId;
 const planned=contacts.execute({op:'plan',targetId:target,expectedRevision:1,plannedAt:now+60000,requestId:'BROWSER-CONTROLLED-PLAN'});
 const permit={permitId:'BROWSER-FIXTURE',tenantId:'TEST-TENANT',salesId:'TEST-SALES',targetId:target,deviceKey:'a'.repeat(64),accountKey:'b'.repeat(64),notBefore:now,expiresAt:now+60000,maxAttempts:1,source:'CONTROLLED_FIXTURE',consentRef:'SYNTHETIC ONLY'};
 const heldWorkspace=new ContactWorkspace({path:join(profile,'contacts.db'),actor:{tenantId:'TEST-TENANT',salesId:'TEST-SALES',permissions:['read','trigger']},now:()=>now,controlledPermit:permit,androidPreflight:{mapping:permit}});
 try{assert.equal(heldWorkspace.reserveControlled({planId:planned.planId,expectedVersion:1,requestId:'BROWSER-CONTROLLED-SEND'}).decision,'RESERVED');}finally{heldWorkspace.close();}
 await rpc('Page.reload');await expect(`document.querySelector('#controlled-records .controlled-state')?.textContent.includes('模拟受控测试')&&document.querySelector('#controlled-records .controlled-state')?.textContent.includes('待核对，禁止重放')`,'controlled hold visible without fabricated success');
 await expect(`Array.from(document.querySelectorAll('#plans button')).filter(b=>b.textContent==='立即本地演练（不拨号）').every(b=>b.disabled)&&document.querySelectorAll('#controlled-records button').length===0`,'controlled hold blocks rehearsal and has no release/send button');
 const desktop=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'desktop.png'),Buffer.from(desktop.data,'base64'));
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await expect(`document.documentElement.scrollWidth<=390`,'mobile no horizontal overflow');
 const narrow=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'mobile.png'),Buffer.from(narrow.data,'base64'));
 assert.equal(errors.length,0);assert.equal(contacts.status().total,3);passed=true;
}catch(e){checks.push({name:'failure',passed:false,error:String(e)});process.exitCode=1;}
finally{writeFileSync(join(dest,'browser-check.json'),JSON.stringify({passed,checks,errors,profile,actualPhoneCalls:0,scope:'Local recording attempt workflow, fixed clock/generated fixtures; no phone adapter'},null,2));if(ws?.readyState===WebSocket.OPEN){try{await rpc('Browser.close');}catch{}ws.close();}if(child.exitCode===null)child.kill();await app.close();console.log(JSON.stringify({passed,checks:checks.length}));}
