import assert from 'assert';
import {
  calcTotalMinutes,
  resolveClockOut,
  shouldAutoClockOut,
  AUTO_CLOCK_OUT_MS,
} from './timecard-validation.ts';

export async function run() {
  console.log('--- Module 18 TimeCard Unit Tests ---');

  const clockIn = new Date('2026-08-06T08:00:00.000Z');
  const clockOut = new Date('2026-08-06T16:30:00.000Z');
  assert.strictEqual(calcTotalMinutes(clockIn, clockOut), 510);
  console.log('✅ T18.1 clockOut - clockIn in minutes');

  const lateOut = new Date(clockIn.getTime() + AUTO_CLOCK_OUT_MS + 60_000);
  const capped = resolveClockOut(clockIn, lateOut);
  assert.strictEqual(capped.getTime(), clockIn.getTime() + AUTO_CLOCK_OUT_MS);
  assert.strictEqual(shouldAutoClockOut(clockIn, lateOut), true);
  console.log('✅ T18.2 auto clock-out after 14h idle');

  console.log('✅ Module 18 unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
