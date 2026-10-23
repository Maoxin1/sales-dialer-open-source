import {NativePermitSwitch} from '../src/native-permit-switch.mjs';
import {fixture as switchFixture} from '../test-support/native-permit-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {AdbControlledCallTransport} from '../src/adb-controlled-call-transport.mjs';
import {encodeNativeCallCommand} from '../src/native-call-protocol.mjs';
const apk='d'.repeat(64),identity={serial:'SYNTHETIC-DEVICE',apkSha256:apk,sdk:36,model:'SYNTHETIC',bootId:'SYNTHETIC-BOOT'};
const host=createHash('sha256').update(JSON.stringify(identity)).digest('hex');
const command=()=>({schemaVersion:1,mode:'controlled-call',permitId:'SYNTHETIC-PERMIT',attemptId:'SYNTHETIC-ATTEMPT',ticketId:'SYNTHETIC-TICKET',tenantId:'SYNTHETIC-TENANT',salesId:'SYNTHETIC-SALES',targetKey:'SYNTHETIC-TARGET',installationKey:'a'.repeat(64),accountKey:'b'.repeat(64)});
function setup(t){const dir=mkdtempSync(join(tmpdir(),'sales-transport-'));const c=command();const permit={mode:'LOCAL_CONTROLLED_CALL',approvalRef:'CONTROLLED-SYNTHETIC',token:'c'.repeat(64),notBefore:Date.now()-1000,expiresAt:Date.now()+120000,...Object.fromEntries(['permitId','tenantId','salesId','targetKey','installationKey','accountKey'].map(k=>[k,c[k]]))};
 const options={adbPath:process.execPath,serial:identity.serial,journalPath:join(dir,'journal.db'),permit,expectedApkHash:apk,hostDeviceKey:host};const opened=[];t.after(()=>{for(const x of opened)try{x.close();}catch{}rmSync(dir,{recursive:true,force:true});});return {c,options,open(){const x=new Fake(options);opened.push(x);return x;}};}
