export const WEEKLY_HOURS_WARNING = 40;

export class ScheduleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleValidationError';
  }
}

export class OverlappingShiftError extends Error {
  constructor(message = 'Overlapping shifts are not allowed') {
    super(message);
    this.name = 'OverlappingShiftError';
  }
}

export type ScheduleShiftInput = {
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTimeToMinutes(time: string): number {
  if (!TIME_RE.test(time)) {
    throw new ScheduleValidationError(`Invalid time format: ${time}`);
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
}

export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end <= start) {
    throw new ScheduleValidationError('End time must be after start time');
  }
  return end - start;
}

export function shiftsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const a0 = parseTimeToMinutes(aStart);
  const a1 = parseTimeToMinutes(aEnd);
  const b0 = parseTimeToMinutes(bStart);
  const b1 = parseTimeToMinutes(bEnd);
  return a0 < b1 && b0 < a1;
}

/** T19.2 — reject overlapping shifts for same user/day */
export function validateNoOverlappingShifts(shifts: ScheduleShiftInput[]): void {
  const byUserDay = new Map<string, ScheduleShiftInput[]>();
  for (const shift of shifts) {
    if (shift.dayOfWeek < 0 || shift.dayOfWeek > 6) {
      throw new ScheduleValidationError('dayOfWeek must be 0–6');
    }
    shiftDurationMinutes(shift.startTime, shift.endTime);
    const key = `${shift.userId}:${shift.dayOfWeek}`;
    const list = byUserDay.get(key) ?? [];
    list.push(shift);
    byUserDay.set(key, list);
  }

  for (const list of byUserDay.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (shiftsOverlap(list[i]!.startTime, list[i]!.endTime, list[j]!.startTime, list[j]!.endTime)) {
          throw new OverlappingShiftError();
        }
      }
    }
  }
}

/** T19.1 — total scheduled hours for a user in a week */
export function calcWeeklyHours(shifts: ScheduleShiftInput[], userId: string): number {
  const totalMinutes = shifts
    .filter((s) => s.userId === userId)
    .reduce((sum, s) => sum + shiftDurationMinutes(s.startTime, s.endTime), 0);
  return totalMinutes / 60;
}

export function hasWeeklyHoursWarning(shifts: ScheduleShiftInput[], userId: string): boolean {
  return calcWeeklyHours(shifts, userId) > WEEKLY_HOURS_WARNING;
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function toWeekStartString(date: Date): string {
  return startOfWeekMonday(date).toISOString().slice(0, 10);
}

export function parseWeekStart(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ScheduleValidationError('Invalid weekStart, use YYYY-MM-DD');
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  const normalized = startOfWeekMonday(d);
  if (toWeekStartString(normalized) !== value) {
    throw new ScheduleValidationError('weekStart must be a Monday');
  }
  return d;
}
