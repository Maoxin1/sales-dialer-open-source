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
 check(!/showing=true/.test(run(['shell','dumpsys','window','policy'])),'DEVICE_UNLOCK_REQUIRED');assert.match(run(['install','-r',apk]),/Success/);run(['shell','am','force-stop',pkg]);await open();realBaseline=state;check(state.dataClass==='LOCAL_PHONE_INTAKE'&&!state.realCallsEnabled&&!state.productionAuthenticated,'real staging is not authenticated');await mode('FORMAT_FIXTURE');baseline=state;
 let number;for(let i=9600;i<9700;i++)if(!state.contacts.some(c=>c.maskedNumber==='199****'+i)){number='1990000'+i;break;}check(!!number,'unused generated format required');
 await phoneImport([number]);check(state.errorCode===''&&state.draftCount===baseline.draftCount,'import never creates drafts');const label='199****'+number.slice(-4);await select(label);const target=state.contacts.find(c=>c.maskedNumber===label).id;
 await act('显式生成本地草稿','DRAFT_CREATE');check(state.errorCode==='CONTACT_NOT_QUALIFIED'&&state.draftCount===baseline.draftCount,'unknown cannot create draft');await contact('记录已有联系资格');await act('显式生成本地草稿','DRAFT_CREATE');let draft=state.drafts.find(d=>d.targetId===target);check(state.errorCode===''&&draft.contactRevision===2&&draft.dataClass==='FORMAT_FIXTURE'&&state.draftCount===baseline.draftCount+1,'explicit typed draft saved');const id=draft.id,digest=state.dataDigest;
 await act('显式生成本地草稿','DRAFT_CREATE');check(state.errorCode===''&&state.dataDigest===digest,'duplicate draft is fully idempotent');await contact('记录已有联系资格');check(state.drafts.find(d=>d.id===id).status==='STALE_CONTACT','qualification revision invalidates old snapshot');await phoneImport([number]);check(state.drafts.find(d=>d.id===id).contactRevision===2,'reimport does not refresh draft');await select(label);
 await act('显式生成本地草稿','DRAFT_CREATE');check(state.errorCode==='STALE_DRAFT','create cannot silently refresh');await act('显式刷新本地草稿','DRAFT_REFRESH');check(state.errorCode===''&&state.drafts.find(d=>d.id===id).contactRevision===3,'explicit refresh preserves identity');const refreshed=state.dataDigest;await act('显式刷新本地草稿','DRAFT_REFRESH');check(state.dataDigest===refreshed,'repeated refresh does not write audit');await contact('记录资格已撤回');await act('显式刷新本地草稿','DRAFT_REFRESH');check(state.errorCode==='CONTACT_NOT_QUALIFIED','withdrawal stops refresh');await contact('拒绝联系');await act('显式刷新本地草稿','DRAFT_REFRESH');check(state.errorCode==='DO_NOT_CONTACT','refusal stops refresh');await act('检查拨号边界','BOUNDARY');check(state.boundary==='FORMAT_FIXTURE_ONLY'&&state.executionRequestsCreated===0&&state.actualPhoneCalls===0&&!state.realCallsEnabled,'draft never grants request');const saved=state.drafts;
 await nodes();await screenshot('draft-refused');run(['shell','am','force-stop',pkg]);await open();check(state.dataClass==='LOCAL_PHONE_INTAKE'&&state.dataDigest===realBaseline.dataDigest,'real business fields remain unchanged');await mode('FORMAT_FIXTURE');check(JSON.stringify(state.drafts)===JSON.stringify(saved),'draft identity snapshot and stale state survive process restart');check(JSON.stringify(workspaceFiles())===JSON.stringify(workspaceBefore),'old synthetic workspace bytes unchanged');
 result={decision:'PASSED',tests:'T682',checks,realBaseline,baseline,final:state,generatedFormatOnly:true,actualPhoneCalls:0,apkSha256};
}catch(error){result={decision:'FAILED',error:String(error.stack),checks,realBaseline,baseline,final:state,generatedFormatOnly:true,actualPhoneCalls:0,apkSha256};try{await nodes();await screenshot('failure');}catch{}throw error;
}finally{run(['shell','am','force-stop',pkg]);assert.deepEqual(demo(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);assert.equal(dbs().includes('contact-tasks-v1.db'),productionBefore);if(result){result.demoUnchanged=true;result.oldPhoneApkUnchanged=true;writeFileSync(join(dest,'local-draft-ui-cases.json'),JSON.stringify(result,null,2)+'\n');}}
console.log(JSON.stringify({decision:result.decision,checks,actualPhoneCalls:0,apkSha256}));
