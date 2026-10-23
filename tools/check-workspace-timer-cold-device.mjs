import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
if(process.argv.slice(2).join()!=='--run')throw Error('EXPLICIT_RUN_REQUIRED');
const pkg='com.mantou.salesdialer.standalone',binding=JSON.parse(readFileSync('.local/contact-android.json'));
const dest=process.env.DIALER_EVIDENCE_DIR;if(!dest)throw Error('EVIDENCE_DIR_REQUIRED');
const adb=args=>execFileSync(resolve('.tooling/android-sdk/platform-tools/adb.exe'),['-s',binding.serial,...args],{windowsHide:true,timeout:25000,maxBuffer:8*1024*1024});
const run=args=>adb(args).toString('utf8').trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
const demo=()=>Buffer.from(run(['exec-out','run-as',pkg,'base64','files/simulation-tasks.bin']),'base64');
const before=demo();assert.equal(before[12],1,'DEMO_MUST_BE_PAUSED');
const oldPath=run(['shell','pm','path','com.mantou.salesdialer.spike']).replace(/^package:/,'');
assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);
const dbs=()=>run(['shell','run-as',pkg,'ls','databases']).split(/\s+/);
const productionBefore=dbs().includes('contact-tasks-v1.db');
const apk=resolve('prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk');
const apkSha256=sha(readFileSync(apk));
const decode=s=>s.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
let lastXml='',state,checks=0;const observations=[];
function check(value,message){assert.ok(value,message);checks++;}
async function nodes(){run(['shell','uiautomator','dump','/data/local/tmp/synthetic-workspace-ui.xml']);lastXml=run(['shell','cat','/data/local/tmp/synthetic-workspace-ui.xml']);return [...lastXml.matchAll(/<node\b[^>]*>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])])));}
function tapNode(n){assert.ok(n,'UI_NODE_MISSING');assert.equal(n.enabled,'true','UI_DISABLED '+n.text);const b=n.bounds.match(/\d+/g).map(Number);run(['shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2))]);}
async function find(text){for(let i=0;i<6;i++){let found=(await nodes()).find(n=>n.text===text||n['content-desc']===text);if(found)return found;run(['shell','input','swipe','600','1800','600','650','250']);}throw Error('UI_TEXT_MISSING '+text);}
async function click(text){tapNode(await find(text));await delay(250);}
async function report(old=state,action){for(let i=0;i<60;i++){try{const r=JSON.parse(run(['shell','run-as',pkg,'cat','files/synthetic-workspace-status.json']));if(!r.ready)throw Error('WORKSPACE_NOT_READY '+r.errorCode);if((!old||r.sessionId!==old.sessionId||r.generation>old.generation)&&(!action||r.action===action)){state=r;observations.push(r);await delay(250);return r;}}catch(e){if(e.message.startsWith('WORKSPACE_NOT_READY'))throw e;}await delay(150);}throw Error('UI_REPORT_TIMEOUT '+action);}
async function act(text,action){const old=state;await click(text);return report(old,action);}
async function fill(lines){tapNode((await nodes()).find(n=>n.class==='android.widget.EditText'));run(['shell','input','keycombination','113','29']);for(let i=0;i<lines.length;i++){if(i)run(['shell','input','keyevent','66']);run(['shell','input','text',lines[i].replaceAll(' ','%s')]);}run(['shell','input','keyevent','4']);}
async function importIds(lines){const old=state;await click('导入合成联系人');await fill(lines);await click('导入');return report(old,'IMPORT');}
async function select(label){await click('选择合成联系人');const node=(await nodes()).find(n=>n.text.startsWith(label+' ·'));tapNode(node);await delay(250);}
async function contact(label){const old=state;await click('联系人操作');await click(label);return report(old);}
async function open(){run(['shell','am','start','-W','-n',pkg+'/.MainActivity']);await delay(450);await click('打开合成任务工作区');return report(state,'OPEN');}
async function screenshot(name){writeFileSync(join(dest,name+'.png'),adb(['exec-out','screencap','-p']));writeFileSync(join(dest,name+'.xml'),lastXml);}
async function futurePlan(){const old=state;await click('安排模拟时间');const input=(await nodes()).find(n=>n.class==='android.widget.EditText');check(/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(input.text),'explicit Beijing time visible');await click('保存计划');await report(old,'PLAN');check(state.errorCode===''&&!state.plan.paused,'future plan saved');}

let baseline,result;const pid=()=>{try{return run(['shell','pidof',pkg]);}catch{return '';}};
try{check(!/showing=true/.test(run(['shell','dumpsys','window','policy'])),'DEVICE_UNLOCK_REQUIRED');run(['shell','am','force-stop',pkg]);await open();baseline=state;check(state.counters.pending===0,'no unresolved existing attempt');const row=state.contacts.find(c=>c.eligible);check(!!row,'eligible synthetic target');await select(row.label);await act('30秒后自动模拟所选','AUTO_30');check(state.errorCode===''&&!state.plan.paused,'cold-launch ticket armed');const version=state.plan.version,oldPid=pid();run(['shell','input','keyevent','KEYCODE_HOME']);await delay(500);check(/^\d+$/.test(oldPid),'single owned process ID required');run(['shell','run-as',pkg,'kill','-9',oldPid]);await delay(500);const afterKill=pid();check(afterKill==='','owned process death must actually be observed');let observation;for(let i=0;i<100;i++){try{const o=JSON.parse(run(['shell','run-as',pkg,'cat','files/workspace-timer-observation.json']));if(o.version===version){observation=o;break;}}catch{}await delay(750);}check(observation?.result==='SIMULATED_API_RECEIVED'&&observation.background,'native receiver cold launch submits synthetic request');const newPid=pid();check(newPid!==''&&newPid!==oldPid,'callback ran in new process');await open();check(state.counters.attempts===baseline.counters.attempts+1&&state.counters.pending===1&&state.plan.paused,'cold callback persisted exactly one unknown');await act('模拟结果：未接','RESULT_NO_ANSWER');check(state.counters.pending===0,'explicit synthetic reconciliation');await nodes();await screenshot('cold-final');result={decision:'PASSED',test:'T655',termination:'same-app-uid SIGKILL simulates process death, not force-stop',checks,oldPid,afterKill,newPid,observation,baseline,final:state,apkSha256,actualPhoneCalls:0};
}catch(e){result={decision:'FAILED',error:String(e.stack),checks,baseline,final:state,actualPhoneCalls:0};try{await nodes();await screenshot('failure');}catch{}throw e;
}finally{run(['shell','am','force-stop',pkg]);assert.deepEqual(demo(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);if(result)writeFileSync(join(dest,'cold-cases.json'),JSON.stringify({...result,demoUnchanged:true,oldApkUnchanged:true},null,2)+'\n');}
console.log(JSON.stringify({decision:result.decision,checks,actualPhoneCalls:0}));