class Fake extends AdbControlledCallTransport {
 calls=0;ops=[];lost=false;badReceipt=false;busy=false;changed=false;stale=false;
 async inspect(){return this.changed?{...identity,bootId:'OTHER'}:identity;}
 async run(args){this.ops.push(args);const component=args[args.indexOf('-n')+1],extra=k=>args[args.indexOf(k)+1];
  if(args.includes('-n')){
   if(component.endsWith('DeviceGuardActivity'))this.nonce=extra('nonce');
   if(component.endsWith('SyntheticLeaseActivity')){this.digest=extra('digest');this.ttl=Number(extra('ttl'));}
   if(component.endsWith('ControlledCallActivity')){this.calls++;this.sent=JSON.parse(Buffer.from(extra('command'),'base64url'));if(this.lost)throw Error('LOST_AFTER_SUBMIT');}
   if(component.endsWith('ControlledReconcileActivity'))this.reconcileNonce=extra('nonce');
   return 'Status: ok';
  }
  const path=args.at(-1);
  if(path==='files/guard-identity.json')return JSON.stringify({source:'ANDROID_GUARD_IDENTITY',nonce:this.nonce,actualPhoneApiCalls:0,deviceKey:'a'.repeat(64)});
  if(path.includes('lease-reply'))return JSON.stringify({schemaVersion:1,status:'READY',commandDigest:this.digest,nonce:'e'.repeat(32),issuedElapsed:100,expiresElapsed:100+this.ttl,bootCount:1});
  if(path.includes('controlled-call-')){if(this.lost)throw Error('MISSING');const c=encodeNativeCallCommand(this.sent??command());return JSON.stringify({source:'ANDROID_CONTROLLED_CALL',commandDigest:this.badReceipt?'f'.repeat(64):c.digest,attemptId:c.command.attemptId,ticketId:c.command.ticketId,status:'API_SUBMITTED',outgoingConfirmed:null,connectedConfirmed:null,manualResult:null});}
  if(path.includes('controlled-reconcile-')){const c=encodeNativeCallCommand(command());return JSON.stringify({source:'ANDROID_CONTROLLED_RECONCILE',nonce:this.stale?'f'.repeat(32):this.reconcileNonce,commandDigest:c.digest,attemptId:c.command.attemptId,ticketId:c.command.ticketId,status:this.busy?'REJECTED':'RECONCILED'});}
  throw Error('UNEXPECTED_COMMAND');
 }
}
test('T-CALL-234 transport binds command, supplies lease, returns API submission only',async t=>{const f=setup(t),x=f.open(),r=await x.submit(f.c);assert.equal(r.apiSubmission,'SUBMITTED');assert.equal(x.calls,1);assert.equal(r.connectedConfirmed,null);assert.equal(x.ops.some(a=>a.includes('pm')||a.includes('install')),false);});
test('T-CALL-235 concurrent duplicate sends only once',async t=>{const f=setup(t),x=f.open(),y=f.open();await Promise.all([x.submit(f.c),y.submit(f.c)]);assert.equal(x.calls+y.calls,1);});
test('T-CALL-235 restart after lost receipt never repeats; readback never sends',async t=>{const f=setup(t),x=f.open();x.lost=true;assert.equal((await x.submit(f.c)).apiSubmission,'UNKNOWN');assert.equal(x.calls,1);x.close();const y=f.open();assert.equal((await y.submit(f.c)).apiSubmission,'UNKNOWN');await y.readReceipt(f.c);assert.equal(y.calls,0);});
test('T-CALL-235 mismatched attempt digest cannot reread or resubmit',async t=>{const f=setup(t),x=f.open();await x.submit(f.c);const other={...f.c,ticketId:'SYNTHETIC-OTHER'};assert.equal((await x.submit(other)).apiSubmission,'UNKNOWN');await assert.rejects(x.readReceipt(other),/NO_MATCHING/);assert.equal(x.calls,1);});
test('T-CALL-234 device mismatch sends no call and remains claimed',async t=>{const f=setup(t),x=f.open();x.changed=true;assert.equal((await x.submit(f.c)).apiSubmission,'UNKNOWN');x.changed=false;await x.submit(f.c);assert.equal(x.calls,0);});
test('T-CALL-234 mismatched scope and expired permit rejected before device use',async t=>{const f=setup(t),x=f.open();await assert.rejects(x.submit({...f.c,accountKey:'f'.repeat(64)}),/SCOPE/);assert.equal(x.ops.length,0);f.options.permit.expiresAt=Date.now()-1;const y=f.open();await assert.rejects(y.submit(f.c),/EXPIRED/);assert.equal(y.ops.length,0);});
test('T-CALL-234 TEST_FIXTURE configuration is not upgraded',t=>{const f=setup(t);f.options.permit.mode='TEST_FIXTURE';assert.throws(()=>f.open(),/EXPLICIT_LOCAL_PERMIT/);});
test('T-CALL-236 wrong receipt remains UNKNOWN',async t=>{const f=setup(t),x=f.open();x.badReceipt=true;assert.equal((await x.submit(f.c)).apiSubmission,'UNKNOWN');assert.equal(x.calls,1);});
test('T-CALL-237 explicit native reconciliation never releases host or restores send',async t=>{const f=setup(t),x=f.open();await assert.rejects(x.reconcile(f.c,{noActiveCall:true}),/MATCHED/);await x.submit(f.c);await assert.rejects(x.reconcile(f.c),/MATCHED/);assert.deepEqual(await x.reconcile(f.c,{noActiveCall:true}),{nativeReconciled:true,hostReconciled:false});await x.submit(f.c);assert.equal(x.calls,1);});
for(const flag of ['busy','stale'])test('T-CALL-237 '+flag+' reconciliation unconfirmed',async t=>{const f=setup(t),x=f.open();await x.submit(f.c);x[flag]=true;assert.equal((await x.reconcile(f.c,{noActiveCall:true})).nativeReconciled,false);});
test('T-CALL-238 real runner failure audit does not expose args, token or stderr',async t=>{const f=setup(t),events=[];const x=new AdbControlledCallTransport({...f.options,record:e=>events.push(e)});try{await assert.rejects(x.run(['permitToken',f.options.permit.token]),/USB_FAILED/);assert.equal(events.length,1);assert.deepEqual(Object.keys(events[0]).sort(),['error','exitCode','operation']);assert.equal(JSON.stringify(events).includes(f.options.permit.token),false);}finally{x.close();}});
test('T-CALL-250 read-only snapshot mapping checks actual source, permissions and selected account',async t=>{
 const f=setup(t),x=f.open();let snapshot={source:'ANDROID_READ_ONLY',deviceKey:host,observedAt:Date.now(),inCall:false,permissions:{callPhone:true,readPhoneState:true,readPhoneNumbers:true},accountsStatus:'KNOWN',accounts:[{key:f.c.accountKey,enabled:true}]};
 x.readPhoneCapabilities=async()=>snapshot;
 assert.equal((await x.readControlledDevice()).accountEnabled,true);assert.equal(x.calls,0);
 snapshot.permissions.readPhoneState=false;assert.equal((await x.readControlledDevice()).permissionsGranted,false);
 snapshot.accounts.push({...snapshot.accounts[0]});assert.equal((await x.readControlledDevice()).accountEnabled,false);
 snapshot.source='TEST_DOUBLE';await assert.rejects(x.readControlledDevice(),/DEVICE_OBSERVATION_INVALID/);
});

