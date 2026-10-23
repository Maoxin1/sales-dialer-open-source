import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, SALES, OTHER, TASK, TARGET, NOW, TENANT } from '../test-support/simulation-fixture.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';

test('T-CALL-086 completed task cannot bypass explicit retry through reassignment and replan',async()=>{
  const f=fixture();const g=f.engine.authorize(f.request());
  await f.engine.consume({actorId:SALES,attemptId:g.attemptId},new FakeDialAdapter({outcomes:['BUSY']}));
  assert.equal(f.engine.assign({actorId:SALES,taskId:TASK,assignedSalesId:SALES}).reason,'MANUAL_RETRY_REQUIRED');
  assert.equal(f.engine.retime({actorId:SALES,taskId:TASK,plannedAt:NOW}).reason,'MANUAL_RETRY_REQUIRED');
  assert.equal(f.store.read().tasks[TASK].status,'FINISHED');
});
test('T-CALL-087 non-manager snapshot does not expose other sellers contacts or task audit',()=>{
  const f=fixture();f.engine.importContacts({actorId:SALES,rows:[{raw:'SYNTHETIC-PRIVATE-TARGET',qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTATION'}]});
  f.engine.createTask({actorId:SALES,taskId:'SYNTHETIC-PRIVATE-TASK',targetKey:'SYNTHETIC-PRIVATE-TARGET',assignedSalesId:OTHER,plannedAt:NOW});
  f.store.transaction(s=>{s.actors[SALES].permissions=s.actors[SALES].permissions.filter(c=>c!=='read_all');});
  const snapshot=f.engine.snapshot({actorId:SALES});
  assert.ok(!snapshot.contacts.some(c=>c.targetKey==='SYNTHETIC-PRIVATE-TARGET'));
  assert.ok(!snapshot.events.some(e=>e.taskId==='SYNTHETIC-PRIVATE-TASK'));
});
test('T-CALL-088 unknown import fields are isolated instead of silently dropped',()=>{
  const f=fixture();const result=f.engine.importContacts({actorId:SALES,rows:[{raw:'SYNTHETIC-TARGET-EXTRA',qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTATION',extension:'SYNTHETIC-EXT'}]});
  assert.equal(result.rows[0].status,'UNSUPPORTED');assert.equal(Object.keys(f.store.read().contacts).length,1);
});
for(const change of ['refuse','time','busy','permission','version','policy']) {
  test(`T-CALL-089 latest ${change} at consumption prevents any adapter call`,async()=>{
    const f=fixture();const g=f.engine.authorize(f.request());const adapter=new FakeDialAdapter();
    if(change==='refuse')f.engine.refuse({actorId:SALES,targetKey:TARGET});
    if(change==='time')f.clock.set(NOW+9*3600000);
    if(change==='busy')f.engine.observeDevice({actorId:SALES,state:'BUSY'});
    if(change==='permission')f.store.transaction(s=>{s.actors[SALES].permissions=[];});
    if(change==='version')f.engine.retime({actorId:SALES,taskId:TASK,plannedAt:NOW+1000});
    if(change==='policy')f.store.transaction(s=>{s.policy.version++;});
    assert.equal((await f.engine.consume({actorId:SALES,attemptId:g.attemptId},adapter)).decision,'DENY');
    assert.equal(adapter.requests.length,0);
  });
}
