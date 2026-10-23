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
async function nodes(){const path='/data/local/tmp/sales-intake-current.xml';run(['shell','rm','-f',path]);const dumped=run(['shell','uiautomator','dump',path]);assert.ok(dumped.includes('UI hierchary dumped to:'),'FRESH_UI_DUMP_REQUIRED');lastXml=run(['shell','cat',path]);return [...lastXml.matchAll(/<node\b[^>]*>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])])));}
function tapNode(n){assert.ok(n,'UI_NODE_MISSING');assert.equal(n.package,pkg,'APP_UI_TARGET_REQUIRED');assert.equal(n.enabled,'true','UI_DISABLED '+n.text);const b=n.bounds.match(/\d+/g).map(Number);run(['shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2))]);}
async function find(text){for(let i=0;i<12;i++){let found=(await nodes()).find(n=>n.package===pkg&&(n.text===text||n['content-desc']===text));if(found)return found;run(['shell','input','swipe','600',i<6?'1800':'650','600',i<6?'650':'1800','250']);}throw Error('UI_TEXT_MISSING '+text);}
async function click(text){tapNode(await find(text));await delay(250);}
async function report(old=state,action){for(let i=0;i<60;i++){try{const r=JSON.parse(run(['shell','run-as',pkg,'cat','files/phone-intake-status.json']));if(!r.ready)throw Error('WORKSPACE_NOT_READY '+r.errorCode);if((!old||r.sessionId!==old.sessionId||r.generation>old.generation)&&(!action||r.action===action)){state=r;observations.push(r);await delay(250);return r;}}catch(e){if(e.message.startsWith('WORKSPACE_NOT_READY'))throw e;}await delay(150);}throw Error('UI_REPORT_TIMEOUT '+action);}
async function act(text,action){const old=state;await click(text);return report(old,action);}
async function fill(lines){tapNode((await nodes()).find(n=>n.class==='android.widget.EditText'));run(['shell','input','keycombination','113','29']);for(let i=0;i<lines.length;i++){if(i)run(['shell','input','keyevent','66']);run(['shell','input','text',lines[i].replaceAll(' ','%s')]);}run(['shell','input','keyevent','4']);}
async function importIds(lines){const old=state;await click('导入合成联系人');await fill(lines);await click('导入');return report(old,'IMPORT');}
async function select(label){await click('选择暂存联系人');const node=(await nodes()).find(n=>n.text.startsWith(label+' ·'));tapNode(node);await delay(250);}
async function contact(label){const old=state;await click('联系人资格与拒绝');await click(label);return report(old);}
async function open(){run(['shell','am','start','-W','-n',pkg+'/.MainActivity']);await delay(450);await click('打开本机号码暂存');return report(state,'OPEN');}
async function screenshot(name){writeFileSync(join(dest,name+'.png'),adb(['exec-out','screencap','-p']));writeFileSync(join(dest,name+'.xml'),lastXml);}
async function futurePlan(){const old=state;await click('安排模拟时间');const input=(await nodes()).find(n=>n.class==='android.widget.EditText');check(/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(input.text),'explicit Beijing time visible');await click('保存计划');await report(old,'PLAN');check(state.errorCode===''&&!state.plan.paused,'future plan saved');}

let baseline,realBaseline,result;const boundaries=[];
function workspaceFiles(){const names=dbs().filter(n=>/^synthetic-workspace-v1\.db(?:-wal|-shm)?$/.test(n));return Object.fromEntries(names.map(n=>[n,run(['shell','run-as',pkg,'sha256sum','databases/'+n]).split(/\s+/)[0]]));}
const workspaceBefore=workspaceFiles();
async function mode(value){const old=state;await click('切换号码资料区');await click(value==='FORMAT_FIXTURE'?'格式测试区（生成数据，不转拨号目标）':'本机真实号码暂存（未认证）');await report(old,'OPEN');check(state.dataClass===value,'explicit dataset switch');}
async function fillField(name,lines){tapNode(await find(name));run(['shell','input','keycombination','113','29']);for(let i=0;i<lines.length;i++){if(i)run(['shell','input','keyevent','66']);run(['shell','input','text',lines[i].replaceAll(' ','%s')]);}run(['shell','input','keyevent','4']);}
async function phoneImport(lines,source='GENERATED_FORMAT_FIXTURE'){const old=state;await click('导入逐行号码');await fillField('逐行号码输入',lines);if(source)await fillField('批次来源输入',[source]);await click('保存资料');return report(old,'IMPORT');}
try{
 assert.match(run(['install','-r',apk]),/Success/);run(['shell','am','force-stop',pkg]);run(['shell','run-as',pkg,'rm','-f','files/phone-upgrade-check.json']);run(['shell','am','start','-W','-n',pkg+'/com.mantou.salesdialer.contacts.PhoneIntakeUpgradeActivity','--es','database','contact-tasks-v1.db','--ez','realCallsEnabled','true']);let upgrade;
 for(let i=0;i<80;i++){try{upgrade=JSON.parse(run(['shell','run-as',pkg,'cat','files/phone-upgrade-check.json']));break;}catch{}await delay(200);}check(upgrade?.decision==='PASSED','fixed user workspace upgrade and full legacy business integrity');for(const area of upgrade.areas)check(area.legacyBusinessUnchanged&&area.legacyDigestBefore===area.legacyDigestAfter&&area.toVersion===5&&area.attemptCount===0,'old business unchanged and no attempt created');writeFileSync(join(dest,'upgrade-check.json'),JSON.stringify(upgrade,null,2)+'\n');
 check(!/showing=true/.test(run(['shell','dumpsys','window','policy'])),'DEVICE_UNLOCK_REQUIRED');run(['shell','am','force-stop',pkg]);await open();realBaseline=state;const real=upgrade.areas.find(a=>a.dataClass==='LOCAL_PHONE_INTAKE'),format=upgrade.areas.find(a=>a.dataClass==='FORMAT_FIXTURE');check(real.planPaused&&format.planPaused,'original local plans must already be paused for read-only UI regression');check(JSON.stringify(state.contacts)===JSON.stringify(real.contacts)&&JSON.stringify(state.drafts)===JSON.stringify(real.drafts)&&state.plan.version===real.planVersion&&state.attemptCount===0,'actual local UI matches preserved data');await mode('FORMAT_FIXTURE');check(JSON.stringify(state.contacts)===JSON.stringify(format.contacts)&&JSON.stringify(state.drafts)===JSON.stringify(format.drafts)&&state.plan.version===format.planVersion&&state.plan.paused&&state.attemptCount===0,'format UI keeps prior contacts drafts and paused plan');check(state.realCallsEnabled===false&&state.actualPhoneCalls===0&&state.executionRequestsCreated===0,'no execution or phone capability');await nodes();await screenshot('upgraded-format');check(JSON.stringify(workspaceFiles())===JSON.stringify(workspaceBefore),'old synthetic workspace bytes unchanged');result={decision:'PASSED',tests:'T705',checks,upgrade,realBaseline,final:state,apkSha256,actualPhoneCalls:0};
}catch(error){result={decision:'FAILED',error:String(error.stack),checks,realBaseline,final:state,apkSha256,actualPhoneCalls:0};try{await nodes();await screenshot('failure');}catch{}throw error;
}finally{run(['shell','am','force-stop',pkg]);assert.deepEqual(demo(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);assert.equal(dbs().includes('contact-tasks-v1.db'),productionBefore);if(result)writeFileSync(join(dest,'upgrade-ui-cases.json'),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({decision:result.decision,checks,actualPhoneCalls:0,apkSha256}));
