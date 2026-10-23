import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/simulation-engine.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { fixture, SALES, TASK, TARGET, NOW } from '../test-support/simulation-fixture.mjs';

test('T-CALL-076 two targets, three attempts, two submissions, one confirmed outgoing, zero connected stay separate',async()=>{
  const f=fixture();const adapter=new FakeDialAdapter({outcomes:['SUBMITTED','SUBMITTED','UNKNOWN']});
  const first=f.engine.authorize(f.request());await f.engine.consume({actorId:SALES,attemptId:first.attemptId},adapter);
  const event={actorId:SALES,eventId:'SYNTHETIC-E-1',attemptId:first.attemptId,binding:'MATCHED',kind:'OUTGOING_CONFIRMED',source:'SIMULATED_DEVICE'};
  assert.equal(f.engine.observe(event).decision,'OK');assert.equal(f.engine.observe(event).reason,'DUPLICATE_EVENT');
  f.engine.reconcile({actorId:SALES,attemptId:first.attemptId,noActiveCall:true,result:'NO_ANSWER'});
  f.engine.retry({actorId:SALES,taskId:TASK,plannedAt:NOW});
  const second=f.engine.authorize(f.request({planVersion:2,intentId:'SYNTHETIC-I-2',trigger:'manual_now'}));
  await f.engine.consume({actorId:SALES,attemptId:second.attemptId},adapter);
  f.engine.reconcile({actorId:SALES,attemptId:second.attemptId,noActiveCall:true,result:'COMPLETED'});
  f.engine.importContacts({actorId:SALES,rows:[{raw:'SYNTHETIC-TARGET-2',qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTED'}]});
  f.engine.createTask({actorId:SALES,taskId:'SYNTHETIC-TASK-2',targetKey:'SYNTHETIC-TARGET-2',assignedSalesId:SALES,plannedAt:NOW});
  const third=f.engine.authorize(f.request({taskId:'SYNTHETIC-TASK-2',intentId:'SYNTHETIC-I-3'}));await f.engine.consume({actorId:SALES,attemptId:third.attemptId},adapter);
  const m=f.engine.metrics({actorId:SALES});
  assert.deepEqual([m.U,m.G,m.Q,m.O,m.C,m.unknownPending,m.everUnknown],[2,3,2,1,0,1,1]);
  assert.equal(m.source,'SIMULATION');
});
test('T-CALL-077 OFFHOOK, open success, IDLE, unbound CXCall and manual result never prove connection',async()=>{
  const f=fixture(),adapter=new FakeDialAdapter({outcomes:['UNKNOWN']});
  const g=f.engine.authorize(f.request());await f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter);
  for(const [i,kind] of ['OFFHOOK','OPEN_SUCCESS','IDLE','CX_CALL','CONNECTED_CONFIRMED'].entries()) {
    assert.equal(f.engine.observe({actorId:SALES,eventId:`SYNTHETIC-E-${i}`,kind,binding:'UNBOUND',source:'SIMULATED_OBSERVATION'}).decision,'OK');
  }
  f.engine.reconcile({actorId:SALES,attemptId:g.attemptId,noActiveCall:true,result:'COMPLETED'});
  const m=f.engine.metrics({actorId:SALES});assert.deepEqual([m.Q,m.O,m.C,m.everUnknown],[0,0,0,1]);
});
test('T-CALL-078 event identity conflicts reject, confirmed connection requires bound synthetic evidence',async()=>{
  const f=fixture();const g=f.engine.authorize(f.request());await f.engine.consume({actorId:SALES,attemptId:g.attemptId},new FakeDialAdapter());
  const e={actorId:SALES,eventId:'SYNTHETIC-E-1',attemptId:g.attemptId,kind:'CONNECTED_CONFIRMED',binding:'MATCHED',source:'SIMULATED_DEVICE'};
  assert.equal(f.engine.observe(e).decision,'OK');
  assert.equal(f.engine.observe({...e,kind:'OUTGOING_CONFIRMED'}).reason,'EVENT_ID_CONFLICT');
  assert.equal(f.engine.metrics({actorId:SALES}).C,1);
  assert.equal(f.engine.observe({...e,eventId:'SYNTHETIC-E-2',source:'REAL_DEVICE'}).decision,'DENY');
});
test('T-CALL-079 terminal failures do not create retry intents; only explicit manual retry permits a new cycle',async()=>{
  for(const outcome of ['BUSY','DEFINITELY_NOT_SUBMITTED']) {
    const f=fixture(),adapter=new FakeDialAdapter({outcomes:[outcome]});const g=f.engine.authorize(f.request());
    await f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter);
    assert.equal(f.store.read().tasks[TASK].status,'FINISHED');
    assert.equal(f.engine.authorize(f.request({intentId:'SYNTHETIC-NEW-DELIVERY'})).decision,'DENY');
    assert.equal(f.engine.metrics({actorId:SALES}).G,1);assert.equal(adapter.requests.length,1);
    assert.equal(f.engine.retry({actorId:SALES,taskId:TASK,plannedAt:NOW}).decision,'OK');
    assert.equal(f.engine.authorize(f.request({planVersion:2,intentId:'SYNTHETIC-EXPLICIT-RETRY',trigger:'manual_now'})).decision,'ALLOW');
  }
});
test('T-CALL-080 real gateway and arbitrary transport are unavailable',async()=>{
  const f=fixture();assert.throws(()=>new SimulationEngine({store:f.store,clock:f.clock,mode:'real'}),/REAL_ADAPTER_UNAVAILABLE/);
  const g=f.engine.authorize(f.request());let requests=0;
  assert.equal((await f.engine.consume({actorId:SALES,attemptId:g.attemptId},{submit:()=>{requests++;}})).reason,'REAL_ADAPTER_UNAVAILABLE');
  assert.equal(requests,0);assert.equal(f.store.read().attempts[g.attemptId].status,'AUTHORIZED');
});
