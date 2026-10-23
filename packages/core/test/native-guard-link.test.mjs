import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SQLiteStore} from '../src/sqlite-store.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixture,SALES,TENANT,TARGET,NOW } from '../test-support/simulation-fixture.mjs';
import { PhoneCapabilities } from '../src/phone-capabilities.mjs';
import { TrialBudget } from '../src/trial-budget.mjs';
import { ControlledTrial } from '../src/controlled-trial.mjs';
import { NativeGuardAdapter } from '../src/native-guard-adapter.mjs';
const digest=c=>createHash('sha256').update(JSON.stringify(c)).digest('hex');
const mapping={deviceKey:'a'.repeat(64),accountKey:'b'.repeat(64),deviceId:'SYNTHETIC-DEVICE',accountId:'SYNTHETIC-SIM'};
async function setup(change=r=>r, fault, store){
 const f=fixture({store}), budget=new TrialBudget({store:f.store,now:()=>f.clock.nowMs()});
 budget.register({roundId:'SYNTHETIC-ROUND',tenantId:TENANT,salesId:SALES,deviceId:mapping.deviceId,accountId:mapping.accountId,targets:[TARGET],notBefore:NOW,expiresAt:NOW+30000,maxAttempts:1,source:'SIMULATION_FIXTURE'});
 const phone=new PhoneCapabilities({now:()=>f.clock.nowMs(),read:async()=>({schemaVersion:1,source:'ANDROID_READ_ONLY',deviceKey:mapping.deviceKey,observedAt:f.clock.nowMs(),deviceObservedAt:f.clock.nowMs(),permissions:{callPhone:true,readPhoneState:true,readPhoneNumbers:true},accountsStatus:'KNOWN',accounts:[{key:mapping.accountKey,label:'Synthetic',enabled:true}],inCall:false,exactAlarm:true,backgroundRestricted:false,ignoringBatteryOptimizations:true,realCallsEnabled:false})});
 await phone.refresh();phone.select(mapping.accountKey);
 const sent=[];
 const guard=new NativeGuardAdapter({hostDeviceKey:mapping.deviceKey,deviceKey:'c'.repeat(64),accountKey:mapping.accountKey,now:()=>f.clock.nowMs(),transport:{send:async(c,ttl)=>{
   sent.push(c);const a=Object.values(f.store.read().attempts)[0];
   assert.equal(a.status,'HANDOFF_UNKNOWN');assert.equal(a.nativeGuardCommand.commandDigest,digest(c));
   assert.equal(a.nativeGuardCommand.link.trialTicketId,a.trialTicketId);assert.equal(ttl,30000);
   return change({source:'ANDROID_GUARD_DRY_RUN',commandDigest:digest(c),actualPhoneApiCalls:0,realCallsEnabled:false,status:'DRY_RUN_READY',duplicate:false,checksForRequest:1});
 }}});
 const config={store:f.store,clock:f.clock,phone,mapping,guard,fault};
 return {...f,budget,sent,guard,config,service:new ControlledTrial(config),req:()=>({...f.request(),roundId:'SYNTHETIC-ROUND'})};
}
test('T-CALL-196 durable business/ticket/digest link precedes native guard; ready is not submitted',async()=>{
 const f=await setup();const r=await f.service.submit(f.req()),a=f.store.read().attempts[r.attemptId];
 assert.equal(f.sent.length,1);assert.equal(a.nativeGuardReceipt.status,'DRY_RUN_READY');assert.equal(r.status,'RECONCILE_REQUIRED');assert.equal(a.apiSubmission,'UNKNOWN');assert.equal(f.budget.status().rounds[0].used,1);assert.equal(r.realCallsEnabled,false);
 assert.deepEqual(Object.keys(f.sent[0]).sort(),['schemaVersion','mode','requestId','deviceKey','accountKey'].sort());
});
for(const mode of ['lost','digest','calls','enabled','count','conflict'])test('T-CALL-197 '+mode+' never accepts false evidence or replays',async()=>{
 const f=await setup(r=>{if(mode==='lost')throw Error('LOST');return {...r,...({digest:{commandDigest:'f'.repeat(64)},calls:{actualPhoneApiCalls:1},enabled:{realCallsEnabled:true},count:{checksForRequest:2},conflict:{status:'REJECTED',reason:'REQUEST_CONFLICT'}}[mode])};});
 const r=await f.service.submit(f.req());assert.equal(f.sent.length,1);assert.equal(r.status,'RECONCILE_REQUIRED');assert.equal(f.store.read().attempts[r.attemptId].nativeGuardReceipt,undefined);
 const next=new ControlledTrial(f.config);next.recover();assert.equal((await next.submit(f.req())).decision,'DENY');assert.equal(f.sent.length,1);assert.equal(f.budget.status().tickets[0].state,'HELD_UNKNOWN');
});
test('T-CALL-198 competition submits one guard, never returns quota on manual closure',async()=>{
 const f=await setup();await Promise.all([f.service.submit(f.req()),f.service.submit({...f.req(),intentId:'SYNTHETIC-OTHER'})]);assert.equal(f.sent.length,1);
 const a=Object.values(f.store.read().attempts)[0];assert.equal(f.service.reconcile({actorId:SALES,attemptId:a.attemptId,result:'UNKNOWN',noActiveCall:true}).decision,'OK');assert.equal(f.budget.status().rounds[0].used,1);
});
test('T-CALL-199 pause at durable boundary blocks native guard',async()=>{
 let f;f=await setup(r=>r,()=>f.engine.pause({actorId:SALES}));assert.equal((await f.service.submit(f.req())).decision,'DENY');assert.equal(f.sent.length,0);
});

