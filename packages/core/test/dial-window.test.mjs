import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { checkDialWindow } from '../src/dial-window.mjs';
import { FakeClock } from '../test-support/fake-clock.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';

const epoch = value => Date.parse(value);
const result = (decision, reason) => ({ decision, reason, timeZone: 'Asia/Shanghai' });
const boundaries = [
  ['08:59:59.999', '2026-10-14T00:59:59.999Z', 'OUTSIDE_WINDOW', 'BEFORE_WINDOW'],
  ['09:00', '2026-10-14T01:00:00.000Z', 'WINDOW_OK', 'WITHIN_WINDOW'],
  ['17:59:59.999', '2026-10-14T09:59:59.999Z', 'WINDOW_OK', 'WITHIN_WINDOW'],
  ['18:00', '2026-10-14T10:00:00.000Z', 'OUTSIDE_WINDOW', 'AFTER_WINDOW'],
];

for (const [local, utc, decision, reason] of boundaries) {
  test(`[T-CALL-001] scheduled boundary ${local}`, () => {
    assert.deepEqual(checkDialWindow({ atEpochMs: epoch(utc), trigger: 'scheduled' }),
      result(decision, reason));
  });
}

for (const trigger of ['manual_now', 'manual_reschedule']) {
  for (const [local, utc, decision, reason] of boundaries) {
    test(`[T-CALL-002] ${trigger} boundary ${local}`, () => {
      assert.deepEqual(checkDialWindow({ atEpochMs: epoch(utc), trigger }), result(decision, reason));
    });
  }
}

const invalidTimes = [
  ['missing', undefined], ['null', null], ['NaN', NaN], ['Infinity', Infinity],
  ['negative Infinity', -Infinity], ['fraction', epoch('2026-10-14T01:00Z') + 0.5],
  ['numeric string', '1791939600000'], ['boolean', true], ['object', {}], ['array', []],
  ['Date object', new Date('2026-10-14T01:00Z')], ['BigInt', 1n], ['symbol', Symbol('time')],
  ['above Date max', 8_640_000_000_000_001], ['below Date min', -8_640_000_000_000_001],
];
for (const [name, atEpochMs] of invalidTimes) {
  test(`[T-CALL-003] invalid time ${name}`, () => {
    assert.deepEqual(checkDialWindow({ atEpochMs, trigger: 'scheduled' }),
      result('INVALID_INPUT', 'INVALID_TIME'));
  });
}
for (const [name, input] of [['no argument', undefined], ['null input', null]]) {
  test(`[T-CALL-003] ${name}`, () => {
    assert.deepEqual(checkDialWindow(input), result('INVALID_INPUT', 'INVALID_TIME'));
  });
}

for (const [name, trigger] of [['missing', undefined], ['null', null], ['unknown', 'manual'],
  ['empty', ''], ['wrong case', 'SCHEDULED'], ['numeric', 1]]) {
  test(`[T-CALL-004] invalid trigger ${name}`, () => {
    assert.deepEqual(checkDialWindow({ atEpochMs: epoch('2026-10-14T01:00Z'), trigger }),
      result('INVALID_INPUT', 'INVALID_TRIGGER'));
  });
}
test('[T-CALL-004] invalid time wins when both inputs are invalid', () => {
  assert.deepEqual(checkDialWindow({ atEpochMs: NaN, trigger: 'unknown' }),
    result('INVALID_INPUT', 'INVALID_TIME'));
});

const moduleUrl = new URL('../src/dial-window.mjs', import.meta.url).href;
for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
  test(`[T-CALL-005] explicit Shanghai window with host timezone ${tz}`, () => {
    const script = `import { checkDialWindow } from ${JSON.stringify(moduleUrl)};
      console.log(JSON.stringify(checkDialWindow({atEpochMs:Date.parse('2026-10-14T01:00Z'),trigger:'scheduled'})));`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, TZ: tz }, encoding: 'utf8', timeout: 10_000,
    });
    assert.equal(child.error, undefined, 'test entry must start');
    assert.equal(child.status, 0, `test entry must load: ${child.stderr}`);
    assert.deepEqual(JSON.parse(child.stdout), result('WINDOW_OK', 'WITHIN_WINDOW'));
  });
}

for (const [label, initial, advance, expected] of [
  ['opens at 09:00', '2026-10-14T00:59:59.999Z', 1, result('WINDOW_OK', 'WITHIN_WINDOW')],
  ['closes at 18:00', '2026-10-14T09:59:59.999Z', 1, result('OUTSIDE_WINDOW', 'AFTER_WINDOW')],
]) {
  test(`[T-CALL-006] injected clock ${label}`, () => {
    const clock = new FakeClock(epoch(initial));
    clock.advance(advance);
    assert.deepEqual(checkDialWindow({ atEpochMs: clock.nowMs(), trigger: 'manual_now' }), expected);
  });
}

test('[T-CALL-007] window check leaves input and phone substitute untouched', () => {
  const input = Object.freeze({ atEpochMs: epoch('2026-10-14T01:00Z'), trigger: 'scheduled' });
  const before = { ...input };
  const adapter = new FakeDialAdapter();
  const first = checkDialWindow(input);
  assert.deepEqual(input, before);
  assert.deepEqual(checkDialWindow(input), first);
  assert.deepEqual(adapter.requests, []);
  assert.deepEqual(Object.keys(first).sort(), ['decision', 'reason', 'timeZone']);
});

test('[T-CALL-007] pure rule does not read Date.now', () => {
  const script = `import assert from 'node:assert/strict';
    import { checkDialWindow } from ${JSON.stringify(moduleUrl)};
    Date.now=()=>{throw new Error('SYSTEM_CLOCK_READ_FORBIDDEN');};
    assert.doesNotThrow(()=>checkDialWindow({atEpochMs:1791939600000,trigger:'scheduled'}));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
});
