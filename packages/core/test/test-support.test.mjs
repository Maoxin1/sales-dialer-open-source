import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeClock } from '../test-support/fake-clock.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';

const grant = (suffix = '001') => ({
  mode: 'simulation', attemptId: `SYNTHETIC-ATTEMPT-${suffix}`,
  intentId: `SYNTHETIC-INTENT-${suffix}`, salesId: 'SYNTHETIC-SALES-A',
  targetKey: 'SYNTHETIC-TARGET-A',
});

test('[T-CALL-008] substitute records submitted, definite failure, lost receipt and busy', async () => {
  const outcomes = ['SUBMITTED', 'DEFINITELY_NOT_SUBMITTED', 'UNKNOWN', 'BUSY'];
  const adapter = new FakeDialAdapter({ outcomes });
  for (const [i, status] of outcomes.entries()) {
    const input = grant(String(i));
    assert.deepEqual(await adapter.submit(input), {
      attemptId: input.attemptId, status, source: 'SIMULATION',
    });
  }
  assert.equal(adapter.requests.length, 4);
  assert.deepEqual(adapter.requests.map(row => row.simulatedSystemAccepted), [true, false, true, false]);
  assert.deepEqual(adapter.requests.map(row => row.sequence), [1, 2, 3, 4]);
});

test('[T-CALL-008] substitute preserves every repeated request, no fake dedup', async () => {
  const adapter = new FakeDialAdapter();
  const input = Object.freeze(grant());
  await adapter.submit(input);
  await adapter.submit(input);
  assert.equal(adapter.requests.length, 2);
  const copy = adapter.requests;
  copy[0].targetKey = 'MUTATED';
  assert.equal(adapter.requests[0].targetKey, 'SYNTHETIC-TARGET-A');
  assert.equal(input.targetKey, 'SYNTHETIC-TARGET-A');
});

for (const [name, mutate] of [
  ['real mode', value => ({ ...value, mode: 'real' })],
  ['missing mode', ({ mode, ...value }) => value],
  ['non-synthetic target', value => ({ ...value, targetKey: 'REAL-TARGET' })],
  ['phone field', value => ({ ...value, phoneNumber: 'DISALLOWED' })],
  ['transport callback', value => ({ ...value, transport: () => { throw new Error('MUST_NOT_RUN'); } })],
]) {
  test(`[T-CALL-009] substitute rejects ${name} before recording`, async () => {
    const adapter = new FakeDialAdapter();
    await assert.rejects(adapter.submit(mutate(grant())), /SYNTHETIC_SIMULATION_ONLY/);
    assert.deepEqual(adapter.requests, []);
  });
}
test('[T-CALL-009] unsupported simulation outcome cannot become a transport', () => {
  assert.throws(() => new FakeDialAdapter({ outcomes: ['REAL_CALL'] }), /FAKE_DIAL_INVALID_OUTCOME/);
});

test('[T-CALL-010] clock supports deterministic UTC set and millisecond advance', () => {
  const initial = Date.parse('2026-10-14T00:59:59.999Z');
  const clock = new FakeClock(initial);
  assert.equal(clock.nowMs(), initial);
  assert.equal(clock.advance(1), Date.parse('2026-10-14T01:00:00.000Z'));
  assert.equal(clock.set(0), 0);
  assert.equal(clock.advance(-1), -1);
});
test('[T-CALL-010] invalid clock values do not change stored time', () => {
  const clock = new FakeClock(123);
  for (const value of [NaN, Infinity, 1.5, '123', null, 8_640_000_000_000_001]) {
    assert.throws(() => clock.set(value), /FAKE_CLOCK_INVALID_TIME/);
    assert.equal(clock.nowMs(), 123);
  }
  assert.throws(() => clock.advance(0.5), /FAKE_CLOCK_INVALID_DELTA/);
  assert.equal(clock.nowMs(), 123);
});
test('[T-CALL-010] clock validates constructor and overflow', () => {
  assert.throws(() => new FakeClock(undefined), /FAKE_CLOCK_INVALID_TIME/);
  const clock = new FakeClock(8_640_000_000_000_000);
  assert.throws(() => clock.advance(1), /FAKE_CLOCK_INVALID_TIME/);
  assert.equal(clock.nowMs(), 8_640_000_000_000_000);
});
