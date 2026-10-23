import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, SALES, OTHER, TENANT, TARGET, NOW } from '../test-support/simulation-fixture.mjs';
import { key } from '../src/simulation-engine.mjs';
const permissions=['read','import','assign_self','trigger','retime','refuse','qualify','pause','reconcile','observe'];
function ownFixture(){const f=fixture();f.store.transaction(s=>{s.actors[SALES].permissions=permissions;s.actors[OTHER].permissions=permissions;});return f;}
test('T-CALL-098 seller creates own imported task but cannot assign to another seller',()=>{
  const f=ownFixture();
  assert.equal(f.engine.createTask({actorId:SALES,taskId:'SYNTHETIC-OWN-TASK',targetKey:TARGET,assignedSalesId:SALES,plannedAt:NOW}).decision,'OK');
  assert.equal(f.engine.createTask({actorId:SALES,taskId:'SYNTHETIC-OTHER-TASK',targetKey:TARGET,assignedSalesId:OTHER,plannedAt:NOW}).reason,'FORBIDDEN');
  assert.equal(f.engine.assign({actorId:SALES,taskId:'SYNTHETIC-OWN-TASK',assignedSalesId:OTHER}).reason,'FORBIDDEN');
});
test('T-CALL-099 imported contacts are visible before task creation; other sales import history stays private',()=>{
  const f=ownFixture();const targetKey='SYNTHETIC-UNASSIGNED';
  f.engine.importContacts({actorId:SALES,rows:[{raw:targetKey,qualification:'CONFIRMED',source:'SYNTHETIC-OWN-SOURCE'}]});
  f.engine.importContacts({actorId:OTHER,rows:[{raw:targetKey,qualification:'CONFIRMED',source:'SYNTHETIC-OTHER-SOURCE'}]});
  const c=f.engine.snapshot({actorId:SALES}).contacts.find(x=>x.targetKey===targetKey);
  assert.ok(c,'own imported contact must appear without a task');assert.equal(c.imports.length,1);assert.equal(c.imports[0].actorId,SALES);
  assert.equal(f.store.read().contacts[key(TENANT,targetKey)].imports.length,2,'history preserved in authority');
});
test('T-CALL-100 seller cannot read, change qualification or refuse another private contact; shared refusal survives import',()=>{
  const f=ownFixture();const targetKey='SYNTHETIC-OTHER-CONTACT';
  f.engine.importContacts({actorId:OTHER,rows:[{raw:targetKey,qualification:'CONFIRMED',source:'SYNTHETIC-OTHER-SOURCE'}]});
  assert.equal(f.engine.snapshot({actorId:SALES}).contacts.some(c=>c.targetKey===targetKey),false);
  assert.equal(f.engine.refuse({actorId:SALES,targetKey}).reason,'FORBIDDEN');
  assert.equal(f.engine.setQualification({actorId:SALES,targetKey,qualification:'INVALID',source:'SYNTHETIC-OWN-SOURCE'}).reason,'FORBIDDEN');
  assert.equal(f.engine.createTask({actorId:SALES,taskId:'SYNTHETIC-OTHER-TASK',targetKey,assignedSalesId:SALES,plannedAt:NOW}).reason,'FORBIDDEN');
  assert.equal(f.engine.refuse({actorId:OTHER,targetKey}).decision,'OK');
  f.engine.importContacts({actorId:SALES,rows:[{raw:targetKey,qualification:'CONFIRMED',source:'SYNTHETIC-OWN-SOURCE'}]});
  assert.equal(f.engine.snapshot({actorId:SALES}).contacts.find(c=>c.targetKey===targetKey).doNotContact,true);
});
