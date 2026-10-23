import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/window-cli.mjs', import.meta.url));
const outcome = (decision, reason) => ({ decision, reason, timeZone: 'Asia/Shanghai' });
for (const [name, args, exitCode, expected] of [
  ['09:00 classification', ['1791939600000', 'scheduled'], 0, outcome('WINDOW_OK', 'WITHIN_WINDOW')],
  ['18:00 classification', ['1791972000000', 'manual_now'], 0, outcome('OUTSIDE_WINDOW', 'AFTER_WINDOW')],
  ['invalid time', ['not-a-time', 'scheduled'], 2, outcome('INVALID_INPUT', 'INVALID_TIME')],
  ['invalid trigger', ['1791939600000', 'unknown'], 2, outcome('INVALID_INPUT', 'INVALID_TRIGGER')],
  ['missing arguments', [], 2, { error: 'EXPECTED_EPOCH_MS_AND_TRIGGER' }],
]) {
  test(`[T-CALL-052] CLI ${name}`, () => {
    const child = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 10_000 });
    assert.equal(child.error, undefined);
    assert.equal(child.status, exitCode, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), expected);
  });
}
test('[T-CALL-052] CLI help describes classification boundary', () => {
  const child = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /UTC-epoch-ms/);
  assert.match(child.stdout, /does not authorize or dial/);
});