for(const kind of ['expiry','revoke','ticket','mapping'])test('T-CALL-199 durable '+kind+' changes block native handoff',async()=>{
 let f;f=await setup(r=>r,()=>{if(kind==='expiry')f.clock.advance(30000);else f.store.transaction(s=>{if(kind==='revoke')s.trialBudget.rounds[0].revoked=true;if(kind==='ticket')s.trialBudget.tickets[0].targetKey='SYNTHETIC-OTHER';if(kind==='mapping')Object.values(s.attempts)[0].guardMapping.accountKey='f'.repeat(64);});});
 assert.equal((await f.service.submit(f.req())).decision,'DENY');assert.equal(f.sent.length,0);assert.equal(f.budget.status().rounds[0].used,1);
});
test('T-CALL-200 changed envelope, foreign binding and expired command never reach transport',async()=>{
 const f=await setup();const r=await f.service.submit(f.req()),e=f.store.read().attempts[r.attemptId].nativeGuardCommand;
 for(const field of ['commandDigest','binding','link','command']){const changed=structuredClone(e);if(field==='commandDigest')changed[field]='f'.repeat(64);else changed[field].unexpected='SYNTHETIC-OTHER';await assert.rejects(f.guard.submit(changed));}
 f.clock.advance(30000);await assert.rejects(f.guard.submit(e));assert.equal(f.sent.length,1);
 assert.throws(()=>new ControlledTrial({...f.config,mapping:{...mapping,accountKey:'f'.repeat(64)}}),/GUARD_MAPPING_MISMATCH/);
});

test('T-CALL-201 lost native receipt survives SQLite reopen with digest/ticket and no replay',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'guard-link-'));let store=new SQLiteStore(join(dir,'trial.db'));
 try{
  const f=await setup(()=>{throw Error('AFTER_NATIVE_RECEIPT_LOST');},undefined,store),r=await f.service.submit(f.req());
  assert.equal(r.status,'RECONCILE_REQUIRED');const before=store.read().attempts[r.attemptId];
  store.close();store=new SQLiteStore(join(dir,'trial.db'));const next=new ControlledTrial({...f.config,store});next.recover();
  assert.deepEqual(store.read().attempts[r.attemptId].nativeGuardCommand,before.nativeGuardCommand);
  assert.equal((await next.submit(f.req())).decision,'DENY');assert.equal(f.sent.length,1);
  assert.equal(store.read().trialBudget.tickets[0].state,'HELD_UNKNOWN');assert.equal(store.read().trialBudget.rounds[0].used,1);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
