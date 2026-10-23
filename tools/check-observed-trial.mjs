import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { resolve,relative,isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { AdbSyntheticTransport } from '../packages/core/src/adb-synthetic-transport.mjs';
import { PhoneCapabilities } from '../packages/core/src/phone-capabilities.mjs';
import { ObservedTrial } from '../packages/core/src/observed-trial.mjs';
import { SQLiteStore } from '../packages/core/src/sqlite-store.mjs';
const [serial,label,directory]=process.argv.slice(2),root=resolve(import.meta.dirname,'..'),dest=resolve(root,directory??''),rel=relative(resolve(root,'evidence'),dest);
if(!serial||!label||!rel||rel.startsWith('..')||isAbsolute(rel)||existsSync(dest))throw Error('Usage: check-observed-trial.mjs SERIAL EXACT_LABEL evidence/new-directory');
mkdirSync(dest,{recursive:true});const commands=[],checks=[];
const hash=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial,record:r=>commands.push(r)});
const makePhone=()=>new PhoneCapabilities({read:()=>transport.readPhoneCapabilities(hash)});
const phone=makePhone();let store=new SQLiteStore(resolve(dest,'observed.db'));
const report={startedAt:new Date().toISOString(),command:process.argv,node:process.version,apkSha256:hash,scope:'Real read-only device observations; internal fake submission only',commands,checks,realCallsIssued:0};
try{
 const first=await phone.refresh();report.initial=first;
 const matches=first.snapshot.accounts.filter(a=>a.label===label);assert.equal(matches.length,1,'exact explicitly selected account label');checks.push('unique-account');
 const trial=new ObservedTrial({store,phone});assert.equal((await trial.submit()).decision,'DENY');checks.push('unbound-blocked');
 const bound=await trial.bind(matches[0].key);report.bound=bound;assert.equal(bound.decision,'OK');checks.push('observed-binding');
 const result=await trial.submit();assert.equal(result.status,'RECONCILE_REQUIRED');report.submission=result;checks.push('observed-preflight-fake-unknown');
 assert.equal(trial.status().requests.length,1);assert.equal(trial.status().realCallsEnabled,false);checks.push('one-fake-zero-real');
 assert.equal((await trial.submit()).decision,'DENY');assert.equal(trial.status().requests.length,1);checks.push('duplicate-blocked');
 report.beforeRestart=trial.status();store.close();store=new SQLiteStore(resolve(dest,'observed.db'));
 const restored=new ObservedTrial({store,phone:makePhone()});assert.equal((await restored.submit()).decision,'DENY');assert.equal(restored.status().used,1);checks.push('reopen-no-auto-selection-or-replay');
 assert.equal((await restored.bind(matches[0].key)).decision,'OK');assert.equal((await restored.submit()).decision,'DENY');assert.equal(restored.status().requests.length,0);checks.push('explicit-rebind-no-new-attempt');
 assert.equal((await restored.reconcile(false)).decision,'DENY');assert.equal((await restored.reconcile(true)).decision,'OK');assert.equal(restored.status().used,1);checks.push('reconcile-no-refund');
 report.final=restored.status();
 assert.ok(commands.filter(c=>c.args.includes('start')).every(c=>c.args.includes('com.mantou.salesdialer.spike/.PhoneCapabilitiesActivity')));checks.push('only-read-only-activity-launched');
 report.passed=true;report.exitCode=0;
}catch(e){report.passed=false;report.error=e.message;report.exitCode=1;process.exitCode=1;}
finally{store.close();report.finishedAt=new Date().toISOString();writeFileSync(resolve(dest,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,error:report.error,checks:checks.length,realCallsIssued:0,evidence:dest}));}
