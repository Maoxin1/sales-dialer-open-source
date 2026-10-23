import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, SALES, OTHER, TENANT, TARGET, TASK, NOW, policy } from '../test-support/simulation-fixture.mjs';

test('T-CALL-056 normal authorization is a single durable-shaped grant, never a phone request', () => {
  const {engine,store,request} = fixture(); const r = engine.authorize(request());
  assert.equal(r.decision, 'ALLOW');
  const s = store.read(); assert.equal(Object.keys(s.attempts).length, 1);
  assert.equal(s.attempts[r.attemptId].status, 'AUTHORIZED');
  assert.equal(s.attempts[r.attemptId].apiSubmission, null);
  assert.equal(s.events.filter(e => e.kind === 'AUTHORIZED').length, 1);
});
test('T-CALL-057 same cycle manual/timer and different intent deliveries authorize only once', async () => {
  const {engine,store,request} = fixture();
  const results = await Promise.all(Array.from({length: 20}, (_,i) => Promise.resolve().then(() => engine.authorize(request({intentId: `SYNTHETIC-I-${i}`, trigger: i % 2 ? 'manual_now' : 'scheduled'})))));
  assert.equal(results.filter(r => r.decision === 'ALLOW').length, 1);
  assert.equal(Object.keys(store.read().attempts).length, 1);
});
test('T-CALL-058 stale versions, future/late schedule and missing calendar policy fail closed', () => {
  for (const reason of ['STALE_PLAN', 'STALE_POLICY', 'NOT_DUE', 'EXPIRED', 'POLICY_GAP']) {
    const {engine,clock,store,request} = fixture(); let req = request();
    if (reason === 'STALE_PLAN') req.planVersion = 0;
    if (reason === 'STALE_POLICY') req.policyVersion = 0;
    if (reason === 'NOT_DUE') store.transaction(s => { s.tasks[TASK].plannedAt = NOW + 1000; });
    if (reason === 'EXPIRED') clock.advance(60001);
    if (reason === 'POLICY_GAP') store.transaction(s => { s.policy = null; });
    assert.equal(engine.authorize(req).reason, reason);
    assert.equal(Object.keys(store.read().attempts).length, 0);
  }
});
test('T-CALL-059 retime invalidates old plan; outside-window target is not accepted', () => {
  const {engine,request,clock} = fixture();
  assert.equal(engine.retime({actorId: SALES,taskId: TASK, plannedAt: NOW+3600000}).decision, 'OK');
  assert.equal(engine.authorize(request()).reason, 'STALE_PLAN');
  clock.advance(3600000);
  assert.equal(engine.authorize(request({planVersion:2})).decision, 'ALLOW');
  assert.equal(engine.retime({actorId: SALES,taskId: TASK, plannedAt: NOW+9*3600000}).decision, 'DENY');
});
test('T-CALL-060 pause cancels undelivered grant; resume never revives old callbacks', () => {
  const {engine,store,request} = fixture(); const grant = engine.authorize(request());
  assert.equal(engine.pause({actorId:SALES}).decision, 'OK');
  assert.equal(store.read().attempts[grant.attemptId]?.status, 'CANCELLED');
  assert.equal(engine.authorize(request({planVersion:2})).reason, 'PAUSED');
  assert.equal(engine.resume({actorId:SALES}).decision, 'OK');
  assert.equal(engine.authorize(request()).reason, 'STALE_PLAN');
  assert.equal(engine.authorize(request({planVersion:2})).reason, 'NEEDS_REPLAN');
});
test('T-CALL-061 seller occupancy is shared across tasks; busy or unknown device denies', () => {
  const {engine,request,store} = fixture();
  engine.createTask({actorId:SALES,taskId:'SYNTHETIC-TASK-2',targetKey:TARGET,assignedSalesId:SALES,plannedAt:NOW});
  assert.equal(engine.authorize(request()).decision, 'ALLOW');
  assert.equal(engine.authorize(request({taskId:'SYNTHETIC-TASK-2',intentId:'SYNTHETIC-INTENT-2'})).reason, 'SALES_BUSY');
  assert.equal(Object.keys(store.read().attempts).length, 1);
  for (const state of ['BUSY','UNKNOWN']) {
    const f = fixture(); f.engine.observeDevice({actorId:SALES,state});
    assert.equal(f.engine.authorize(f.request()).reason, 'DEVICE_NOT_IDLE');
  }
});
test('T-CALL-062 contact import deduplicates, preserves raw and refusal; unknown formats isolated', () => {
  const {engine,store,request} = fixture();
  assert.equal(engine.refuse({actorId:SALES,targetKey:TARGET}).decision, 'OK');
  const result = engine.importContacts({actorId:SALES,rows:[{raw:` ${TARGET.toLowerCase()} `,qualification:'CONFIRMED',source:'SYNTHETIC-REIMPORT'}, {raw:'not-a-number',qualification:'CONFIRMED'}, {raw:'',qualification:'CONFIRMED'}]});
  assert.deepEqual(result.rows.map(r=>r.status), ['DUPLICATE','UNSUPPORTED','INVALID']);
  assert.equal(Object.keys(store.read().contacts).length, 1);
  assert.equal(engine.authorize(request()).reason, 'DO_NOT_CONTACT');
  assert.equal(Object.values(store.read().contacts)[0].imports[1].raw, ` ${TARGET.toLowerCase()} `);
});
test('T-CALL-063 reassignment and revoked permissions are read from latest store snapshot', () => {
  const {engine,request,store} = fixture();
  assert.equal(engine.assign({actorId:SALES,taskId:TASK,assignedSalesId:OTHER}).decision,'OK');
  assert.equal(engine.authorize(request()).reason,'FORBIDDEN');
  store.transaction(s=>{s.actors[OTHER].permissions=[];});
  assert.equal(engine.authorize(request({actorId:OTHER,planVersion:2})).reason,'FORBIDDEN');
});
test('T-CALL-064 cross-tenant reads and mutations return identical forbidden shape', () => {
  const {engine,store,request} = fixture();
  store.transaction(s=>{s.actors['SYNTHETIC-FOREIGN']={actorId:'SYNTHETIC-FOREIGN',tenantId:'SYNTHETIC-TENANT-B',permissions:['trigger','read','assign','retime']};});
  const before=store.read();
  assert.deepEqual(engine.authorize(request({actorId:'SYNTHETIC-FOREIGN'})), {decision:'DENY',reason:'FORBIDDEN'});
  assert.deepEqual(engine.snapshot({actorId:'SYNTHETIC-FOREIGN',taskId:TASK}), {decision:'DENY',reason:'FORBIDDEN'});
  assert.deepEqual(engine.snapshot({actorId:'SYNTHETIC-FOREIGN',taskId:'SYNTHETIC-MISSING'}), {decision:'DENY',reason:'FORBIDDEN'});
  assert.deepEqual(store.read(),before);
});
test('T-CALL-065 denied qualification, refusal, time and real mode never create attempts', () => {
  for (const kind of ['UNKNOWN','INVALID','refuse','time','real','cancel']) {
    const {engine,request,clock,store}=fixture();
    if (['UNKNOWN','INVALID'].includes(kind)) engine.setQualification({actorId:SALES,targetKey:TARGET,qualification:kind,source:'SYNTHETIC-UPDATE'});
    if (kind==='refuse') engine.refuse({actorId:SALES,targetKey:TARGET});
    if (kind==='time') clock.set(NOW+9*3600000);
    if (kind==='cancel') engine.cancel({actorId:SALES,taskId:TASK});
    assert.equal(engine.authorize(request({trigger:'manual_now',mode:kind==='real'?'real':'simulation'})).decision,'DENY');
    assert.equal(Object.keys(store.read().attempts).length,0);
  }
});
