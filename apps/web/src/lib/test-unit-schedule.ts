import assert from 'assert';
import {
  shiftDurationMinutes,
  shiftsOverlap,
  validateNoOverlappingShifts,
  calcWeeklyHours,
  hasWeeklyHoursWarning,
  OverlappingShiftError,
  toWeekStartString,
} from './schedule-validation.ts';

export async function run() {
  console.log('--- Module 19 Schedule Unit Tests ---');

  assert.strictEqual(shiftDurationMinutes('09:00', '17:00'), 480);
  assert.strictEqual(shiftsOverlap('09:00', '12:00', '11:00', '14:00'), true);
  assert.strictEqual(shiftsOverlap('09:00', '10:00', '10:00', '11:00'), false);
  assert.throws(
    () =>
      validateNoOverlappingShifts([
        { userId: 'u1', dayOfWeek: 0, startTime: '09:00', endTime: '13:00' },
        { userId: 'u1', dayOfWeek: 0, startTime: '12:00', endTime: '16:00' },
      ]),
    OverlappingShiftError
  );
  console.log('✅ T19.2 overlapping shifts blocked');

  const heavyWeek = [
    { userId: 'u1', dayOfWeek: 0, startTime: '08:00', endTime: '18:00' },
    { userId: 'u1', dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
    { userId: 'u1', dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
    { userId: 'u1', dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
    { userId: 'u1', dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
  ];
  assert.strictEqual(calcWeeklyHours(heavyWeek, 'u1'), 50);
  assert.strictEqual(hasWeeklyHoursWarning(heavyWeek, 'u1'), true);
  console.log('✅ T19.1 >40h/week warning');

  const monday = toWeekStartString(new Date('2026-08-06T12:00:00.000Z'));
  assert.strictEqual(monday, '2026-08-03');
  console.log('✅ weekStart Monday normalization');

  console.log('✅ Module 19 unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
