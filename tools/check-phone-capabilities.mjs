import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { resolve,relative,isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { AdbSyntheticTransport } from '../packages/core/src/adb-synthetic-transport.mjs';
import { PhoneCapabilities } from '../packages/core/src/phone-capabilities.mjs';
const [serial,label,directory]=process.argv.slice(2),root=resolve(import.meta.dirname,'..'),dest=resolve(root,directory??''),rel=relative(resolve(root,'evidence'),dest);
if(!serial||!label||!rel||rel.startsWith('..')||isAbsolute(rel)||existsSync(dest))throw Error('Usage: check-phone-capabilities.mjs SERIAL EXACT_LABEL evidence/new-directory');
mkdirSync(dest,{recursive:true});const commands=[];
const hash=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
const transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial,record:r=>commands.push(r)});
const model=new PhoneCapabilities({read:()=>transport.readPhoneCapabilities(hash)}),report={startedAt:new Date().toISOString(),node:process.version,apkSha256:hash,commands,realCallsIssued:0};
try{
 report.beforeSelection=await model.refresh();const matches=report.beforeSelection.snapshot.accounts.filter(a=>a.label===label);assert.equal(matches.length,1,'one explicitly authorized account label');
 report.selection=model.select(matches[0].key);assert.equal(report.selection.decision,'OK');
 report.refreshed=await model.refresh();assert.equal(report.refreshed.selectedAccount.key,matches[0].key);assert.equal(report.refreshed.callAuthorization,'DENY');assert.equal(report.refreshed.realCallsEnabled,false);
 report.passed=true;
}catch(e){report.passed=false;report.error=e.message;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(resolve(dest,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,error:report.error,account:report.selection?.selectedAccount?.label,realCallsIssued:0,evidence:dest}));}