test('T-CALL-372 scheduled deadline clamps native lease and rejects expired input before USB',async t=>{t.mock.timers.enable({apis:['Date'],now:Date.now()});const f=setup(t),x=f.open();await assert.rejects(x.submit(f.c,{deadline:Date.now()-1}),/SCHEDULE_EXPIRED/);assert.equal(x.ops.length,0);const deadline=Date.now()+1000;assert.equal((await x.submit(f.c,{deadline})).apiSubmission,'SUBMITTED');assert.ok(x.ttl<=1000);assert.equal(x.calls,1);});
test('T-CALL-373 device/lease processing crossing deadline never calls and never replays',async t=>{t.mock.timers.enable({apis:['Date'],now:Date.now()});const f=setup(t),x=f.open(),run=x.run.bind(x);x.run=async args=>{const result=await run(args);if(args.at(-1)?.includes('lease-reply'))t.mock.timers.tick(1001);return result;};assert.equal((await x.submit(f.c,{deadline:Date.now()+1000})).apiSubmission,'UNKNOWN');assert.equal(x.calls,0);await x.submit(f.c);assert.equal(x.calls,0);});

function switchSetup(f){const x=switchFixture();Object.assign(x.device,{deviceKey:host,apkSha256:apk});Object.assign(x.expected,{deviceKey:host,apkSha256:apk});let writes=0;let bytes='{"enabled":false}';const port={kind:'CONTROLLED_FIXTURE',collect:async()=>({decision:'COLLECTED',snapshot:{nativeBytes:bytes,device:x.device,ledger:x.ledger}}),replace:async({nextBytes})=>{bytes=nextBytes;writes++;}};const sw=new NativePermitSwitch({path:join(f.options.journalPath,'..','switch.db'),port,now:()=>x.now});return {sw,port,request:{operationId:'SWITCH-CROSS-0001',nativeBytes:x.nativeBytes,expected:x.expected,host:()=>x.host,deadline:x.deadline},get writes(){return writes;}};}
test('T433 submitted call blocks permit switch until authenticated native reconciliation',async t=>{const f=setup(t),x=f.open();await x.submit(f.c);const s=switchSetup(f);try{assert.equal((await s.sw.prepare(s.request)).reason,'DEVICE_BUSY');assert.equal(s.writes,0);await x.reconcile(f.c,{noActiveCall:true});assert.equal((await s.sw.prepare(s.request)).decision,'VERIFIED');}finally{s.sw.close();}});
test('T434 switch awaiting collection blocks send before any device command',async t=>{const f=setup(t),x=f.open(),s=switchSetup(f);let release;const original=s.port.collect;s.port.collect=()=>new Promise(r=>release=()=>original().then(r));try{const pending=s.sw.prepare(s.request);assert.equal((await x.submit(f.c)).apiSubmission,'UNKNOWN');assert.equal(x.ops.length,0);s.port.collect=original;release();assert.equal((await pending).decision,'VERIFIED');assert.equal((await x.submit(f.c)).apiSubmission,'SUBMITTED');}finally{s.sw.close();}});
test('T435 unknown call survives reopen and bad native reconciliation cannot unlock switch',async t=>{const f=setup(t),x=f.open();x.lost=true;await x.submit(f.c);x.close();const y=f.open(),s=switchSetup(f);try{y.busy=true;assert.equal((await y.reconcile(f.c,{noActiveCall:true})).nativeReconciled,false);assert.equal((await s.sw.prepare(s.request)).reason,'DEVICE_BUSY');assert.equal(y.calls,0);}finally{s.sw.close();}});
test('T436 legacy delivery without device/status blocks all switches until native matched reconcile',async t=>{const {DatabaseSync}=await import('node:sqlite');const f=setup(t),db=new DatabaseSync(f.options.journalPath);db.exec('CREATE TABLE delivery(attempt TEXT PRIMARY KEY,digest TEXT NOT NULL)');db.prepare('INSERT INTO delivery VALUES(?,?)').run(f.c.attemptId,encodeNativeCallCommand(f.c).digest);db.close();const s=switchSetup(f);try{assert.equal((await s.sw.prepare(s.request)).reason,'DEVICE_BUSY');const x=f.open();assert.equal((await x.reconcile(f.c,{noActiveCall:true})).nativeReconciled,true);assert.equal((await s.sw.prepare(s.request)).decision,'VERIFIED');}finally{s.sw.close();}});
test('T437 active submission cannot be reconciled or closed to release the gate',async t=>{const f=setup(t),x=f.open(),s=switchSetup(f),run=x.run.bind(x);let release; x.run=async args=>{if(args.includes('files/guard-identity.json'))await new Promise(r=>release=r);return run(args);};try{const pending=x.submit(f.c);while(!release)await new Promise(r=>setImmediate(r));assert.equal((await x.reconcile(f.c,{noActiveCall:true})).nativeReconciled,false);assert.throws(()=>x.close(),/IN_FLIGHT/);assert.equal((await s.sw.prepare(s.request)).reason,'DEVICE_BUSY');x.run=run;release();await pending;}finally{s.sw.close();}});
