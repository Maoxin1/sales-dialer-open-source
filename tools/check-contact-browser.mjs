import {ContactWorkspace} from '../packages/core/src/contact-workspace.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {SQLiteStore} from '../packages/core/src/sqlite-store.mjs';
import {createWorkbench} from '../packages/core/src/workbench-server.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dest=process.env.DIALER_EVIDENCE_DIR??join(root,'evidence','contact-browser-'+Date.now());mkdirSync(dest,{recursive:true});
const profile=mkdtempSync(join(root,'.local/contact-browser-'));
const contacts=new ContactWorkspace({path:join(profile,'contacts.db'),actor:{tenantId:'TEST-TENANT',salesId:'TEST-SALES',permissions:['read','import','qualify','refuse']}});
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
 await expect(`document.getElementById('total')?.textContent.includes('共 0 条')`,'empty local list');
 await evaluate(`document.getElementById('numbers').value='19900000001\\n19900000001\\n+8619900000001';document.getElementById('source').value='GENERATED TEST DATA';document.getElementById('import').click()`);
 await expect(`document.getElementById('import-result').textContent.includes('已导入')&&document.getElementById('import-result').textContent.includes('已存在')&&document.getElementById('import-result').textContent.includes('暂不支持')`,'import duplicate and unsupported results');
 await expect(`document.getElementById('total').textContent.includes('共 1 条')&&document.querySelector('#contacts section p')?.textContent.includes('资格待确认')&&!document.getElementById('import').disabled`,'no inferred qualification');
 await expect(`document.getElementById('numbers').value===''&&!document.body.textContent.includes('19900000001')&&document.getElementById('contacts').textContent.includes('199****0001')`,'input cleared and output masked');
 await evaluate(`Array.from(document.querySelectorAll('#contacts button')).find(b=>b.textContent==='确认已有联系资格').click()`);
 await expect(`document.querySelector('#contacts section p')?.textContent.includes('资格已确认')&&!document.getElementById('import').disabled`,'explicit qualification confirmation');
 await evaluate(`Array.from(document.querySelectorAll('#contacts button')).find(b=>b.textContent==='标记资格已撤回').click()`);
 await expect(`document.querySelector('#contacts section p')?.textContent.includes('资格已撤回')&&!document.getElementById('import').disabled`,'withdraw qualification');
 await evaluate(`Array.from(document.querySelectorAll('#contacts button')).find(b=>b.textContent==='标记拒绝联系').click()`);
 await expect(`document.querySelector('#contacts section p')?.textContent.includes('拒绝联系')&&Array.from(document.querySelectorAll('#contacts button')).every(b=>b.disabled)&&!document.getElementById('import').disabled`,'refusal prevents restoration');
 await evaluate(`document.getElementById('numbers').value='19900000001';document.getElementById('qualification').value='CONFIRMED';document.getElementById('import').click()`);
 await expect(`document.getElementById('import-result').textContent.includes('已存在')&&document.querySelector('#contacts section p')?.textContent.includes('拒绝联系')`,'reimport retains refusal');
 await rpc('Page.reload');await expect(`document.getElementById('total')?.textContent.includes('共 1 条')&&document.querySelector('#contacts section p')?.textContent.includes('拒绝联系')`,'reload persistence');
 const desktop=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'desktop.png'),Buffer.from(desktop.data,'base64'));
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await expect(`document.documentElement.scrollWidth<=390`,'mobile no horizontal overflow');
 const narrow=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'mobile.png'),Buffer.from(narrow.data,'base64'));
 assert.equal(errors.length,0);assert.equal(contacts.status().total,1);passed=true;
}catch(e){checks.push({name:'failure',passed:false,error:String(e)});process.exitCode=1;}
finally{writeFileSync(join(dest,'browser-check.json'),JSON.stringify({passed,checks,errors,profile,actualPhoneCalls:0,scope:'Contact intake, generated format fixtures only; no phone adapter'},null,2));if(ws?.readyState===WebSocket.OPEN){try{await rpc('Browser.close');}catch{}ws.close();}if(child.exitCode===null)child.kill();await app.close();console.log(JSON.stringify({passed,checks:checks.length}));}
