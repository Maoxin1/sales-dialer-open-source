import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAccess, checkEligibility } from '../src/eligibility.mjs';

const actor = { tenantId: 'SYNTHETIC-TENANT-A', actorId: 'SYNTHETIC-SALES-A', permissions: ['trigger'] };
const task = { tenantId: actor.tenantId, assignedSalesId: actor.actorId, targetKey: 'SYNTHETIC-TARGET-1' };
const contact = { tenantId: actor.tenantId, targetKey: task.targetKey, qualification: 'CONFIRMED', doNotContact: false };
const input = () => structuredClone({ actor, task, contact });
test('T-CALL-053 confirmed eligibility only continues remaining guards, pure and deterministic', () => {
  const data = input(); const before = structuredClone(data);
  assert.deepEqual(checkEligibility(data), { decision: 'CONTINUE', reason: 'ELIGIBILITY_OK' });
  assert.deepEqual(data, before);
  assert.deepEqual(checkEligibility(data), checkEligibility(data));
});
for (const state of ['UNKNOWN', 'INVALID', undefined, 'confirmed']) {
  test(`T-CALL-053 qualification ${state} never continues`, () => {
    const data = input(); data.contact.qualification = state;
    assert.deepEqual(checkEligibility(data), { decision: 'DENY', reason: 'QUALIFICATION_NOT_CONFIRMED' });
  });
}
test('T-CALL-054 refusal wins over confirmed qualification and malformed consent is closed', () => {
  for (const value of [true, undefined, null, 0, 'false']) {
    const data = input(); data.contact.doNotContact = value;
    assert.equal(checkEligibility(data).decision, 'DENY');
  }
  const data = input(); data.contact.doNotContact = true;
  assert.equal(checkEligibility(data).reason, 'DO_NOT_CONTACT');
});
for (const change of [d => { d.actor.tenantId = 'SYNTHETIC-TENANT-B'; }, d => { d.actor.permissions = []; },
  d => { d.task.assignedSalesId = 'SYNTHETIC-OTHER'; }, d => { d.contact.tenantId = 'SYNTHETIC-TENANT-B'; },
  d => { delete d.actor; }, d => { delete d.task; }, d => { delete d.contact; }]) {
  test('T-CALL-055 forbidden snapshots do not expose qualification/refusal details', () => {
    const data = input(); change(data);
    assert.deepEqual(checkEligibility(data), { decision: 'DENY', reason: 'FORBIDDEN' });
  });
}
test('T-CALL-055 capabilities checked individually; no role names are assumed', () => {
  for (const capability of ['import', 'assign', 'refuse', 'trigger', 'read']) {
    const a = { ...actor, permissions: [capability] };
    assert.equal(checkAccess(a, { tenantId: actor.tenantId, capability }).decision, 'CONTINUE');
    assert.equal(checkAccess({ ...a, permissions: [] }, { tenantId: actor.tenantId, capability }).reason, 'FORBIDDEN');
  }
});
test('T-CALL-054 mismatched target or absent snapshot is denied', () => {
  const data = input(); data.contact.targetKey = 'SYNTHETIC-OTHER';
  assert.equal(checkEligibility(data).decision, 'DENY');
  assert.equal(checkEligibility().reason, 'FORBIDDEN');
});
