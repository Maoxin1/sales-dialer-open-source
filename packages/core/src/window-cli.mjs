import { checkDialWindow } from './dial-window.mjs';

// Classification only. No scheduler, storage, phone adapter or system clock.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: node packages/core/src/window-cli.mjs <UTC-epoch-ms> <scheduled|manual_now|manual_reschedule>');
  console.log('Classifies the Shanghai [09:00,18:00) window only; does not authorize or dial.');
} else if (args.length !== 2) {
  console.log(JSON.stringify({ error: 'EXPECTED_EPOCH_MS_AND_TRIGGER' }));
  process.exitCode = 2;
} else {
  const atEpochMs = /^[+-]?\d+$/.test(args[0]) ? Number(args[0]) : NaN;
  const outcome = checkDialWindow({ atEpochMs, trigger: args[1] });
  console.log(JSON.stringify(outcome));
  process.exitCode = outcome.decision === 'INVALID_INPUT' ? 2 : 0;
}
