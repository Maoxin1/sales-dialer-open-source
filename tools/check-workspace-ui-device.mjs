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
let baseline,fixture,result;
try{
 check(!/showing=true/.test(run(['shell','dumpsys','window','policy'])),'DEVICE_UNLOCK_REQUIRED');
 assert.match(run(['install','-r',apk]),/Success/);assert.deepEqual(demo(),before);
 run(['shell','am','force-stop',pkg]);await open();baseline=state;
 check(state.source==='SYNTHETIC_WORKSPACE_UI'&&!state.realCallsEnabled&&!state.productionAuthenticated,'synthetic source only');
 check(state.counters.pending===0,'existing unresolved user history must not be altered');
 const labels=[];for(let i=900;i<=999&&labels.length<2;i++){const l='SIM-'+i;if(!state.contacts.some(c=>c.label===l))labels.push(l);}check(labels.length===2,'two unused synthetic labels required');
 await importIds([labels[0],labels[0],labels[1]]);check(state.errorCode===''&&state.counters.contacts===baseline.counters.contacts+2,'import deduplicates');
 await importIds(['SIM-899','12345678901']);check(state.errorCode==='INVALID_LINE_2'&&state.counters.contacts===baseline.counters.contacts+2,'invalid full batch rejected');
 await select(labels[0]);await futurePlan();const plannedVersion=state.plan.version;
 await act('执行当前模拟计划','EXECUTE');check(state.errorCode==='NOT_DUE'&&state.counters.attempts===baseline.counters.attempts,'not due does not submit');
 await act('暂停计划','PAUSE');check(state.plan.paused&&state.plan.version>plannedVersion,'explicit pause invalidates');
 if(!state.inWindow||!state.clockReady)throw Error('UI_SIMULATION_ENVIRONMENT_UNAVAILABLE');
 await act('立即模拟所选','IMMEDIATE');check(state.errorCode===''&&state.counters.pending===1&&state.counters.apiReceipts===baseline.counters.apiReceipts+1,'first recorded synthetic request');
 check((await find('立即模拟所选')).enabled==='false','unknown prevents another immediate');
 const pendingId=state.attempts.at(-1).id;await screenshot('pending');
 run(['shell','am','force-stop',pkg]);await open();check(state.counters.attempts===baseline.counters.attempts+1&&state.counters.pending===1&&state.attempts.some(a=>a.id===pendingId),'restart preserves unknown without replay');
 await act('结果仍未知','RESULT_UNKNOWN');check(state.counters.pending===1,'manual unknown retains occupation');
 await click('明确关闭未知占用');check((await find('确认关闭')).enabled==='false','close requires explicit confirmation');await click('我确认合成任务没有活动或待处理通话');const old=state;await click('确认关闭');await report(old,'CLOSE_UNKNOWN');
 check(state.counters.pending===0&&state.counters.closedUnknown===baseline.counters.closedUnknown+1&&state.counters.manualKnown===baseline.counters.manualKnown,'closure does not invent known result');
 await select(labels[1]);await act('立即模拟所选','IMMEDIATE');check(state.errorCode===''&&state.counters.attempts===baseline.counters.attempts+2,'new explicit plan creates distinct attempt');
 await act('模拟结果：未接','RESULT_NO_ANSWER');check(state.counters.pending===0&&state.counters.manualKnown===baseline.counters.manualKnown+1,'manual result resolves only pending attempt');
 await contact('合成资格设为未知');check(!state.contacts.find(c=>c.label===labels[1]).eligible,'qualification change invalidates draft');
 await contact('合成资格设为确认');check(!state.contacts.find(c=>c.label===labels[1]).eligible,'qualification does not implicitly refresh draft');
 await contact('刷新所选草稿');check(state.contacts.find(c=>c.label===labels[1]).eligible,'explicit refresh restores current draft');
 await select(labels[0]);await contact('拒绝联系');const refused=state.contacts.find(c=>c.label===labels[0]);check(refused.refused&&!refused.eligible,'refusal blocks new plan');
 await importIds(labels);check(state.counters.contacts===baseline.counters.contacts+2&&state.contacts.find(c=>c.label===labels[0]).refused,'reimport preserves refusal');
 await select(labels[1]);await futurePlan();const future=state.plan.version;
 run(['shell','am','force-stop',pkg]);await open();check(state.plan.paused&&state.plan.version>future&&state.counters.attempts===baseline.counters.attempts+2&&state.counters.pending===0,'restart invalidates future without catchup');
 await click('查看工作区历史');const history=await nodes();check(history.some(n=>n.text.includes('未知占用已明确关闭')&&n.text.includes('实际呼出/接通：未知')&&n.text.includes('NO_ANSWER')),'history keeps source and unknown distinction');await screenshot('history');await click('关闭');await nodes();await screenshot('workspace-final');
 // Fixed isolated fixture accepts no supplied path/actor/number and cannot open user workspace.
 const workspaceBefore=run(['shell','run-as',pkg,'sha256sum','databases/synthetic-workspace-v1.db']);
 run(['shell','am','force-stop',pkg]);run(['shell','run-as',pkg,'rm','-f','files/synthetic-workspace-check.json']);run(['shell','am','start','-W','-n',pkg+'/com.mantou.salesdialer.contacts.SyntheticWorkspaceCheckActivity','--es','database','contact-tasks-v1.db','--es','tenantId','ATTACKER','--ez','realCallsEnabled','true']);
 for(let i=0;i<100;i++){try{fixture=JSON.parse(run(['shell','run-as',pkg,'cat','files/synthetic-workspace-check.json']));break;}catch{}await delay(200);}
 check(fixture?.decision==='PASSED','isolated workspace fixture '+JSON.stringify(fixture));check(fixture.userWorkspaceOpened===false,'fixture cannot open workspace');
 check(run(['shell','run-as',pkg,'sha256sum','databases/synthetic-workspace-v1.db'])===workspaceBefore,'fixture preserves user workspace');
 result={decision:'PASSED',tests:'T631-T639',uiChecks:checks,fixture,baseline,final:state,observations,actualPhoneCalls:0,realCallsEnabled:false,apkSha256,taskBytesSha256:sha(before)};
}catch(error){result={decision:'FAILED',error:String(error.stack),uiChecks:checks,baseline,final:state,observations,fixture,actualPhoneCalls:0,apkSha256};try{await nodes();await screenshot('failure');}catch{}throw error;
}finally{
 run(['shell','am','force-stop',pkg]);assert.deepEqual(demo(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);assert.equal(dbs().includes('contact-tasks-v1.db'),productionBefore);
 if(result){result.demoBytesUnchanged=true;result.originalPhoneApkUnchanged=true;result.productionDatabaseUnchanged=true;writeFileSync(join(dest,'workspace-ui-cases.json'),JSON.stringify(result,null,2)+'\n');}
}
console.log(JSON.stringify({decision:result.decision,uiChecks:checks,deviceAssertions:fixture.assertions,apkSha256,actualPhoneCalls:0,final:state.counters}));
