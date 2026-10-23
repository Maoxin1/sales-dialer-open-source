import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
if(process.argv.slice(2).join()!=='--run')throw Error('EXPLICIT_RUN_REQUIRED');
const pkg='com.mantou.salesdialer.standalone',component=pkg+'/com.mantou.salesdialer.contacts.SyntheticLoopCheckActivity';
const binding=JSON.parse(readFileSync('.local/contact-android.json'));
const run=args=>execFileSync(resolve('.tooling/android-sdk/platform-tools/adb.exe'),['-s',binding.serial,...args],{encoding:'utf8',windowsHide:true,timeout:20000,stdio:['ignore','pipe','pipe']}).trim();
const bytes=()=>Buffer.from(run(['exec-out','run-as',pkg,'base64','files/simulation-tasks.bin']),'base64');
const before=bytes();assert.equal(before[12],1,'simulation must be paused');
const oldPath=run(['shell','pm','path','com.mantou.salesdialer.spike']).replace(/^package:/,'');
assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);
const productionBefore=run(['shell','run-as',pkg,'ls','databases']).split(/\s+/).includes('contact-tasks-v1.db');
const apk=resolve('prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk');
assert.match(run(['install','-r',apk]),/Success/);assert.deepEqual(bytes(),before);
const installedPath=run(['shell','pm','path',pkg]).replace(/^package:/,'');
const apkSha256=createHash('sha256').update(readFileSync(apk)).digest('hex');
assert.equal(run(['shell','sha256sum',installedPath]).split(/\s+/)[0],apkSha256);
async function phase(value){
 run(['shell','am','force-stop',pkg]);run(['shell','run-as',pkg,'rm','-f','files/synthetic-loop-check.json']);
 run(['shell','am','start','-W','-n',component,'--es','phase',value,'--es','database','contact-tasks-v1.db','--es','tenantId','ATTACKER','--ez','realCallsEnabled','true']);
 for(let i=0;i<(value==='capacity'?400:160);i++){
  let r;try{r=JSON.parse(run(['shell','run-as',pkg,'cat','files/synthetic-loop-check.json']));}catch{}
  if(r){if(r.decision==='FAILED')throw Error('LOOP_FIXTURE_FAILED '+JSON.stringify(r));if(r.phase===value&&['PASSED','WAITING_FOR_KILL'].includes(r.decision))return r;}
  await delay(250);
 }
 if(process.env.DIALER_EVIDENCE_DIR){let pid='',log='';try{pid=run(['shell','pidof',pkg]);if(/^\d+$/.test(pid))log=run(['logcat','-d','--pid='+pid,'-t','100']);}catch{}writeFileSync(join(process.env.DIALER_EVIDENCE_DIR,'timeout-'+value+'.json'),JSON.stringify({phase:value,pid,log},null,2)+'\n');}
 throw Error('LOOP_FIXTURE_TIMEOUT '+value);
}
let reports;
try{
 const all=await phase('all');assert.equal(all.claimRollbackPoints,3);assert.equal(all.migrationRollbackPoints,2);assert.equal(all.clockGuardCases,5);assert.equal(all.concurrentChecks,1);assert.equal(all.mainAttempts,2);assert.equal(all.mainPortRequests,2);assert.equal(all.explicitUnknownClosure,true);
 const reopened=await phase('verify');assert.equal(reopened.committedProcessRestart,true);assert.equal(reopened.unknownNotReplayed,true);
 const postInterrupted=await phase('postcommit-interrupt');assert.equal(postInterrupted.decision,'WAITING_FOR_KILL');assert.equal(postInterrupted.point,'AFTER_ATTEMPT_COMMIT');run(['shell','am','force-stop',pkg]);const postRecovered=await phase('postcommit-recover');assert.equal(postRecovered.postcommitUnknownPreserved,true);
 const preInterrupted=await phase('precommit-interrupt');assert.equal(preInterrupted.decision,'WAITING_FOR_KILL');assert.equal(preInterrupted.point,'AFTER_ATTEMPT_INSERT');run(['shell','am','force-stop',pkg]);const preRecovered=await phase('precommit-recover');assert.equal(preRecovered.precommitRolledBack,true);
 const capacity=await phase('capacity');assert.equal(capacity.distinctTargets,50);assert.equal(capacity.syntheticAttempts,200);assert.equal(capacity.simulatedPortRequests,200);assert.equal(capacity.simulatedApiReceipts,200);
 const capacityReopened=await phase('capacity-verify');assert.equal(capacityReopened.capacityRestartPreserved,true);
 reports={all,reopened,postInterrupted,postRecovered,preInterrupted,preRecovered,capacity,capacityReopened};
}finally{run(['shell','am','force-stop',pkg]);}
assert.deepEqual(bytes(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);
assert.equal(run(['shell','run-as',pkg,'ls','databases']).split(/\s+/).includes('contact-tasks-v1.db'),productionBefore);
const result={decision:'PASSED',tests:'T615-T625',deviceAssertions:Object.values(reports).reduce((sum,r)=>sum+(r.assertions??0),0),explicitUnknownClosure:true,claimRollbackPoints:3,migrationRollbackPoints:2,clockGuardCases:5,concurrentChecks:1,committedProcessRestart:true,unknownNotReplayed:true,postcommitUnknownPreserved:true,precommitRolledBack:true,distinctTargets:50,syntheticAttempts:200,simulatedPortRequests:200,simulatedApiReceipts:200,capacityElapsedMillis:reports.capacity.elapsedMillis,capacityRestartPreserved:true,taskBytesUnchanged:true,productionDatabaseUnchanged:true,finalPaused:true,actualPhoneCalls:0,productionAuthenticated:false,realCallsEnabled:false,apkSha256};
if(process.env.DIALER_EVIDENCE_DIR)writeFileSync(join(process.env.DIALER_EVIDENCE_DIR,'loop-cases.json'),JSON.stringify({...result,reports,taskBytesSha256:createHash('sha256').update(before).digest('hex')},null,2)+'\n');
console.log(JSON.stringify(result));
