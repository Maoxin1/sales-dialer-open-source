import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, SALES, OTHER, TENANT, TARGET, TASK, NOW } from '../test-support/simulation-fixture.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
test('T-CALL-092 explicit capabilities deny import/assign/refuse/qualification changes and leave state intact',()=>{
  const f=fixture();f.store.transaction(s=>{s.actors[OTHER].permissions=[];});const before=f.store.read();
  for(const result of [f.engine.importContacts({actorId:OTHER,rows:[]}),f.engine.assign({actorId:OTHER,taskId:TASK,assignedSalesId:OTHER}),
    f.engine.refuse({actorId:OTHER,targetKey:TARGET}),f.engine.setQualification({actorId:OTHER,targetKey:TARGET,qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTATION'})])assert.equal(result.reason,'FORBIDDEN');
  assert.deepEqual(f.store.read(),before);
});
test('T-CALL-093 reimport conflicts preserve prior qualification and refusal blocks another assigned seller',()=>{
  const f=fixture();f.engine.setQualification({actorId:SALES,targetKey:TARGET,qualification:'INVALID',source:'SYNTHETIC-REVOKED'});
  const result=f.engine.importContacts({actorId:SALES,rows:[{raw:TARGET,qualification:'CONFIRMED',source:'SYNTHETIC-NEW-BATCH'}]});
  assert.equal(result.rows[0].status,'CONFLICT');assert.equal(Object.values(f.store.read().contacts)[0].qualification,'INVALID');
  f.engine.setQualification({actorId:SALES,targetKey:TARGET,qualification:'CONFIRMED',source:'SYNTHETIC-ENTERPRISE-UPDATE'});
  f.engine.refuse({actorId:SALES,targetKey:TARGET});
  f.engine.assign({actorId:SALES,taskId:TASK,assignedSalesId:OTHER});f.engine.retime({actorId:OTHER,taskId:TASK,plannedAt:NOW});f.engine.observeDevice({actorId:OTHER,state:'IDLE'});
  assert.equal(f.engine.authorize(f.request({actorId:OTHER,planVersion:3})).reason,'DO_NOT_CONTACT');
  assert.equal(Object.keys(f.store.read().attempts).length,0);
});
test('T-CALL-094 late response cannot reopen a manually reconciled unknown or overwrite the next cycle',async()=>{
  const f=fixture();const g=f.engine.authorize(f.request());let release;
  class Delayed extends FakeDialAdapter {async submit(grant){await super.submit(grant);return new Promise(resolve=>{release=()=>resolve({attemptId:grant.attemptId,status:'SUBMITTED',source:'SIMULATION'});});}}
  const adapter=new Delayed();const pending=f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter);
  await Promise.resolve();await Promise.resolve();
  f.engine.recover();f.engine.reconcile({actorId:SALES,attemptId:g.attemptId,noActiveCall:true,result:'UNKNOWN'});
  f.engine.retry({actorId:SALES,taskId:TASK,plannedAt:NOW});
  const next=f.engine.authorize(f.request({planVersion:2,intentId:'SYNTHETIC-NEXT'}));assert.equal(next.decision,'ALLOW');
  release();await pending;
  const s=f.store.read();assert.equal(s.attempts[g.attemptId].status,'FINISHED');assert.equal(s.attempts[g.attemptId].hadUnknown,true);
  assert.equal(s.tasks[TASK].status,'AUTHORIZED');assert.equal(s.attempts[next.attemptId].status,'AUTHORIZED');
});
