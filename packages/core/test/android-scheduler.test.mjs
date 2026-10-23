import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore } from '../src/memory-store.mjs';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { AndroidWorkspace } from '../src/android-workspace.mjs';
import { AndroidDeviceBinding } from '../src/android-device-binding.mjs';
import { commandDigest } from '../src/android-sandbox-adapter.mjs';
const START=Date.parse('2026-10-15T02:00:00Z');
async function setup(store=new MemoryStore()){
 let now=START,count=0,connected=true,lost=false;
 const transport={serial:'SYNTHETIC-USB',inspect:async()=>{if(!connected)throw Error('DISCONNECTED');return {serial:'SYNTHETIC-USB',sdk:36,bootId:'boot',apkSha256:'a'.repeat(64)};},send:async c=>{count++;if(lost)throw Error('LOST');return {schemaVersion:1,mode:'simulation',source:'ANDROID_SIMULATION',commandDigest:commandDigest(c),attemptId:c.attemptId,deviceId:c.deviceId,status:'SIMULATED_ACCEPTED',actualPhoneApiCalls:0};}};
 const binding=new AndroidDeviceBinding({transport,expectedApkHash:'a'.repeat(64),now:()=>now}),workspace=new AndroidWorkspace({store,binding,now:()=>now});
 await workspace.execute({op:'create',targetKey:'SYNTHETIC-TARGET-SCHEDULE'});await binding.bind();const taskId=workspace.status().snapshot.tasks[0].taskId;
 return {workspace,binding,store,taskId,count:()=>count,time:n=>now=n,disconnect:()=>connected=false,lose:()=>lost=true,now:()=>now};
}
const schedule=f=>f.workspace.execute({op:'schedule',taskId:f.taskId,plannedAt:START+5000});
test('T-CALL-126 persisted schedule fires only when due and exactly once',async()=>{
 const f=await setup();assert.equal((await schedule(f)).decision,'OK');assert.equal(f.workspace.status().schedules[0].status,'PENDING');
 await f.workspace.runDue();assert.equal(f.count(),0);f.time(START+5000);await Promise.all([f.workspace.runDue(),f.workspace.runDue()]);
 assert.equal(f.count(),1);assert.equal(f.workspace.status().schedules[0].status,'COMPLETED');assert.equal(f.workspace.status().snapshot.attempts[0].trigger,'scheduled');
});
for(const change of ['pause','replan','old-version','policy','refuse','rebind','disconnect','late'])test('T-CALL-127 '+change+' does not dispatch stale plan',async()=>{
 const f=await setup();assert.equal((await schedule(f)).decision,'OK');
 if(change==='pause'){await f.workspace.execute({op:'pause'});await f.workspace.execute({op:'resume'});}
 if(change==='replan')await f.workspace.execute({op:'plan',taskId:f.taskId});
 if(change==='old-version')f.workspace.engine.retime({actorId:f.workspace.actorId,taskId:f.taskId,plannedAt:START+4000});
 if(change==='policy')f.store.transaction(s=>{s.policy.version++;});
 if(change==='refuse')await f.workspace.execute({op:'refuse',targetKey:'SYNTHETIC-TARGET-SCHEDULE'});
 if(change==='rebind')await f.binding.bind();if(change==='disconnect')f.disconnect();f.time(START+(change==='late'?7001:5000));
 await f.workspace.runDue();await f.workspace.runDue();assert.equal(f.count(),0);assert.notEqual(f.workspace.status().schedules[0].status,'PENDING');assert.equal(f.workspace.status().metrics.G,0);
});
test('T-CALL-128 SQLite restart keeps future and overdue plans but requires explicit replan',async()=>{
 for(const at of [START+1000,START+6000]){
 const dir=mkdtempSync(join(tmpdir(),'dialer-schedule-')),path=join(dir,'state.db');let store=new SQLiteStore(path);
 try{const f=await setup(store);assert.equal((await schedule(f)).decision,'OK');await f.workspace.close();store=new SQLiteStore(path);f.time(at);
 const reopened=new AndroidWorkspace({store,binding:f.binding,now:f.now});await reopened.runDue();assert.equal(reopened.status().schedules[0].status,'NEEDS_REPLAN');assert.equal(f.count(),0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}}
});
test('T-CALL-129 manual/timer race and lost receipt do not create second attempt',async()=>{
 const f=await setup();assert.equal((await schedule(f)).decision,'OK');f.time(START+5000);f.lose();
 await Promise.all([f.workspace.runDue(),f.workspace.execute({op:'send',taskId:f.taskId,intentId:'SYNTHETIC-MANUAL'})]);
 assert.equal(f.count(),1);assert.equal(f.workspace.status().metrics.G,1);assert.equal(f.workspace.status().snapshot.attempts[0].status,'RECONCILE_REQUIRED');
 await f.workspace.runDue();assert.equal(f.count(),1);
});
test('T-CALL-130 schedule rejects past/unbound/beyond binding lease and invalid fields without changing task',async()=>{
 const f=await setup();const before=f.workspace.status().snapshot.tasks;
 for(const at of [START,START-1,START+60000,NaN])assert.equal((await f.workspace.execute({op:'schedule',taskId:f.taskId,plannedAt:at})).decision,'DENY');
 assert.deepEqual(f.workspace.status().snapshot.tasks,before);assert.equal(f.count(),0);
});
test('T-CALL-131 manual first cancels pending timer and busy timer never queues for later',async()=>{
 const f=await setup();await schedule(f);await f.workspace.execute({op:'send',taskId:f.taskId,intentId:'SYNTHETIC-FIRST'});
 f.time(START+5000);await f.workspace.runDue();assert.equal(f.count(),1);assert.equal(f.workspace.status().schedules[0].status,'CANCELLED');
 const g=await setup();await schedule(g);g.workspace.engine.observeDevice({actorId:g.workspace.actorId,state:'BUSY'});g.time(START+5000);await g.workspace.runDue();
 g.workspace.engine.observeDevice({actorId:g.workspace.actorId,state:'IDLE'});await g.workspace.runDue();assert.equal(g.count(),0);assert.equal(g.workspace.status().schedules[0].status,'BLOCKED');
});
test('T-CALL-132 preflight delay beyond deadline creates no authorization',async()=>{
 const f=await setup();await schedule(f);f.time(START+5000);const verify=f.binding.verify.bind(f.binding);
 f.binding.verify=async()=>{const b=await verify();f.time(START+6001);return b;};
 await f.workspace.runDue();assert.equal(f.count(),0);assert.equal(f.workspace.status().metrics.G,0);assert.equal(f.workspace.status().schedules[0].reason,'SCHEDULE_EXPIRED');
});
test('T-CALL-133 claimed schedule and unknown handoff survive SQLite restart without replay',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dialer-schedule-crash-')),path=join(dir,'state.db');let store=new SQLiteStore(path);
 try{const f=await setup(store);await schedule(f);f.time(START+5000);
 f.workspace.engine.fault=p=>{if(p==='after-handoff-commit')throw Error('SIMULATED_CRASH');};await f.workspace.runDue();
 assert.equal(f.count(),0);assert.equal(f.workspace.status().snapshot.attempts[0].status,'HANDOFF_UNKNOWN');
 await f.workspace.close();store=new SQLiteStore(path);const reopened=new AndroidWorkspace({store,binding:f.binding,now:f.now});
 await reopened.runDue();assert.equal(f.count(),0);assert.equal(reopened.status().snapshot.attempts[0].status,'RECONCILE_REQUIRED');
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('T-CALL-134 timer runs independently of browser and close stops it',async()=>{
 const f=await setup();await schedule(f);f.workspace.startScheduler();f.time(START+5000);
 const end=Date.now()+3000;while(!f.count()&&Date.now()<end)await new Promise(r=>setTimeout(r,30));
 assert.equal(f.count(),1);await f.workspace.close();assert.equal(f.workspace.status().schedulerRunning,false);assert.equal((await f.workspace.runDue()).reason,'WORKSPACE_CLOSED');
});
