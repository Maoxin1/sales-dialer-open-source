import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {AdbSyntheticTransport} from '../packages/core/src/adb-synthetic-transport.mjs';
import {leaseProof} from '../packages/core/src/android-time-lease.mjs';
const [serial,label,directory]=process.argv.slice(2),root=resolve(import.meta.dirname,'..'),dest=resolve(root,directory??''),rel=relative(resolve(root,'evidence'),dest);
if(!serial||!label||!rel||rel.startsWith('..')||isAbsolute(rel)||existsSync(dest))throw Error('Usage: check-native-guard.mjs SERIAL EXACT_LABEL evidence/new-directory');
mkdirSync(dest,{recursive:true});const commands=[],checks=[],pkg='com.mantou.salesdialer.spike';
const hash=createHash('sha256').update(readFileSync(resolve(root,'prototypes/android/app/build/outputs/apk/debug/app-debug.apk'))).digest('hex');
const t=new AdbSyntheticTransport({adbPath:resolve(root,'.tooling/android-sdk/platform-tools/adb.exe'),serial,record:r=>commands.push(r.args.includes('shared_prefs/controlled_probe.xml')?{...r,stdout:'[probe preferences inspected; allowlisted booleans recorded separately]'}:r)});
const report={startedAt:new Date().toISOString(),command:process.argv,node:process.version,apkSha256:hash,commands,checks,realCallsIssued:0};
const digest=raw=>createHash('sha256').update(raw).digest('hex');
async function proof(raw,ttl=60000){const d=digest(raw),start=performance.now();await t.run(['shell','am','start','-W','-n',pkg+'/.SyntheticLeaseActivity','--es','digest',d,'--ei','ttl',String(ttl)]);const lease=JSON.parse(await t.run(['shell','run-as',pkg,'cat','files/lease-reply-'+d+'.json']));return leaseProof({lease,digest:d,remainingAtRequest:ttl,roundTripMs:performance.now()-start});}
async function send(raw,p){const d=digest(raw);const args=['shell','am','start','-W','-n',pkg+'/.DeviceGuardActivity','--es','command',Buffer.from(raw).toString('base64url')];if(p)args.push('--es','leaseToken',p.nonce,'--es','validUntilElapsed',String(p.validUntilElapsed));await t.run(args);const r=JSON.parse(await t.run(['shell','run-as',pkg,'cat','files/guard-'+d+'.json']));assert.equal(r.commandDigest,d);assert.equal(r.actualPhoneApiCalls,0);assert.equal(r.realCallsEnabled,false);return r;}
try{
 report.device=await t.inspect();assert.equal(report.device.apkSha256,hash);
 const phone=await t.readPhoneCapabilities(hash);report.phone=phone;assert.equal(phone.inCall,false,'phone must be idle for positive dry-run check');
 const matches=phone.accounts.filter(a=>a.label===label&&a.enabled);assert.equal(matches.length,1);checks.push('T191 explicit account observed');
 const nonce=randomBytes(16).toString('hex');await t.run(['shell','am','start','-W','-n',pkg+'/.DeviceGuardActivity','--es','op','identity','--es','nonce',nonce]);
 const identity=JSON.parse(await t.run(['shell','run-as',pkg,'cat','files/guard-identity.json']));assert.equal(identity.nonce,nonce);assert.match(identity.deviceKey,/^[a-f0-9]{64}$/);checks.push('T191 native installation identity');
 const base={schemaVersion:1,mode:'dry-run',requestId:'SYNTHETIC-'+randomUUID().toUpperCase(),deviceKey:identity.deviceKey,accountKey:matches[0].key};
 const raw=JSON.stringify(base),p=await proof(raw);report.first=await send(raw,p);assert.equal(report.first.status,'DRY_RUN_READY');assert.equal(report.first.duplicate,false);checks.push('T191 native permissions/account/idle ready');
 const again=await send(raw,p);assert.equal(again.duplicate,true);assert.equal(again.checksForRequest,1);checks.push('T192 duplicate returns one ledger entry');
 // App-only process termination. Never changes or ends an actual phone call.
 await t.run(['shell','am','force-stop',pkg]);const restored=await send(raw,p);assert.equal(restored.duplicate,true);checks.push('T192 process restart preserves deduplication');
 const changed=JSON.stringify(base,null,1);const conflict=await send(changed,await proof(changed));assert.equal(conflict.reason,'REQUEST_CONFLICT');checks.push('T193 same request altered digest rejected');
 for(const [name,change,reason] of [['device',{deviceKey:'0'.repeat(64)},'DEVICE_MISMATCH'],['account',{accountKey:'0'.repeat(64)},'ACCOUNT_UNAVAILABLE'],['real-mode',{mode:'real'},'DRY_RUN_ONLY'],['number-field',{phoneNumber:'SYNTHETIC-NOT-A-NUMBER'},'DRY_RUN_ONLY']]){
  const body=JSON.stringify({...base,requestId:'SYNTHETIC-'+randomUUID().toUpperCase(),...change});const r=await send(body,await proof(body));assert.equal(r.reason,reason);checks.push('T193 '+name+' rejected');
 }
 const body=JSON.stringify({...base,requestId:'SYNTHETIC-'+randomUUID().toUpperCase()});const valid=await proof(body);
 assert.equal((await send(body)).reason,'TIME_LEASE_REQUIRED');checks.push('T194 missing lease rejected');
 assert.equal((await send(body,{...valid,nonce:'0'.repeat(32)})).reason,'TIME_LEASE_INVALID_OR_EXPIRED');checks.push('T194 wrong token rejected');
 assert.equal((await send(body,{...valid,validUntilElapsed:0})).reason,'TIME_LEASE_INVALID_OR_EXPIRED');checks.push('T194 elapsed deadline rejected');
 assert.equal((await send(body,{...valid,validUntilElapsed:valid.validUntilElapsed+120000})).reason,'TIME_LEASE_INVALID_OR_EXPIRED');checks.push('T194 extended deadline rejected');
 const expiring=JSON.stringify({...base,requestId:'SYNTHETIC-'+randomUUID().toUpperCase()});const short=await proof(expiring,2000);await new Promise(r=>setTimeout(r,2200));assert.equal((await send(expiring,short)).reason,'TIME_LEASE_INVALID_OR_EXPIRED');checks.push('T194 actual elapsed expiry rejected');
 const prefs=await t.run(['shell','run-as',pkg,'cat','shared_prefs/controlled_probe.xml']);report.probeState={};
 for(const [key,value] of [['dryRun','true'],['paused','true'],['armed','false']]){assert.ok(prefs.includes('name="'+key+'" value="'+value+'"'));report.probeState[key]=value==='true';}checks.push('T195 original real-call probe remains paused and dry');
 report.passed=true;report.exitCode=0;
}catch(e){report.passed=false;report.error=e.message;report.exitCode=1;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(resolve(dest,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,error:report.error,checks:checks.length,realCallsIssued:0,evidence:dest}));}
