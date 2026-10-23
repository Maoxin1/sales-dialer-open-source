import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDialWindow } from '../src/dial-window.mjs';

const result = (decision, reason) => ({ decision, reason, timeZone: 'Asia/Shanghai' });
for (const [name, iso, expected] of [
  ['Shanghai late night', '2026-10-13T15:59:59.999Z', result('OUTSIDE_WINDOW', 'AFTER_WINDOW')],
  ['Shanghai next midnight', '2026-10-13T16:00:00.000Z', result('OUTSIDE_WINDOW', 'BEFORE_WINDOW')],
  ['next date same window', '2026-10-15T01:00:00.000Z', result('WINDOW_OK', 'WITHIN_WINDOW')],
]) {
  test(`[T-CALL-051] ${name}`, () => {
    assert.deepEqual(checkDialWindow({ atEpochMs: Date.parse(iso), trigger: 'scheduled' }), expected);
  });
}

for (const atEpochMs of [-8_640_000_000_000_000, 8_640_000_000_000_000]) {
  test(`[T-CALL-051] valid Date endpoint ${atEpochMs}`, () => {
    const actual = checkDialWindow({ atEpochMs, trigger: 'manual_now' });
    assert.equal(actual.timeZone, 'Asia/Shanghai');
    assert.ok(['WINDOW_OK', 'OUTSIDE_WINDOW'].includes(actual.decision), 'inclusive valid range must classify without throwing');
    assert.ok(actual.decision === 'WINDOW_OK' ? actual.reason === 'WITHIN_WINDOW'
      : ['BEFORE_WINDOW', 'AFTER_WINDOW'].includes(actual.reason));
  });
}
