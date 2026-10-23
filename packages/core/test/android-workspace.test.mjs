import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/memory-store.mjs';
import { AndroidDeviceBinding } from '../src/android-device-binding.mjs';
import { AndroidWorkspace } from '../src/android-workspace.mjs';
import { SimulationSession } from '../src/simulation-session.mjs';
import { commandDigest } from '../src/android-sandbox-adapter.mjs';
import { createWorkbench } from '../src/workbench-server.mjs';
function setup(){
 let now=Date.parse('2026-10-15T02:00:00Z'),connected=true,count=0,lost=false;
 const transport={serial:'USB-TEST',inspect:async()=>{if(!connected)throw Error('DISCONNECTED');return {serial:'USB-TEST',apkSha256:'a'.repeat(64),bootId:'boot',sdk:36};},send:async c=>{count++;if(lost)throw Error('LOST');return {schemaVersion:1,mode:'simulation',source:'ANDROID_SIMULATION',attemptId:c.attemptId,deviceId:c.deviceId,commandDigest:commandDigest(c),actualPhoneApiCalls:0,status:'SIMULATED_ACCEPTED'};}};
 const binding=new AndroidDeviceBinding({transport,expectedApkHash:'a'.repeat(64),now:()=>now}),store=new MemoryStore();
 const workspace=new AndroidWorkspace({store,binding,now:()=>now});
 return {workspace,binding,store,count:()=>count,disconnect:()=>connected=false,lose:()=>lost=true,advance:()=>now+=60000};
}
async function prepared(f){await f.workspace.execute({op:'create',targetKey:'SYNTHETIC-WEB-PHONE'});return f.workspace.status().snapshot.tasks[0].taskId;}
const send=taskId=>({op:'send',taskId,intentId:'SYNTHETIC-INTENT-WEB'});
test('T-CALL-120 wall-clock workspace does not share virtual time or actors',async()=>{
 const f=setup(),virtualStore=new MemoryStore(),virtual=new SimulationSession(virtualStore,{profile:'self-service'}),old=f.workspace.status().now;
 assert.equal((await virtual.execute({op:'advance',ms:60000})).decision,'OK');assert.equal(f.workspace.status().now,old);
 assert.notEqual(f.workspace.actorId,'SYNTHETIC-SALES-A');assert.throws(()=>new AndroidWorkspace({store:virtualStore,binding:f.binding}),/DEDICATED_ANDROID_STORE_REQUIRED/);
});
test('T-CALL-121 unbound/disconnected/expired device prevents authorization',async()=>{
 for(const mode of ['unbound','disconnected','expired']){const f=setup(),task=await prepared(f);if(mode!=='unbound')await f.binding.bind();if(mode==='disconnected')f.disconnect();if(mode==='expired')f.advance();
 assert.equal((await f.workspace.execute(send(task))).decision,'DENY');assert.equal(f.workspace.status().metrics.G,0);assert.equal(f.count(),0);}
});
test('T-CALL-122 concurrent send once, lost receipt survives workspace reopen without replay',async()=>{
 const f=setup(),task=await prepared(f);await f.binding.bind();f.lose();await Promise.all([f.workspace.execute(send(task)),f.workspace.execute(send(task))]);
 assert.equal(f.count(),1);assert.equal(f.workspace.status().snapshot.attempts[0].status,'RECONCILE_REQUIRED');
 const reopened=new AndroidWorkspace({store:f.store,binding:f.binding,now:()=>f.workspace.status().now});await reopened.execute(send(task));assert.equal(f.count(),1);
});
test('T-CALL-123 pause and refusal still prevent phone simulation; real inputs/extra fields rejected',async()=>{
 const f=setup(),task=await prepared(f);await f.binding.bind();await f.workspace.execute({op:'pause'});assert.equal((await f.workspace.execute(send(task))).decision,'DENY');
 assert.equal((await f.workspace.execute({op:'create',targetKey:'NOT-SYNTHETIC'})).decision,'DENY');assert.equal((await f.workspace.execute({op:'bind',simId:'REAL'})).decision,'DENY');
 await f.workspace.execute({op:'resume'});await f.workspace.execute({op:'plan',taskId:task});await f.workspace.execute({op:'refuse',targetKey:'SYNTHETIC-WEB-PHONE'});
 assert.equal((await f.workspace.execute(send(task))).decision,'DENY');assert.equal(f.count(),0);
});
test('T-CALL-122 disconnect after grant commit preserves unknown without retry',async()=>{
 const f=setup(),task=await prepared(f);await f.binding.bind();
 f.workspace.engine.fault=point=>{if(point==='after-handoff-commit')f.disconnect();};
 await f.workspace.execute(send(task));assert.equal(f.count(),0);assert.equal(f.workspace.status().snapshot.attempts[0].status,'RECONCILE_REQUIRED');
 await f.workspace.execute(send(task));assert.equal(f.workspace.status().metrics.G,1);
});
test('T-CALL-125 Android API retains session/origin isolation and refuses virtual clock commands',async t=>{
 const f=setup(),app=await createWorkbench({store:new MemoryStore(),android:f.workspace});t.after(()=>app.close());
 assert.equal((await fetch(app.url+'/api/android/status')).status,403);
 const post=(c,extra={})=>fetch(app.url+'/api/android/command',{method:'POST',headers:{Authorization:'Bearer '+app.token,'Content-Type':'application/json',...extra},body:JSON.stringify(c)});
 assert.equal((await post({op:'bind'},{Origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await(await post({op:'time',atEpochMs:0})).json()).decision,'DENY');
 assert.equal((await(await post({op:'create',targetKey:'SYNTHETIC-HTTP'})).json()).decision,'OK');
 assert.equal(app.session.status().snapshot.tasks.length,0);assert.equal(f.workspace.status().snapshot.tasks.length,1);
});
