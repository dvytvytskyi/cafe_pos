export const AUTO_CLOCK_OUT_HOURS = 14;
export const AUTO_CLOCK_OUT_MS = AUTO_CLOCK_OUT_HOURS * 60 * 60 * 1000;

export class TimeCardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeCardValidationError';
  }
}

export class AlreadyClockedInError extends Error {
  constructor() {
    super('ALREADY_CLOCKED_IN');
    this.name = 'AlreadyClockedInError';
  }
}

export class NotClockedInError extends Error {
  constructor() {
    super('NOT_CLOCKED_IN');
    this.name = 'NotClockedInError';
  }
}

/** T18.1 — minutes between clock-in and clock-out */
export function calcTotalMinutes(clockIn: Date, clockOut: Date): number {
  const ms = clockOut.getTime() - clockIn.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 60_000);
}

/** T18.2 — cap clock-out at clockIn + 14h */
export function resolveClockOut(clockIn: Date, requestedOut: Date = new Date()): Date {
  const maxOut = new Date(clockIn.getTime() + AUTO_CLOCK_OUT_MS);
  return requestedOut.getTime() > maxOut.getTime() ? maxOut : requestedOut;
}

export function shouldAutoClockOut(clockIn: Date, now: Date = new Date()): boolean {
  return now.getTime() - clockIn.getTime() >= AUTO_CLOCK_OUT_MS;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateParam(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TimeCardValidationError('Invalid date format, use YYYY-MM-DD');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function deriveTimeEntryStatus(clockIn: Date | null, clockOut: Date | null): 'pending' | 'on_shift' | 'completed' {
  if (!clockIn) return 'pending';
  if (!clockOut) return 'on_shift';
  return 'completed';
}
