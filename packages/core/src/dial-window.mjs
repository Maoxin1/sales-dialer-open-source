const TIME_ZONE = 'Asia/Shanghai';
const MAX_DATE_MS = 8_640_000_000_000_000;
const TRIGGERS = new Set(['scheduled', 'manual_now', 'manual_reschedule']);
const localHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23', numberingSystem: 'latn',
});

const result = (decision, reason) => ({ decision, reason, timeZone: TIME_ZONE });

/**
 * M-CALL-001 / R-CALL-006: a pure [09:00, 18:00) Shanghai time check.
 * WINDOW_OK is only a time condition, never permission to place a call.
 * Manual rescheduling supplies its proposed time; execution supplies current time.
 * @param {{ atEpochMs: number, trigger: string } | undefined | null} input
 * @returns {{ decision: string, reason: string, timeZone: string }}
 */
export function checkDialWindow(input) {
  const atEpochMs = input?.atEpochMs;
  if (typeof atEpochMs !== 'number' || !Number.isInteger(atEpochMs)
    || Math.abs(atEpochMs) > MAX_DATE_MS) {
    return result('INVALID_INPUT', 'INVALID_TIME');
  }
  if (!TRIGGERS.has(input?.trigger)) {
    return result('INVALID_INPUT', 'INVALID_TRIGGER');
  }

  const hour = Number(localHour.formatToParts(atEpochMs).find(part => part.type === 'hour').value);
  if (hour < 9) return result('OUTSIDE_WINDOW', 'BEFORE_WINDOW');
  if (hour >= 18) return result('OUTSIDE_WINDOW', 'AFTER_WINDOW');
  return result('WINDOW_OK', 'WITHIN_WINDOW');
}
