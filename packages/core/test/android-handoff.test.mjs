import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AndroidSandboxAdapter } from '../src/android-sandbox-adapter.mjs';
import { SimulationEngine } from '../src/simulation-engine.mjs';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { fixture,SALES,OTHER,TARGET,TASK } from '../test-support/simulation-fixture.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
const receipt=c=>({schemaVersion:1,mode:'simulation',source:'ANDROID_SIMULATION',attemptId:c.attemptId,
  commandDigest:digest(JSON.stringify(c)),deviceId:c.deviceId,status:'SIMULATED_ACCEPTED',actualPhoneApiCalls:0});
function adapter(send) {return new AndroidSandboxAdapter({deviceId:'SYNTHETIC-DEVICE-1',simId:'SYNTHETIC-SIM-1',transport:{send},now:()=>Date.parse('2026-10-14T01:00:00Z')});}
test('T-CALL-108 persisted task grant is bound to an Android synthetic command before transport',async()=>{
 const f=fixture(),g=f.engine.authorize(f.request());let sent;
 const a=adapter(async c=>{sent=c;const saved=f.store.read().attempts[g.attemptId];assert.equal(saved.status,'HANDOFF_UNKNOWN');assert.deepEqual(saved.androidCommand,c);return receipt(c);});
 const r=await f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a);
 assert.equal(r.apiSubmission,'SUBMITTED');assert.equal(sent.taskId,TASK);assert.equal(sent.planVersion,1);assert.equal(sent.qualificationRevision,1);assert.equal(sent.mode,'simulation');
 assert.equal(f.store.read().attempts[g.attemptId].androidReceipt.status,'SIMULATED_ACCEPTED');
 assert.equal(f.store.read().attempts[g.attemptId].observations.length,0);
});
test('T-CALL-109 concurrent consumption sends only once and holds seller occupancy',async()=>{
 const f=fixture(),g=f.engine.authorize(f.request());let count=0,release;
 const a=adapter(c=>{count++;return new Promise(resolve=>{release=()=>resolve(receipt(c));});});
 const first=f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a);
 assert.equal((await f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a)).reason,'ALREADY_CONSUMED');
 release();await first;assert.equal(count,1);assert.equal(f.store.read().attempts[g.attemptId].status,'SUBMITTED');
});
for(const change of ['refuse','pause','retime','other'])test(`T-CALL-110 ${change} prevents any Android transport`,async()=>{
 const f=fixture(),g=f.engine.authorize(f.request());let count=0;
 if(change==='refuse')f.engine.refuse({actorId:SALES,targetKey:TARGET});
 if(change==='pause')f.engine.pause({actorId:SALES});
 if(change==='retime')f.engine.retime({actorId:SALES,taskId:TASK,plannedAt:f.clock.nowMs()+1000});
 const r=await f.engine.consumeAndroid({actorId:change==='other'?OTHER:SALES,attemptId:g.attemptId},adapter(async c=>{count++;return receipt(c);}));
 assert.equal(r.decision,'DENY');assert.equal(count,0);
});
for(const fault of ['lost','wrong-digest','wrong-attempt','real-source','claimed-phone-call'])test(`T-CALL-111 ${fault} receipt requires reconciliation without replay`,async()=>{
 const f=fixture(),g=f.engine.authorize(f.request());let count=0;
 const a=adapter(async c=>{count++;if(fault==='lost')throw Error('LOST');const r=receipt(c);
 if(fault==='wrong-digest')r.commandDigest='0'.repeat(64);if(fault==='wrong-attempt')r.attemptId='SYNTHETIC-OTHER';if(fault==='real-source')r.source='PHONE';if(fault==='claimed-phone-call')r.actualPhoneApiCalls=1;return r;});
 assert.equal((await f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a)).status,'RECONCILE_REQUIRED');
 assert.equal((await f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a)).reason,'ALREADY_CONSUMED');assert.equal(count,1);
});
test('T-CALL-112 crash after persisted handoff survives SQLite reopen without resending',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'dialer-android-'));const path=join(dir,'state.db');let store=new SQLiteStore(path);
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const f=fixture({store,engineOptions:{fault:p=>{if(p==='after-handoff-commit')throw Error('CRASH');}}});const g=f.engine.authorize(f.request());let count=0;
 const a=adapter(async c=>{count++;return receipt(c);});await assert.rejects(f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a),/CRASH/);
 store.close();store=new SQLiteStore(path);const e=new SimulationEngine({store,clock:f.clock});e.recover();
 assert.equal((await e.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a)).reason,'ALREADY_CONSUMED');assert.equal(count,0);assert.ok(store.read().attempts[g.attemptId].androidCommand);
});
test('T-CALL-113 adapter refuses real targets, mode changes, extra fields and expired commands before transport',async()=>{
 const f=fixture(),g=f.engine.authorize(f.request());let wire,count=0;const a=adapter(async c=>{wire=c;return receipt(c);});
 await f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},a);
 const guarded=adapter(async c=>{count++;return receipt(c);});
 for(const bad of [{...wire,mode:'real'},{...wire,targetKey:'13000000000'},{...wire,phone:'13000000000'},{...wire,expiresAt:wire.issuedAt}])await assert.rejects(guarded.submit(bad));
 assert.equal(count,0);
});
test('T-CALL-113 actual expiry and device/SIM mismatch reject before sending',async()=>{
 const f=fixture(),g=f.engine.authorize(f.request());let wire,count=0;
 await f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},adapter(async c=>{wire=c;return receipt(c);}));
 const late=new AndroidSandboxAdapter({deviceId:wire.deviceId,simId:wire.simId,transport:{send:async()=>{count++;}},now:()=>wire.expiresAt});
 await assert.rejects(late.submit(wire),/EXPIRED/);
 await assert.rejects(adapter(async()=>{count++;}).submit({...wire,deviceId:'SYNTHETIC-OTHER'}),/BINDING/);
 await assert.rejects(adapter(async()=>{count++;}).submit({...wire,simId:'SYNTHETIC-OTHER'}),/BINDING/);
 assert.equal(count,0);
});
test('T-CALL-108 current confirmed qualification revision is bound at consumption',async()=>{
 const f=fixture(),g=f.engine.authorize(f.request());
 f.engine.setQualification({actorId:SALES,targetKey:TARGET,qualification:'CONFIRMED',source:'SYNTHETIC-NEW-ATTESTATION'});
 await f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},adapter(async c=>{assert.equal(c.qualificationRevision,2);return receipt(c);}));
 assert.equal(f.store.read().attempts[g.attemptId].qualificationRevision,1);
});
test('T-CALL-112 handoff commit failure rolls back command and never sends',async()=>{
 const f=fixture({engineOptions:{fault:p=>{if(p==='before-handoff-commit')throw Error('SAVE_FAILED');}}});
 const g=f.engine.authorize(f.request());let sent=0;
 await assert.rejects(f.engine.consumeAndroid({actorId:SALES,attemptId:g.attemptId},adapter(async c=>{sent++;return receipt(c);})),/SAVE_FAILED/);
 assert.equal(sent,0);assert.equal(f.store.read().attempts[g.attemptId].status,'AUTHORIZED');assert.equal(f.store.read().attempts[g.attemptId].androidCommand,undefined);
});
