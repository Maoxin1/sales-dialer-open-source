import test from 'node:test';
import assert from 'node:assert/strict';
import { PhoneCapabilities } from '../src/phone-capabilities.mjs';
import { AdbSyntheticTransport } from '../src/adb-synthetic-transport.mjs';
const key='a'.repeat(64);
function setup(){let now=1000;let value={schemaVersion:1,source:'ANDROID_READ_ONLY',deviceKey:'b'.repeat(64),observedAt:now,deviceObservedAt:now,permissions:{callPhone:true,readPhoneState:true,readPhoneNumbers:true},accountsStatus:'KNOWN',accounts:[{key,label:'测试卡',enabled:true}],inCall:false,exactAlarm:true,backgroundRestricted:false,ignoringBatteryOptimizations:true,realCallsEnabled:false};
 const model=new PhoneCapabilities({now:()=>now,read:async()=>structuredClone(value)});return {model,value,advance:()=>now+=60000};}
test('T-CALL-136 snapshot never authorizes calls; explicit account selection distinct from synthetic SIM',async()=>{
 const f=setup();assert.equal(f.model.status().realCallsEnabled,false);await f.model.refresh();assert.equal(f.model.status().selectedAccount,null);
 assert.equal(f.model.select(key).decision,'OK');assert.equal(f.model.status().prerequisites,'OBSERVED_READY');assert.equal(f.model.status().realCallsEnabled,false);assert.equal(f.model.status().callAuthorization,'DENY');
});
for(const change of ['permission','account','unknown','busy','background','alarm','device'])test('T-CALL-137 '+change+' invalidates selection and blocks readiness',async()=>{
 const f=setup();await f.model.refresh();f.model.select(key);
 if(change==='permission')f.value.permissions.callPhone=false;if(change==='account')f.value.accounts=[];if(change==='unknown')f.value.accountsStatus='UNKNOWN';if(change==='busy')f.value.inCall=true;if(change==='background')f.value.backgroundRestricted=true;if(change==='alarm')f.value.exactAlarm=false;if(change==='device')f.value.deviceKey='c'.repeat(64);
 await f.model.refresh();assert.equal(f.model.status().selectedAccount,null);assert.equal(f.model.status().callAuthorization,'DENY');
});
test('T-CALL-138 stale/failed snapshot clears binding; no automatic card fallback',async()=>{
 const f=setup();await f.model.refresh();f.model.select(key);f.advance();assert.equal(f.model.status().selectedAccount,null);assert.equal(f.model.select(key).decision,'DENY');
 const g=setup();await g.model.refresh();g.model.select(key);g.model.read=async()=>{throw Error('DISCONNECTED');};await assert.rejects(g.model.refresh());assert.equal(g.model.status().selectedAccount,null);
});
test('T-CALL-139 malformed, duplicate-account and unexpected fields fail closed',async()=>{
 for(const change of ['type','duplicate','extra']){const f=setup();if(change==='type')f.value.permissions.callPhone='true';if(change==='duplicate')f.value.accounts.push({...f.value.accounts[0]});if(change==='extra')f.value.phoneNumber='UNEXPECTED';await assert.rejects(f.model.refresh());assert.equal(f.model.status().callAuthorization,'DENY');}
});
test('T-CALL-138 refresh after expiry cannot silently renew an old account selection',async()=>{
 const f=setup();await f.model.refresh();f.model.select(key);f.advance();f.value.observedAt=61000;await f.model.refresh();assert.equal(f.model.status().selectedAccount,null);
 assert.equal(f.model.select(key).decision,'OK');const copy=f.model.status();copy.selectedAccount.key='changed';assert.equal(f.model.status().selectedAccount.key,key);
});
test('T-CALL-141 transport rejects stale nonce, APK mismatch, and device changes around probe',async()=>{
 for(const mode of ['nonce','apk','device']){
  const t=new AdbSyntheticTransport({adbPath:'unused',serial:'SYNTHETIC-USB'});let reads=0,nonce;
  t.inspect=async()=>({serial:'SYNTHETIC-USB',apkSha256:mode==='apk'?'c'.repeat(64):key,bootId:mode==='device'&&reads++?'new':'old'});
  t.run=async args=>{if(args.includes('start')){nonce=args.at(-1);return 'Status: ok';}return JSON.stringify({nonce:mode==='nonce'?'stale':nonce});};
  await assert.rejects(t.readPhoneCapabilities(key),/PHONE_/);
 }
});
test('T-CALL-142 null capability and disabled account are blocked, unchanged fresh snapshot preserves selection',async()=>{
 const f=setup();await f.model.refresh();f.model.select(key);await f.model.refresh();assert.equal(f.model.status().selectedAccount.key,key);
 f.value.inCall=null;await f.model.refresh();assert.equal(f.model.select(key).decision,'DENY');
 f.value.inCall=false;f.value.accounts[0].enabled=false;await f.model.refresh();assert.equal(f.model.select(key).decision,'DENY');
});
test('T-CALL-143 device wall clock offset cannot invalidate a nonce-correlated fresh read or renew selection',async()=>{
 const f=setup();f.value.deviceObservedAt=28136;await f.model.refresh();assert.equal(f.model.select(key).decision,'OK');
 f.value.deviceObservedAt=28180;await f.model.refresh();assert.equal(f.model.status().selectedAccount.key,key);assert.equal(f.model.status().snapshot.deviceObservedAt,28180);
});
