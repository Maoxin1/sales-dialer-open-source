import {readFileSync,writeFileSync} from 'node:fs';import {resolve,join} from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {setTimeout as delay} from 'node:timers/promises';
if(process.argv.slice(2).join()!=='--run')throw Error('EXPLICIT_RUN_REQUIRED');
const pkg='com.mantou.salesdialer.standalone',binding=JSON.parse(readFileSync('.local/contact-android.json'));
const run=args=>execFileSync(resolve('.tooling/android-sdk/platform-tools/adb.exe'),['-s',binding.serial,...args],{encoding:'utf8',windowsHide:true,timeout:20000}).trim();
const bytes=()=>Buffer.from(run(['exec-out','run-as',pkg,'base64','files/simulation-tasks.bin']),'base64'),before=bytes();assert.equal(before[12],1);
const workspace=()=>run(['shell','run-as',pkg,'sha256sum','databases/synthetic-workspace-v1.db']);const workspaceBefore=workspace();
const oldPath=run(['shell','pm','path','com.mantou.salesdialer.spike']).replace(/^package:/,'');assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);
const apk=resolve('prototypes/android/standalone/build/outputs/apk/debug/standalone-debug.apk'),apkSha256=createHash('sha256').update(readFileSync(apk)).digest('hex');let report;
try{assert.match(run(['install','-r',apk]),/Success/);run(['shell','am','force-stop',pkg]);run(['shell','run-as',pkg,'rm','-f','files/workspace-timer-check.json']);run(['shell','am','start','-W','-n',pkg+'/com.mantou.salesdialer.contacts.WorkspaceTimerCheckActivity','--es','database','contact-tasks-v1.db','--es','tenantId','ATTACKER','--ez','realCallsEnabled','true']);
 for(let i=0;i<100;i++){try{report=JSON.parse(run(['shell','run-as',pkg,'cat','files/workspace-timer-check.json']));break;}catch{}await delay(200);}
 assert.equal(report?.decision,'PASSED',JSON.stringify(report));assert.equal(report.userWorkspaceOpened,false);
}finally{run(['shell','am','force-stop',pkg]);assert.deepEqual(bytes(),before);assert.equal(workspace(),workspaceBefore);assert.equal(run(['shell','sha256sum',oldPath]).split(/\s+/)[0],binding.apkSha256);if(process.env.DIALER_EVIDENCE_DIR)writeFileSync(join(process.env.DIALER_EVIDENCE_DIR,'workspace-fixture.json'),JSON.stringify({report,apkSha256,demoUnchanged:true,workspaceUnchanged:true,oldApkUnchanged:true,actualPhoneCalls:0},null,2)+'\n');}
console.log(JSON.stringify(report));
