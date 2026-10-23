import { resolve,relative,isAbsolute } from 'node:path';
import { mkdirSync,existsSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { AdbSyntheticTransport } from '../packages/core/src/adb-synthetic-transport.mjs';
import { commandDigest } from '../packages/core/src/android-sandbox-adapter.mjs';
const root=resolve(import.meta.dirname,'..'),[serial,directory]=process.argv.slice(2),dest=resolve(root,directory??''),rel=relative(resolve(root,'evidence'),dest);
if(!serial||!rel||rel.startsWith('..')||isAbsolute(rel)||existsSync(dest))throw Error('Usage: check-time-lease-device.mjs SERIAL evidence/new-directory');
mkdirSync(dest,{recursive:true});const commands=[],checks=[],report={startedAt:new Date().toISOString(),node:process.version,commands,checks,realCallsIssued:0};
function check(name,value){checks.push({name,passed:Boolean(value)});assert.ok(value,name);}
const pkg='com.mantou.salesdialer.spike';
try{
 for(const offset of [-86400000,86400000]){
  const now=()=>Date.now()+offset,t=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial,now,record:r=>commands.push(r)}),at=now(),tag=Date.now();
  const c={schemaVersion:1,mode:'simulation',tenantId:'SYNTHETIC-CLOCK-'+tag,salesId:'SYNTHETIC-SALES',taskId:'SYNTHETIC-TASK',attemptId:'SYNTHETIC-ATTEMPT',intentId:'SYNTHETIC-INTENT',targetKey:'SYNTHETIC-TARGET',deviceId:'SYNTHETIC-DEVICE',simId:'SYNTHETIC-NO-SIM',cycle:1,planVersion:1,policyVersion:1,qualificationRevision:1,issuedAt:at,expiresAt:at+60000};
  const r=await t.send(c);check('T148 host clock offset '+offset+' accepted',r.status==='SIMULATED_ACCEPTED'&&r.actualPhoneApiCalls===0);
  const hash=commandDigest(c),read=async()=>JSON.parse(await t.run(['shell','run-as',pkg,'cat','files/lease-'+hash+'.json'])),before=await read();
  await t.run(['shell','am','force-stop',pkg]);const duplicate=await t.send(c),after=await read();
  check('T149 process restart preserves once-only ledger '+offset,duplicate.duplicate===true&&duplicate.executionCountForGrant===1);
  check('T149 lease cannot renew on restart '+offset,before.nonce===after.nonce&&before.expiresElapsed===after.expiresElapsed);
  const raw=async(token,deadline)=>{
   await t.run(['shell','am','start','-W','-n',pkg+'/.SyntheticBridgeActivity','--es','command',Buffer.from(JSON.stringify(c)).toString('base64url'),'--es','leaseToken',token,'--es','validUntilElapsed',String(deadline)]);
   return JSON.parse(await t.run(['shell','run-as',pkg,'cat','files/bridge-'+hash+'.json']));
  };
  check('T150 wrong token rejected '+offset,(await raw('0'.repeat(32),before.expiresElapsed)).status==='REJECTED');
  check('T150 elapsed deadline expired rejected '+offset,(await raw(before.nonce,before.issuedElapsed+1)).status==='REJECTED');
  check('T150 attempted lifetime extension rejected '+offset,(await raw(before.nonce,before.expiresElapsed+1)).status==='REJECTED');
 }
 report.passed=true;
}catch(e){report.passed=false;report.error=e.message;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(resolve(dest,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:checks.length,error:report.error,evidence:dest,realCallsIssued:0}));}
