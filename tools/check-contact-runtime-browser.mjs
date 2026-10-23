import {setup} from '../packages/core/test/support/contact-schedule-fixture.mjs';
import {ContactScheduleRuntime} from '../packages/core/src/contact-schedule-runtime.mjs';
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
const cleanup=[],f=setup({after:fn=>cleanup.push(fn)},2,join(root,'.local'));mkdirSync(join(f.dir,'.local'));
const config={schemaVersion:1,tenantId:f.actor.tenantId,salesId:f.actor.salesId,source:'CONTROLLED_FIXTURE',routes:f.coordinators.map(c=>{const p=c.workspace.controlledContext().permit;return Object.fromEntries(['targetId','permitId','deviceKey','accountKey'].map(k=>[k,p[k]]));})},configPath=join(f.dir,'.local/contact-schedule-routes.json');writeFileSync(configPath,JSON.stringify(config));
const contacts=f.w,runtime=new ContactScheduleRuntime({root:f.dir,actor:f.actor,coordinators:f.coordinators,now:f.now,timers:f.timers});
const app=await createWorkbench({store:new SQLiteStore(join(profile,'workbench.db')),contacts,contactRuntime:runtime});let release=null,pendingTick=null;
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
 await expect(`document.getElementById('schedule-source').textContent.includes('电话替身仿真')&&!document.getElementById('schedule-start').disabled`,'fixture source visible and stopped');
 await evaluate(`document.getElementById('schedule-start').click()`);
 await expect(`document.getElementById('schedule-state').textContent==='运行中'&&document.getElementById('schedule-counts').textContent.includes('待触发 2')`,'start schedules two targets');
 await rpc('Page.reload');await expect(`document.getElementById('schedule-state').textContent==='运行中'&&!document.getElementById('schedule-stop').disabled`,'page reload observes running session without restarting');assert.equal(f.ports[0].calls.length,0);
 await evaluate(`document.getElementById('schedule-stop').click()`);await expect(`document.getElementById('schedule-state').textContent==='已停止'&&!document.getElementById('schedule-start').disabled`,'stop clears future callbacks');
 await evaluate(`document.getElementById('schedule-start').click()`);await expect(`document.getElementById('schedule-state').textContent==='运行中'`,'explicit restart');await f.tick(65000);
 await evaluate(`document.getElementById('schedule-refresh').click()`);await expect(`document.getElementById('schedule-reason').textContent.includes('有待核对记录')`,'unknown attempt blocks new start and remains visible');
 await evaluate(`document.getElementById('reload').click()`);await expect(`document.querySelector('#controlled-records .controlled-state')?.textContent.includes('待核对，禁止重放')`,'controlled result is separate from rehearsal');
 await f.finish(0);writeFileSync(configPath,JSON.stringify({...config,routes:[config.routes[1]]}));
 await evaluate(`document.getElementById('schedule-refresh').click()`);await expect(`document.getElementById('schedule-reason').textContent.includes('配置已变化')&&document.getElementById('schedule-start').disabled&&!document.getElementById('schedule-reload').disabled`,'configuration change stops and requires explicit reload');
 await expect(`document.querySelector('#controlled-records .controlled-state')?.textContent.includes('已核对结束')`,'runtime refresh also refreshes contact result records');
 await evaluate(`document.getElementById('schedule-reload').click()`);await expect(`document.getElementById('schedule-state').textContent==='已停止'&&document.getElementById('schedule-counts').textContent.includes('已配置目标 1')&&!document.getElementById('schedule-start').disabled`,'reload keeps stopped with one route');
 const original=f.ports[1].readControlledDevice;f.ports[1].readControlledDevice=()=>new Promise(r=>release=()=>original().then(r));
 await evaluate(`document.getElementById('schedule-start').click()`);await expect(`document.getElementById('schedule-state').textContent==='运行中'`,'second route explicitly started');pendingTick=f.tick(120000);await Promise.resolve();
 await evaluate(`document.getElementById('schedule-stop').click()`);await expect(`document.getElementById('schedule-state').textContent.includes('正在停止')&&document.getElementById('schedule-reload').disabled&&document.getElementById('schedule-start').disabled`,'stop during device check displays STOPPING');
 release();await pendingTick;pendingTick=null;release=null;await evaluate(`document.getElementById('schedule-refresh').click()`);await expect(`document.getElementById('schedule-state').textContent==='已停止'`,'device check drains without sending');assert.equal(f.ports[1].calls.length,0);
 const desktop=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'desktop.png'),Buffer.from(desktop.data,'base64'));
 await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await expect(`document.documentElement.scrollWidth<=390`,'mobile no horizontal overflow');
 const narrow=await rpc('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(dest,'mobile.png'),Buffer.from(narrow.data,'base64'));
 assert.equal(errors.length,0);assert.equal(contacts.status().total,2);passed=true;
}catch(e){checks.push({name:'failure',passed:false,error:String(e)});process.exitCode=1;}
finally{writeFileSync(join(dest,'browser-check.json'),JSON.stringify({passed,checks,errors,profile,actualPhoneCalls:0,scope:'R066 runtime web lifecycle, fixture phone only; no actual phone calls'},null,2));if(ws?.readyState===WebSocket.OPEN){try{await rpc('Browser.close');}catch{}ws.close();}if(child.exitCode===null)child.kill();if(release)release();if(pendingTick)await pendingTick;await app.close();for(const fn of cleanup)fn();console.log(JSON.stringify({passed,checks:checks.length}));}
