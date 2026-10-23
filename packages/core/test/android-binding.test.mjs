import test from 'node:test';
import assert from 'node:assert/strict';
import { AndroidDeviceBinding } from '../src/android-device-binding.mjs';
import { commandDigest } from '../src/android-sandbox-adapter.mjs';
import { AdbSyntheticTransport } from '../src/adb-synthetic-transport.mjs';
const HASH='a'.repeat(64);
function setup(){
 let now=1000,connected=true,apk=HASH,boot='boot-a',sends=0;
 const transport={serial:'USB-TEST',inspect:async()=>{if(!connected)throw Error('DISCONNECTED');return {serial:'USB-TEST',apkSha256:apk,bootId:boot,sdk:36,model:'Synthetic phone'};},send:async c=>{sends++;return {schemaVersion:1,mode:'simulation',source:'ANDROID_SIMULATION',attemptId:c.attemptId,deviceId:c.deviceId,commandDigest:commandDigest(c),actualPhoneApiCalls:0,status:'SIMULATED_ACCEPTED'};}};
 const binding=new AndroidDeviceBinding({transport,expectedApkHash:HASH,now:()=>now});
 return {binding,transport,time:n=>now=n,disconnect:()=>connected=false,reconnect:()=>connected=true,apk:h=>apk=h,boot:b=>boot=b,sends:()=>sends};
}
test('T-CALL-116 explicit binding reports synthetic-only capabilities and no real SIM mapping',async()=>{
 const f=setup();assert.equal(f.binding.status().state,'UNBOUND');await assert.rejects(f.binding.verify(),/UNBOUND/);
 const b=await f.binding.bind();assert.equal(b.state,'BOUND');assert.equal(b.simId,'SYNTHETIC-NO-SIM');assert.equal(b.realSimBound,false);assert.equal(b.realCallsEnabled,false);assert.equal(b.capabilities.syntheticInbox,true);assert.equal(b.expiresAt,61000);
 const copy=f.binding.status();copy.capabilities.syntheticInbox=false;assert.equal(f.binding.status().capabilities.syntheticInbox,true);
});
test('T-CALL-117 expired or backwards clock invalidates binding until explicit rebind',async()=>{
 for(const at of [999,61000]){const f=setup();await f.binding.bind();f.time(at);await assert.rejects(f.binding.verify(),/EXPIRED/);f.time(2000);await assert.rejects(f.binding.verify(),/UNBOUND/);assert.equal(f.sends(),0);}
});
for(const change of ['disconnect','apk','boot'])test('T-CALL-118 '+change+' invalidates binding, no automatic recovery',async()=>{
 const f=setup();const first=await f.binding.bind();if(change==='disconnect')f.disconnect();if(change==='apk')f.apk('b'.repeat(64));if(change==='boot')f.boot('boot-b');
 await assert.rejects(f.binding.verify());assert.equal(f.binding.status().state,'UNBOUND');f.reconnect();f.apk(HASH);const next=await f.binding.bind();assert.notEqual(first.deviceId,next.deviceId);assert.equal(f.sends(),0);
});
test('T-CALL-119 old adapter cannot send after rebind and failed preflight sends nothing',async()=>{
 const f=setup();await f.binding.bind();const old=f.binding.adapter();const a={tenantId:'SYNTHETIC-TENANT',salesId:'SYNTHETIC-SALES',taskId:'SYNTHETIC-TASK',attemptId:'SYNTHETIC-ATTEMPT',intentId:'SYNTHETIC-INTENT',targetKey:'SYNTHETIC-TARGET',cycle:1,planVersion:1,policyVersion:1,qualificationRevision:1};
 const c=old.createCommand(a,1000);await f.binding.bind();await assert.rejects(old.submit(c),/BINDING_CHANGED/);assert.equal(f.sends(),0);
 const current=f.binding.adapter();f.disconnect();await assert.rejects(current.submit(current.createCommand(a,1000)));assert.equal(f.sends(),0);
});
test('T-CALL-116 only approved APK can bind; new process starts unbound',async()=>{
 const f=setup();f.apk('b'.repeat(64));await assert.rejects(f.binding.bind(),/CAPABILITY/);assert.equal(f.binding.status().state,'UNBOUND');
 f.apk(HASH);await f.binding.bind();assert.equal(new AndroidDeviceBinding({transport:f.transport,expectedApkHash:HASH}).status().state,'UNBOUND');
});
test('T-CALL-116 inspect accepts Android randomized APK path but rejects shell-shaped paths',async()=>{
 const t=new AdbSyntheticTransport({adbPath:'unused',serial:'USB-TEST'});let path='/data/app/~~random==/app-name==/base.apk';
 t.run=async args=>args[0]==='get-state'?'device':args[1]==='pm'?'package:'+path:args[1]==='sha256sum'?HASH+' '+path:args[2]==='ro.build.version.sdk'?'36':args[2]==='ro.product.model'?'SM-S9180':'boot-a';
 assert.equal((await t.inspect()).apkSha256,HASH);path='/data/app/a;other/base.apk';await assert.rejects(t.inspect(),/UNEXPECTED_APK_PATH/);
});
