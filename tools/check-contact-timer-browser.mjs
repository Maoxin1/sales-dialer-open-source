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
const timerCallbacks=[];
let now=Date.parse('2026-10-15T09:00:00+08:00');
const contacts=new ContactWorkspace({path:join(profile,'contacts.db'),actor:{tenantId:'TEST-TENANT',salesId:'TEST-SALES',permissions:['read','import','qualify','refuse','plan','trigger','reconcile']},now:()=>now,timers:{setTimeout(fn){timerCallbacks.push(fn);return timerCallbacks.length;},clearTimeout(){}}});
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
 await expect(`document.getElementById('total')?.textContent.includes('共 0 条')`,'empty list');
 await evaluate(`document.getElementById('numbers').value='19900000001\\n19900000002';document.getElementById('source').value='GENERATED FIXTURES';document.getElementById('qualification').value='CONFIRMED';document.getElementById('import').click()`);
 await expect(`document.getElementById('total').textContent.includes('共 2 条')&&!document.getElementById('import').disabled`,'two contacts imported');
 await evaluate(`document.getElementById('plan-time').value='2026-10-16T10:00';document.getElementById('create-plan').click()`);
 await expect(`document.querySelectorAll('#plans .plan-state').length===1&&!document.getElementById('create-plan').disabled`,'first plan saved');

 await expect(`document.getElementById('timer-state').textContent.includes('已停止')`,'default stopped');
 await evaluate(`document.getElementById('start-timer').click()`);
 await expect(`document.getElementById('timer-state').textContent.includes('待触发 1 条')&&!document.getElementById('stop-timer').disabled`,'explicit timer start');
 now=Date.parse('2026-10-16T10:00:00.010+08:00');timerCallbacks.shift()();
 await evaluate(`document.getElementById('refresh-timer').click()`);
 await expect(`document.querySelector('#rehearsals .rehearsal-state')?.textContent.includes('结果未知')&&!document.getElementById('refresh-timer').disabled`,'due record visible after refresh');
 await expect(`document.getElementById('timer-events').textContent.includes('已记录，请在下方核对')`,'persisted timer outcome');
 await evaluate(`document.getElementById('stop-timer').click()`);
 await expect(`document.getElementById('timer-state').textContent.includes('已停止')&&!document.getElementById('start-timer').disabled`,'explicit stop');
 await rpc('Page.reload');await expect(`document.querySelectorAll('#rehearsals .rehearsal-state').length===1&&document.getElementById('timer-state').textContent.includes('已停止')`,'reload retains one record');
 const desktop=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'desktop.png'),Buffer.from(desktop.data,'base64'));
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await expect(`document.documentElement.scrollWidth<=390`,'mobile no horizontal overflow');
 const narrow=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'mobile.png'),Buffer.from(narrow.data,'base64'));
 assert.equal(errors.length,0);assert.equal(contacts.status().total,2);passed=true;
}catch(e){checks.push({name:'failure',passed:false,error:String(e)});process.exitCode=1;}
finally{writeFileSync(join(dest,'browser-check.json'),JSON.stringify({passed,checks,errors,profile,actualPhoneCalls:0,scope:'Local recording attempt workflow, fixed clock/generated fixtures; no phone adapter'},null,2));if(ws?.readyState===WebSocket.OPEN){try{await rpc('Browser.close');}catch{}ws.close();}if(child.exitCode===null)child.kill();await app.close();console.log(JSON.stringify({passed,checks:checks.length}));}
