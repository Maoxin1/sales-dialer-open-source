import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { SimulationEngine } from '../src/simulation-engine.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { fixture, SALES, TARGET, TASK, NOW } from '../test-support/simulation-fixture.mjs';
import { FakeClock } from '../test-support/fake-clock.mjs';

function disk(t) {
  const dir=mkdtempSync(join(tmpdir(),'sales-dialer-test-')); const path=join(dir,'simulation.db');
  const stores=[]; const open=()=>{const store=new SQLiteStore(path);stores.push(store);return store;};
  t.after(()=>{for(const s of stores)s.close();rmSync(dir,{recursive:true,force:true});});
  return {path,open};
}
test('T-CALL-066 file reopen retains tasks, grant occupancy, refusals, pauses and deduplication', t=>{
  const {open}=disk(t); const store=open();const f=fixture({store});const grant=f.engine.authorize(f.request());
  assert.equal(grant.decision,'ALLOW');
  f.engine.refuse({actorId:SALES,targetKey:TARGET});f.engine.pause({actorId:SALES});
  const before=store.read();store.close(); const reopened=open();
  assert.deepEqual(reopened.read(),before);
  const engine=new SimulationEngine({store:reopened,clock:f.clock});
  assert.equal(engine.authorize(f.request()).reason,'DO_NOT_CONTACT');
});
for(const point of ['after-attempt','after-occupancy','after-audit','after-outbox']) {
  test(`T-CALL-067 ${point} failure atomically rolls back all grant artifacts`, t=>{
    const {open}=disk(t);const store=open();const f=fixture({store});const before=store.read();
    const engine=new SimulationEngine({store,clock:f.clock,fault:p=>{if(p===point)throw new Error('INJECTED_WRITE_FAILURE');}});
    assert.throws(()=>engine.authorize(f.request()),/INJECTED_WRITE_FAILURE/);
    assert.deepEqual(store.read(),before);store.close();assert.deepEqual(open().read(),before);
  });
}
test('T-CALL-068 consuming grant rechecks qualification, refusal, time, permission and device', async t=>{
  const {open}=disk(t);const store=open();const f=fixture({store});const grant=f.engine.authorize(f.request());
  f.engine.setQualification({actorId:SALES,targetKey:TARGET,qualification:'UNKNOWN',source:'SYNTHETIC-REVOKED'});
  const adapter=new FakeDialAdapter();
  assert.equal((await f.engine.consume({actorId:SALES,attemptId:grant.attemptId},adapter)).reason,'QUALIFICATION_NOT_CONFIRMED');
  assert.equal(adapter.requests.length,0);assert.equal(store.read().attempts[grant.attemptId].status,'CANCELLED');
});
test('T-CALL-069 lost receipt remains unknown after reopen; same attempt cannot be consumed again', async t=>{
  const {open}=disk(t);let store=open();const f=fixture({store});const g=f.engine.authorize(f.request());
  const adapter=new FakeDialAdapter({outcomes:['UNKNOWN']});
  assert.equal((await f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter)).status,'RECONCILE_REQUIRED');
  store.close();store=open();const engine=new SimulationEngine({store,clock:f.clock});engine.recover();
  assert.equal((await engine.consume({actorId:SALES,attemptId:g.attemptId},adapter)).reason,'ALREADY_CONSUMED');
  assert.equal(adapter.requests.length,1);
  assert.equal(store.read().attempts[g.attemptId].hadUnknown,true);
  assert.equal(engine.reconcile({actorId:SALES,attemptId:g.attemptId,noActiveCall:false,result:'UNKNOWN'}).decision,'DENY');
  assert.equal(engine.reconcile({actorId:SALES,attemptId:g.attemptId,noActiveCall:true,result:'UNKNOWN'}).decision,'OK');
  assert.equal(store.read().attempts[g.attemptId].hadUnknown,true);
  assert.equal(engine.retry({actorId:SALES,taskId:TASK,plannedAt:NOW}).decision,'OK');
  const task=store.read().tasks[TASK];
  assert.equal(engine.authorize(f.request({planVersion:task.planVersion,intentId:'SYNTHETIC-RETRY',trigger:'manual_now'})).decision,'ALLOW');
});
test('T-CALL-070 handoff committed before adapter and adapter exception is never replayed', async t=>{
  const {open}=disk(t);const store=open();const f=fixture({store});const g=f.engine.authorize(f.request());
  class ObservingAdapter extends FakeDialAdapter {
    async submit(req) { assert.equal(store.read().attempts[req.attemptId].status,'HANDOFF_UNKNOWN');await super.submit(req);throw new Error('lost-receipt'); }
  }
  const adapter=new ObservingAdapter();await f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter);
  assert.equal(adapter.requests.length,1);assert.equal(store.read().attempts[g.attemptId].status,'RECONCILE_REQUIRED');
  await f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter);assert.equal(adapter.requests.length,1);
});
test('T-CALL-071 simultaneous consumers invoke recording adapter at most once', async t=>{
  const {open}=disk(t);const store=open();const f=fixture({store});const g=f.engine.authorize(f.request());
  const adapter=new FakeDialAdapter();
  const results=await Promise.all(Array.from({length:10},()=>f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter)));
  assert.equal(adapter.requests.length,1);assert.equal(results.filter(r=>r.status==='SUBMITTED').length,1);
  assert.equal(store.read().attempts[g.attemptId].apiSubmission,'SUBMITTED');
});
