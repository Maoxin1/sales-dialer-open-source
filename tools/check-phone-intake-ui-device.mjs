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
 check(!/showing=true/.test(run(['shell','dumpsys','window','policy'])),'DEVICE_UNLOCK_REQUIRED');assert.match(run(['install','-r',apk]),/Success/);run(['shell','am','force-stop',pkg]);await open();realBaseline=state;check(state.dataClass==='LOCAL_PHONE_INTAKE'&&state.boundary==='PRODUCTION_IDENTITY_UNVERIFIED'&&!state.realCallsEnabled&&!state.productionAuthenticated,'local staging has no production identity');await nodes();await screenshot('real-staging');await mode('FORMAT_FIXTURE');const realDigest=realBaseline.dataDigest;check(/^[a-f0-9]{64}$/.test(realDigest),'private business digest available');baseline=state;
 const numbers=[];for(let i=9700;i<=9999&&numbers.length<3;i++){const n='1990000'+i;if(!state.contacts.some(c=>c.maskedNumber==='199****'+i))numbers.push(n);}check(numbers.length===3,'unused generated-format inputs required');
 await phoneImport([numbers[0],' '+numbers[0]+' ','+86'+numbers[0],'SIM-001',numbers[1]]);check(state.errorCode===''&&state.total===baseline.total+2,'only valid rows create contacts');check((await nodes()).some(n=>n.text.includes('导入2，重复1，暂不支持1，无效1')),'per-row summary visible');check(numbers.every(n=>!JSON.stringify(state).includes(n))&&numbers.every(n=>!lastXml.includes(n)),'only masked values in status and main UI');
 await phoneImport([numbers[2]],'');check(state.errorCode==='INVALID_BATCH'&&state.total===baseline.total+2,'missing source rejects entire batch');
 const label='199****'+numbers[0].slice(-4);await select(label);await contact('记录已有联系资格');let chosen=state.contacts.find(c=>c.maskedNumber===label);check(chosen.qualification==='CONFIRMED'&&chosen.revision===2,'explicit declaration persisted');await act('检查拨号边界','BOUNDARY');check(state.boundary==='FORMAT_FIXTURE_ONLY'&&state.draftCount===baseline.draftCount&&state.executionRequestsCreated===0&&state.actualPhoneCalls===0&&!state.realCallsEnabled,'confirmed format still cannot authorize any call');boundaries.push(state.boundary);
 await contact('拒绝联系');chosen=state.contacts.find(c=>c.maskedNumber===label);check(chosen.refused&&chosen.revision===3,'explicit refusal persisted');await contact('记录已有联系资格');check(state.errorCode==='DO_NOT_CONTACT'&&state.contacts.find(c=>c.id===chosen.id).revision===3,'qualification cannot clear refusal');await phoneImport(numbers.slice(0,2));check(state.total===baseline.total+2&&state.contacts.find(c=>c.id===chosen.id).refused&&state.contacts.find(c=>c.id===chosen.id).revision===3,'reimport preserves stable mapping and refusal');const saved=state.contacts;
 run(['shell','am','force-stop',pkg]);await open();check(state.dataClass==='LOCAL_PHONE_INTAKE'&&JSON.stringify(state.contacts)===JSON.stringify(realBaseline.contacts),'restart never promotes generated rows into real staging');check(state.dataDigest===realDigest,'all real staging business fields and slot unchanged');await mode('FORMAT_FIXTURE');check(JSON.stringify(state.contacts)===JSON.stringify(saved),'generated rows and revisions survive actual process restart');await nodes();await screenshot('format-final');check(JSON.stringify(workspaceFiles())===JSON.stringify(workspaceBefore),'preexisting synthetic task workspace bytes unchanged');
 result={decision:'PASSED',tests:'T667-T669',checks,realBaseline,baseline,final:state,boundaries,generatedFormatOnly:true,userCustomerDataUsed:false,actualPhoneCalls:0,realCallsEnabled:false,apkSha256,originalSyntheticWorkspaceUnchanged:true,realStagingUnchanged:true};
}catch(error){result={decision:'FAILED',error:String(error.stack),checks,realBaseline,baseline,final:state,generatedFormatOnly:true,actualPhoneCalls:0,apkSha256};try{await nodes();await screenshot('failure');}catch{}throw error;
}finally{run(['shell','am','force-stop',pkg]);assert.deepEqual(demo(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);assert.equal(dbs().includes('contact-tasks-v1.db'),productionBefore);if(result){result.demoUnchanged=true;result.oldPhoneApkUnchanged=true;result.productionCatalogUnchanged=true;writeFileSync(join(dest,'phone-ui-cases.json'),JSON.stringify(result,null,2)+'\n');}}
console.log(JSON.stringify({decision:result.decision,checks,realStagingContacts:realBaseline.total,formatContacts:state.total,actualPhoneCalls:0,apkSha256}));
