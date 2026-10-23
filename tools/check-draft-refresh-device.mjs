import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
if(process.argv.slice(2).join()!=='--run')throw Error('EXPLICIT_RUN_REQUIRED');
const pkg='com.mantou.salesdialer.standalone',component=pkg+'/com.mantou.salesdialer.contacts.ContactStoreCheckActivity';
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
 run(['shell','am','force-stop',pkg]);run(['shell','run-as',pkg,'rm','-f','files/contact-store-check.json']);
 run(['shell','am','start','-W','-n',component,'--es','phase',value,'--es','database','contact-tasks-v1.db','--es','tenantId','ATTACKER','--ez','realCallsEnabled','true']);
 for(let i=0;i<80;i++){
  let r;try{r=JSON.parse(run(['shell','run-as',pkg,'cat','files/contact-store-check.json']));}catch{}
  if(r){if(r.decision==='FAILED')throw Error('DRAFT_FIXTURE_FAILED '+JSON.stringify(r));if(r.phase===value&&['PASSED','WAITING_FOR_KILL'].includes(r.decision))return r;}
  await delay(250);
 }
 throw Error('DRAFT_FIXTURE_TIMEOUT '+value);
}
let reports;
try{
 const all=await phase('draft-all');assert.equal(all.draftRollbackPoints,3);assert.equal(all.migrationRollbackPoints,2);assert.equal(all.draftConcurrentChecks,2);assert.equal(all.draftEvents,3);assert.equal(all.contactRevision,6);assert.equal(all.draftRevision,5);
 const reopened=await phase('draft-verify');assert.equal(reopened.draftCommittedProcessRestart,true);
 const interrupted=await phase('draft-interrupt');assert.equal(interrupted.decision,'WAITING_FOR_KILL');assert.equal(interrupted.afterDraftUpdate,true);
 run(['shell','am','force-stop',pkg]);const recovered=await phase('draft-recover');assert.equal(recovered.draftUncommittedKillRecovered,true);
 reports={all,reopened,interrupted,recovered};
}finally{run(['shell','am','force-stop',pkg]);}
assert.deepEqual(bytes(),before);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);
assert.equal(run(['shell','run-as',pkg,'ls','databases']).split(/\s+/).includes('contact-tasks-v1.db'),productionBefore);
const result={decision:'PASSED',tests:'T594-T600',deviceAssertions:reports.all.assertions+reports.reopened.assertions+reports.recovered.assertions,draftRollbackPoints:3,migrationRollbackPoints:2,draftConcurrentChecks:2,committedProcessRestart:true,uncommittedKillRecovered:true,taskBytesUnchanged:true,productionDatabaseUnchanged:true,finalPaused:true,actualPhoneCalls:0,productionAuthenticated:false,realCallsEnabled:false,apkSha256};
if(process.env.DIALER_EVIDENCE_DIR)writeFileSync(join(process.env.DIALER_EVIDENCE_DIR,'draft-cases.json'),JSON.stringify({...result,reports,taskBytesSha256:createHash('sha256').update(before).digest('hex')},null,2)+'\n');
console.log(JSON.stringify(result));
