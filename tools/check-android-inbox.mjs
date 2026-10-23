import { resolve,dirname,relative,isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync,writeFileSync,existsSync } from 'node:fs';
import { AdbSyntheticTransport } from '../packages/core/src/adb-synthetic-transport.mjs';
import { commandDigest } from '../packages/core/src/android-sandbox-adapter.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),[serial,dir]=process.argv.slice(2);
if(!serial||!dir)throw Error('Usage: node tools/check-android-inbox.mjs SERIAL evidence/new-directory');
const dest=resolve(root,dir),rel=relative(resolve(root,'evidence'),dest);
if(!rel||rel.startsWith('..')||isAbsolute(rel)||existsSync(dest))throw Error('NEW_PROJECT_EVIDENCE_DIRECTORY_REQUIRED');mkdirSync(dest,{recursive:true});
const commands=[],checks=[],transport=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial,record:r=>commands.push(r)});
const now=Date.now(),base={schemaVersion:1,mode:'simulation',tenantId:'SYNTHETIC-GUARD-'+now,salesId:'SYNTHETIC-SALES',taskId:'SYNTHETIC-TASK',attemptId:'SYNTHETIC-ATTEMPT',intentId:'SYNTHETIC-INTENT',targetKey:'SYNTHETIC-TARGET',deviceId:'SYNTHETIC-DEVICE',simId:'SYNTHETIC-NO-SIM',cycle:1,planVersion:1,policyVersion:1,qualificationRevision:1,issuedAt:now,expiresAt:now+60000};
async function raw(c,proof=null){
 await transport.run(['shell','am','start','-W','-n','com.mantou.salesdialer.spike/.SyntheticBridgeActivity','--es','command',Buffer.from(JSON.stringify(c)).toString('base64url'),...(proof?['--es','leaseToken',proof.nonce,'--es','validUntilElapsed',String(proof.validUntilElapsed)]:[])]);
 return JSON.parse(await transport.run(['shell','run-as','com.mantou.salesdialer.spike','cat','files/bridge-'+commandDigest(c)+'.json']));
}
const report={mode:'simulation',actualPhoneApiCalls:0,startedAt:new Date().toISOString(),commands,checks};
try{
 for(const [name,c] of [['real mode',{...base,mode:'real'}],['unknown field',{...base,unexpected:true}],['expired',{...base,issuedAt:now-10000,expiresAt:now-1}],['invalid target',{...base,targetKey:'INVALID'}],['fractional version',{...base,planVersion:1.5}]]){
  const r=await raw(c);const passed=r.status==='REJECTED'&&r.actualPhoneApiCalls===0;checks.push({name,passed,receipt:r});if(!passed)throw Error(name);
 }
 const proof=await transport.prepareLease(base);const accepted=await raw(base,proof);checks.push({name:'valid command accepted',passed:accepted.status==='SIMULATED_ACCEPTED'});
 const changedCommand={...base,targetKey:'SYNTHETIC-DIFFERENT'};const changed=await raw(changedCommand,await transport.prepareLease(changedCommand));checks.push({name:'same grant cannot change target',passed:changed.status==='REJECTED'&&changed.reason==='GRANT_CONFLICT'});
 const repeated=await raw(base,proof);checks.push({name:'original immutable command stays idempotent',passed:repeated.duplicate===true&&repeated.executionCountForGrant===1});
 report.passed=checks.every(c=>c.passed);if(!report.passed)process.exitCode=1;
}catch(e){report.passed=false;report.error=e.message;process.exitCode=1;}
finally{report.endedAt=new Date().toISOString();writeFileSync(resolve(dest,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks,error:report.error}));}
