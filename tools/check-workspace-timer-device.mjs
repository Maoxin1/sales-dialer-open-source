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

let baseline,fixture,result;const timerObservations=[];
async function timerObservation(version){for(let i=0;i<100;i++){let obs;try{obs=JSON.parse(run(['shell','run-as',pkg,'cat','files/workspace-timer-observation.json']));}catch{}if(obs?.version===version){timerObservations.push(obs);return obs;}await delay(750);}throw Error('NATIVE_TIMER_TIMEOUT '+version);}
async function unchangedFor(ms,version){const end=Date.now()+ms;while(Date.now()<end){await delay(1000);let o;try{o=JSON.parse(run(['shell','run-as',pkg,'cat','files/workspace-timer-observation.json']));}catch{}check(o?.version!==version,'cancelled/recovered alarm must not submit');}}
try{
 check(!/showing=true/.test(run(['shell','dumpsys','window','policy'])),'DEVICE_UNLOCK_REQUIRED');assert.match(run(['install','-r',apk]),/Success/);run(['shell','am','force-stop',pkg]);await open();baseline=state;check(state.counters.pending===0&&state.plan.paused,'workspace must be paused and reconciled');const selected=state.contacts.find(c=>c.eligible);check(!!selected,'existing eligible synthetic contact required');await select(selected.label);
 // Foreground alarm must refresh the real UI and preserve an unresolved attempt until explicit reconciliation.
 await act('30秒后自动模拟所选','AUTO_30');check(state.errorCode===''&&!state.plan.paused,'foreground timer armed');const firstVersion=state.plan.version;const firstState=state;let obs=await timerObservation(firstVersion);check(obs.result==='SIMULATED_API_RECEIVED'&&!obs.background,'foreground callback recording only');await report(firstState,'TIMER_REFRESH');check(state.counters.attempts===baseline.counters.attempts+1&&state.counters.pending===1,'foreground exactly once and pending');await nodes();await screenshot('foreground');await act('模拟结果：未接','RESULT_NO_ANSWER');
 // Home backgrounds the app; no unlock, phone API, or callback injection is used.
 await select(selected.label);await act('30秒后自动模拟所选','AUTO_30');check(state.errorCode===''&&!state.plan.paused,'background timer armed');const secondVersion=state.plan.version;run(['shell','input','keyevent','KEYCODE_HOME']);obs=await timerObservation(secondVersion);check(obs.result==='SIMULATED_API_RECEIVED'&&obs.background,'native background callback');await open();check(state.counters.attempts===baseline.counters.attempts+2&&state.counters.pending===1,'background persistence survives reenter without replay');await act('模拟结果：未接','RESULT_NO_ANSWER');
 // A user pause cancels the pending one-shot. Wait beyond its original due time.
 await select(selected.label);await act('30秒后自动模拟所选','AUTO_30');const cancelled=state.plan.version;await act('暂停计划','PAUSE');check(state.plan.paused,'explicit timer pause');await unchangedFor(35000,cancelled);await act('刷新定时结果','TIMER_REFRESH');check(state.counters.attempts===baseline.counters.attempts+2,'pause generated no attempt');
 // Force-stop removes the system alarm; reopening also revokes the saved ticket and invalidates the plan.
 await act('30秒后自动模拟所选','AUTO_30');const stopped=state.plan.version;run(['shell','am','force-stop',pkg]);await open();check(state.plan.paused&&state.plan.version>stopped,'reopen pauses old plan');await unchangedFor(35000,stopped);await act('刷新定时结果','TIMER_REFRESH');check(state.counters.attempts===baseline.counters.attempts+2&&state.counters.pending===0,'no restart catchup');await nodes();await screenshot('timer-final');
 const workspaceHash=run(['shell','run-as',pkg,'sha256sum','databases/synthetic-workspace-v1.db']);run(['shell','am','force-stop',pkg]);run(['shell','run-as',pkg,'rm','-f','files/workspace-timer-check.json']);run(['shell','am','start','-W','-n',pkg+'/com.mantou.salesdialer.contacts.WorkspaceTimerCheckActivity','--es','database','contact-tasks-v1.db','--ez','realCallsEnabled','true']);for(let i=0;i<100;i++){try{fixture=JSON.parse(run(['shell','run-as',pkg,'cat','files/workspace-timer-check.json']));break;}catch{}await delay(200);}check(fixture?.decision==='PASSED','timer fixture '+JSON.stringify(fixture));check(fixture.userWorkspaceOpened===false,'fixed fixture only');check(run(['shell','run-as',pkg,'sha256sum','databases/synthetic-workspace-v1.db'])===workspaceHash,'fixture preserves user workspace');
 result={decision:'PASSED',tests:'T646-T653',checks,fixture,baseline,final:state,timerObservations,actualPhoneCalls:0,realCallsEnabled:false,apkSha256,taskBytesSha256:sha(before)};
}catch(error){result={decision:'FAILED',error:String(error.stack),checks,fixture,baseline,final:state,timerObservations,actualPhoneCalls:0,apkSha256};try{await nodes();await screenshot('failure');}catch{}throw error;
}finally{run(['shell','am','force-stop',pkg]);assert.deepEqual(demo(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);assert.equal(dbs().includes('contact-tasks-v1.db'),productionBefore);if(result){result.demoBytesUnchanged=true;result.oldPhoneApkUnchanged=true;result.productionDatabaseUnchanged=true;writeFileSync(join(dest,'workspace-timer-cases.json'),JSON.stringify(result,null,2)+'\n');}}
console.log(JSON.stringify({decision:result.decision,checks,fixtureAssertions:fixture.assertions,final:state.counters,apkSha256,actualPhoneCalls:0}));
