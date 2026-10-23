import { mkdirSync,writeFileSync,existsSync } from 'node:fs';
import { resolve,dirname,relative,isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { SQLiteStore } from './sqlite-store.mjs';
import { SimulationEngine } from './simulation-engine.mjs';
import { AndroidSandboxAdapter } from './android-sandbox-adapter.mjs';
import { AdbSyntheticTransport } from './adb-synthetic-transport.mjs';
import { SELF_SERVICE_CAPABILITIES } from './simulation-session.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
let serial,evidence;
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){
 if(args[i]==='--serial'&&args[i+1])serial=args[++i];
 else if(args[i]==='--evidence'&&args[i+1])evidence=args[++i];
 else throw Error('Usage: android:demo -- --serial DEVICE [--evidence project/evidence/subdir]');
}
if(!serial)throw Error('EXPLICIT_ADB_DEVICE_REQUIRED');
const run=Date.now().toString(36).toUpperCase()+'-'+randomBytes(3).toString('hex').toUpperCase();
const dest=resolve(root,evidence??'evidence/android-handoff-device/'+run),rel=relative(resolve(root,'evidence'),dest);
if(!rel||rel.startsWith('..')||isAbsolute(rel)||existsSync(dest))throw Error('NEW_PROJECT_EVIDENCE_DIRECTORY_REQUIRED');
mkdirSync(dest,{recursive:true});mkdirSync(resolve(root,'.local/android-demo'),{recursive:true});
const store=new SQLiteStore(resolve(root,'.local/android-demo',run+'.db')),clock={nowMs:()=>Date.now()};
const engine=new SimulationEngine({store,clock}),tenantId='SYNTHETIC-TENANT-'+run,salesId='SYNTHETIC-SALES-'+run;
const commands=[],checks=[];
const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial,record:r=>commands.push(r)});
const adapter=new AndroidSandboxAdapter({deviceId:'SYNTHETIC-USB-DEVICE',simId:'SYNTHETIC-NO-SIM',transport});
const report={startedAt:new Date().toISOString(),node:process.version,mode:'simulation',actualPhoneApiCalls:0,
 scope:'Two synthetic tasks via USB; no real phone adapter, account binding, or production authentication',checks,commands};
function check(name,condition){checks.push({name,passed:Boolean(condition)});assert.ok(condition,name);}
try{
 engine.configureFixture({actors:[{actorId:salesId,tenantId,permissions:SELF_SERVICE_CAPABILITIES}],policy:{simulationOnly:true,version:1,calendar:'weekdays',lateToleranceMs:60000,pauseScope:'seller',order:'explicit-selection'}});
 engine.observeDevice({actorId:salesId,state:'IDLE'});
 for(let n=1;n<=2;n++){
  const targetKey='SYNTHETIC-TARGET-'+n,taskId='SYNTHETIC-TASK-'+n;
  check('own contact '+n,engine.importContacts({actorId:salesId,rows:[{raw:targetKey,qualification:'CONFIRMED',source:'SYNTHETIC-DEMO'}]}).decision==='OK');
  check('own task '+n,engine.createTask({actorId:salesId,taskId,targetKey,assignedSalesId:salesId,plannedAt:clock.nowMs()}).decision==='OK');
  const grant=engine.authorize({actorId:salesId,taskId,intentId:'SYNTHETIC-INTENT-'+n,planVersion:1,policyVersion:1,trigger:'manual_now'});
  check('authorized '+n,grant.decision==='ALLOW');
  const result=await engine.consumeAndroid({actorId:salesId,attemptId:grant.attemptId},adapter);check('Android synthetic receipt '+n,result.apiSubmission==='SUBMITTED');
  const c=store.read().attempts[grant.attemptId].androidCommand;
  const before=commands.length;check('core duplicate blocked '+n,(await engine.consumeAndroid({actorId:salesId,attemptId:grant.attemptId},adapter)).reason==='ALREADY_CONSUMED');check('duplicate does not use transport '+n,commands.length===before);
  // Device replay test: same immutable command, never a new authorization or a real dial request.
  if(n===1){await transport.run(['shell','am','force-stop','com.mantou.salesdialer.spike']);const duplicate=await transport.send(c);check('device restart retains deduplication',duplicate.duplicate===true&&duplicate.executionCountForGrant===1&&duplicate.actualPhoneApiCalls===0);}
  check('explicit synthetic reconciliation '+n,engine.reconcile({actorId:salesId,attemptId:grant.attemptId,noActiveCall:true,result:'UNKNOWN'}).decision==='OK');
 }
 report.snapshot=engine.snapshot({actorId:salesId});report.metrics=engine.metrics({actorId:salesId});
 check('no outgoing/connected observations',report.snapshot.attempts.every(a=>a.observations.length===0));
 check('both tasks finished only after explicit reconciliation',report.snapshot.tasks.every(t=>t.status==='FINISHED'));
 report.passed=true;
}catch(e){report.passed=false;report.error=e.message;process.exitCode=1;}
finally{report.endedAt=new Date().toISOString();store.close();writeFileSync(resolve(dest,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({evidence:dest,passed:report.passed,checks,actualPhoneApiCalls:0,error:report.error}));}
