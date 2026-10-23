import {DatabaseSync} from 'node:sqlite';
import {openControlledRecords} from '../packages/core/src/controlled-records.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {SQLiteStore} from '../packages/core/src/sqlite-store.mjs';
import {createWorkbench} from '../packages/core/src/workbench-server.mjs';
import {createControlledDemo} from '../packages/core/src/controlled-workspace.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dest=process.env.DIALER_EVIDENCE_DIR??join(root,'evidence','controlled-browser-'+Date.now());mkdirSync(dest,{recursive:true});
const records=process.argv.includes('--records');
const profile=mkdtempSync(join(root,'.local/controlled-browser-'));let controlled=await createControlledDemo({store:new SQLiteStore(join(profile,'controlled.db')),journalPath:join(profile,'delivery.db')});
if(records){controlled.close();const store=new SQLiteStore(join(profile,'controlled.db'));const state=store.read(),p=Object.values(state.localControlledPermits)[0],a=Object.values(state.attempts)[0];const journal=new DatabaseSync(p.journalPath);journal.prepare('INSERT INTO delivery(attempt,digest) VALUES(?,?)').run(a.attemptId,a.localControlledCall.digest);journal.close();store.transaction(s=>delete s.controlledWorkspace);store.close();const config={schema:1,mode:'LOCAL_CONTROLLED_READ_ONLY',storePath:'controlled.db',actorId:p.salesId,permitId:p.permitId,serial:'SYNTHETIC-BROWSER',deviceKey:p.deviceKey,installationKey:p.installationKey,accountKey:p.accountKey,expectedApkHash:p.expectedApkHash};writeFileSync(join(profile,'config.json'),JSON.stringify(config));controlled=openControlledRecords(join(profile,'config.json'),{inspect:async()=>config,readReceipt:async()=>JSON.stringify({source:'ANDROID_CONTROLLED_CALL',commandDigest:a.localControlledCall.digest,attemptId:a.attemptId,ticketId:a.trialTicketId,status:'API_SUBMITTED',outgoingConfirmed:null,connectedConfirmed:null,manualResult:null})});}
const app=await createWorkbench({store:new SQLiteStore(join(profile,'workbench.db')),controlled});
const browser=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);if(!browser)throw Error('BROWSER_REQUIRED');
const child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+join(profile,'browser'),'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,id=0,passed=false;const pending=new Map(),checks=[],errors=[],delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,name){const until=Date.now()+20000;while(Date.now()<until){if(await fn())return;await delay(100);}throw Error('TIMEOUT '+name);}
function rpc(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function evaluate(expression){const r=await rpc('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.result.description);return r.result.value;}
async function expect(expression,name){await wait(()=>evaluate(expression),name);checks.push({name,passed:true});}
try{
 await wait(()=>existsSync(join(profile,'browser/DevToolsActivePort')),'browser');const port=readFileSync(join(profile,'browser/DevToolsActivePort'),'utf8').split('\n')[0];const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};await rpc('Runtime.enable');await rpc('Page.enable');writeFileSync(join(dest,'browser-version.json'),JSON.stringify(await rpc('Browser.getVersion'),null,2));
 await rpc('Emulation.setDeviceMetricsOverride',{width:1280,height:1100,deviceScaleFactor:1,mobile:false});await rpc('Page.navigate',{url:app.url+'/controlled'});
 await expect(`document.getElementById('state')?.textContent==='待核对'`,'pending task visible');
 if(!records){
 await expect(`document.getElementById('mode').textContent.includes('记录替身')`,'demo source explicit');
 await expect(`document.getElementById('quota').textContent.includes('已使用 1 / 1')`,'spent budget visible');
 await expect(`document.getElementById('send').disabled&&document.getElementById('reconcile').disabled`,'send and unconfirmed reconciliation disabled');
 await evaluate(`document.getElementById('receipt').click()`);await expect(`document.getElementById('message').textContent.includes('没有重新发送')`,'receipt refresh does not resend');
 await rpc('Page.reload');await expect(`document.getElementById('state')?.textContent==='待核对'`,'reload preserves unknown');
 await evaluate(`document.getElementById('confirmed').checked=true;document.getElementById('confirmed').dispatchEvent(new Event('change'))`);await expect(`!document.getElementById('reconcile').disabled`,'explicit confirmation enables closure');
 await evaluate(`document.getElementById('reconcile').click()`);await expect(`document.getElementById('state').textContent==='已结束'`,'explicit close persists');
 await expect(`document.getElementById('quota').textContent.includes('已使用 1 / 1')&&document.getElementById('manual-result').textContent.includes('仍不确定')`,'no refund and manual result separate');
 await rpc('Page.reload');await expect(`document.getElementById('state')?.textContent==='已结束'&&document.getElementById('reconcile').disabled`,'reload keeps closed state');
 }else{
 await expect(`document.getElementById('mode').textContent.includes('只读查看')&&document.getElementById('connection').textContent.includes('已过期')`,'read-only and expired explicit');
 await expect(`document.getElementById('send').disabled&&!document.getElementById('receipt').disabled&&document.getElementById('reconcile').disabled`,'mutations disabled, receipt query available');
 await evaluate(`document.getElementById('confirmed').checked=true;document.getElementById('confirmed').dispatchEvent(new Event('change'))`);
 await expect(`document.getElementById('reconcile').disabled`,'confirmation cannot enable read-only mutation');
 await evaluate(`document.getElementById('receipt').click()`);
 await expect(`document.getElementById('receipt-observation').textContent.includes('曾读到匹配')&&document.getElementById('state').textContent==='待核对'&&document.getElementById('api-result').textContent.includes('未知')`,'receipt observation separate from durable state');
 await evaluate(`document.getElementById('inspect').click()`);
 await expect(`document.getElementById('connection').textContent.includes('绑定匹配')`,'explicit device check uses injected observer');
 await rpc('Page.reload');await expect(`document.getElementById('state')?.textContent==='待核对'&&document.getElementById('quota').textContent.includes('已使用 1 / 1')`,'reload preserves unknown and budget');
 }
 const desktop=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'desktop.png'),Buffer.from(desktop.data,'base64'));
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await expect(`document.documentElement.scrollWidth<=390`,'mobile no horizontal overflow');
 const narrow=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'mobile.png'),Buffer.from(narrow.data,'base64'));
 assert.equal(errors.length,0);assert.equal(controlled.status().used,1);passed=true;
}catch(e){checks.push({name:'failure',passed:false,error:String(e)});process.exitCode=1;}
finally{writeFileSync(join(dest,'browser-check.json'),JSON.stringify({passed,checks,errors,profile,actualPhoneCalls:0,scope:records?'Browser + read-only SQLite + injected observer; synthetic fixture, no device':'Browser + local coordinator + SQLite + recording USB; no device'},null,2));if(ws?.readyState===WebSocket.OPEN){try{await rpc('Browser.close');}catch{}ws.close();}if(child.exitCode===null)child.kill();await app.close();console.log(JSON.stringify({passed,checks:checks.length}));}
