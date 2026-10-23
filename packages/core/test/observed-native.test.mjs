import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SQLiteStore} from '../src/sqlite-store.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MemoryStore} from '../src/memory-store.mjs';
import {ObservedTrial} from '../src/observed-trial.mjs';
import {NativeGuardAdapter} from '../src/native-guard-adapter.mjs';
import {PhoneCapabilities} from '../src/phone-capabilities.mjs';
import {createWorkbench} from '../src/workbench-server.mjs';
const A='a'.repeat(64),D='b'.repeat(64),NOW=Date.parse('2026-10-15T01:00:00Z');
function fixture(store=new MemoryStore()){
 let identity='c'.repeat(64),lost=false,reads=0,sends=0;
 const phone=new PhoneCapabilities({now:()=>NOW,read:async()=>({schemaVersion:1,source:'ANDROID_READ_ONLY',deviceKey:D,observedAt:NOW,deviceObservedAt:NOW,permissions:{callPhone:true,readPhoneState:true,readPhoneNumbers:true},accountsStatus:'KNOWN',accounts:[{key:A,label:'Synthetic SIM',enabled:true}],inCall:false,exactAlarm:true,backgroundRestricted:false,ignoringBatteryOptimizations:true,realCallsEnabled:false})});
 const guardFactory={identity:async()=>{reads++;return identity;},create:(mapping,deviceKey)=>new NativeGuardAdapter({hostDeviceKey:mapping.deviceKey,accountKey:mapping.accountKey,deviceKey,now:()=>NOW,transport:{send:async c=>{sends++;if(lost)throw Error('LOST');return {source:'ANDROID_GUARD_DRY_RUN',commandDigest:createHash('sha256').update(JSON.stringify(c)).digest('hex'),status:'DRY_RUN_READY',actualPhoneApiCalls:0,realCallsEnabled:false,duplicate:false,checksForRequest:1};}}})};
 const config={store,phone,now:()=>NOW,guardFactory};return {store,config,trial:new ObservedTrial(config),change:()=>identity='d'.repeat(64),lose:()=>lost=true,counts:()=>({reads,sends})};
}
test('T-CALL-202 explicit binding persists native identity; status never performs phone IO',async()=>{
 const f=fixture();await f.trial.bind(A);assert.equal(f.store.read().observedTrial.nativeDeviceKey,'c'.repeat(64));assert.equal(f.trial.status().mode,'OBSERVED_DEVICE_NATIVE_GUARD');
 const n=f.counts();f.trial.status();f.trial.status();assert.deepEqual(f.counts(),n);
 await f.trial.submit();assert.equal(f.trial.status().attempt.nativeGuardReceipt.status,'DRY_RUN_READY');assert.equal(f.trial.status().attempt.apiSubmission,'UNKNOWN');assert.equal(f.counts().sends,1);
});
test('T-CALL-203 changed installation blocks rebind and submit without replacing saved identity',async()=>{
 const f=fixture();await f.trial.bind(A);f.change();assert.equal((await f.trial.bind(A)).reason,'NATIVE_INSTALLATION_CHANGED');assert.equal((await f.trial.submit()).decision,'DENY');assert.equal(f.trial.status().used,0);assert.equal(f.counts().sends,0);assert.equal(f.store.read().observedTrial.nativeDeviceKey,'c'.repeat(64));
});
test('T-CALL-204 lost native receipt and restart retain quota, no silent fake fallback',async()=>{
 const f=fixture();await f.trial.bind(A);f.lose();await f.trial.submit();const n=fixture(f.store);assert.equal(n.trial.status().mode,'OBSERVED_DEVICE_NATIVE_GUARD');assert.equal(n.trial.status().attempt.status,'RECONCILE_REQUIRED');assert.equal(n.trial.status().used,1);assert.equal(n.counts().sends,0);
 const off=new ObservedTrial({...n.config,guardFactory:undefined});assert.equal((await off.submit()).reason,'NATIVE_GUARD_UNAVAILABLE');assert.equal(off.status().mode,'OBSERVED_DEVICE_NATIVE_GUARD');assert.equal((await off.reconcile(true)).decision,'OK');
});
test('T-CALL-205 persisted fake round cannot silently become native round',async()=>{
 const f=fixture();const old=new ObservedTrial({...f.config,guardFactory:undefined});await old.bind(A);assert.equal((await f.trial.bind(A)).reason,'OUTPUT_MODE_CHANGED');assert.equal((await f.trial.submit()).decision,'DENY');assert.equal(f.trial.status().used,0);
});
test('T-CALL-206 HTTP native receipt exposed separately, injected identity rejected',async t=>{
 const f=fixture(),app=await createWorkbench({store:new MemoryStore(),observed:f.trial});t.after(()=>app.close());const headers={Authorization:'Bearer '+app.token,'Content-Type':'application/json'};
 const send=async c=>(await fetch(app.url+'/api/observed/command',{method:'POST',headers,body:JSON.stringify(c)})).json();
 assert.equal((await send({op:'bind',accountKey:A,nativeDeviceKey:'f'.repeat(64)})).decision,'DENY');await send({op:'bind',accountKey:A});await send({op:'submit'});
 const state=await(await fetch(app.url+'/api/observed/status',{headers})).json();assert.equal(state.attempt.nativeGuardReceipt.status,'DRY_RUN_READY');assert.equal(state.realCallsEnabled,false);assert.equal(state.attempt.apiSubmission,'UNKNOWN');
});

test('T-CALL-208 native SQLite HTTP restart retains identity and unknown without IO',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'observed-native-'));let app;
 try{
  const f=fixture(new SQLiteStore(join(dir,'observed.db')));await f.trial.bind(A);f.lose();await f.trial.submit();
  app=await createWorkbench({store:new MemoryStore(),observed:f.trial});await app.close();app=null;
  const g=fixture(new SQLiteStore(join(dir,'observed.db')));app=await createWorkbench({store:new MemoryStore(),observed:g.trial});
  const s=await(await fetch(app.url+'/api/observed/status',{headers:{Authorization:'Bearer '+app.token}})).json();
  assert.equal(s.mode,'OBSERVED_DEVICE_NATIVE_GUARD');assert.equal(s.attempt.status,'RECONCILE_REQUIRED');assert.equal(s.used,1);assert.equal(s.phone.selectedAccount,null);assert.deepEqual(g.counts(),{reads:0,sends:0});
  assert.equal(g.store.read().observedTrial.nativeDeviceKey,'c'.repeat(64));await g.trial.bind(A);assert.equal((await g.trial.submit()).decision,'DENY');assert.equal(g.counts().sends,0);
 }finally{await app?.close();rmSync(dir,{recursive:true,force:true});}
});
test('T-CALL-203 installation changes after selection block submission before charge',async()=>{
 const f=fixture();await f.trial.bind(A);f.change();assert.equal((await f.trial.submit()).reason,'NATIVE_INSTALLATION_CHANGED');assert.equal(f.trial.status().used,0);assert.equal(f.counts().sends,0);assert.equal(f.trial.status().phone.selectedAccount,null);
});
test('T-CALL-202 identity read failure creates no binding or round',async()=>{
 const f=fixture(),trial=new ObservedTrial({...f.config,guardFactory:{...f.config.guardFactory,identity:async()=>{throw Error('OFFLINE');}}});assert.equal((await trial.bind(A)).decision,'DENY');assert.equal(trial.status().expiresAt,null);assert.equal(f.store.read().observedTrial.mapping,null);assert.equal(trial.status().phone.selectedAccount,null);
});
