export interface TimeTrackingEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
  totalMinutes: number;
  status: 'pending' | 'on_shift' | 'completed';
}

export interface ScheduleShift {
  id?: string;
  userId: string;
  userName?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export async function getTimeTrackingAsync(date?: string): Promise<TimeTrackingEntry[]> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`/api/staff/time-tracking${qs}`);
  if (!res.ok) throw new Error('Failed to fetch time tracking');
  return res.json();
}

export async function clockInAsync(payload: { userId?: string; pin?: string }): Promise<TimeTrackingEntry> {
  const res = await fetch('/api/staff/time-tracking/clock-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || 'Clock in failed'), { code: err.code });
  }
  return res.json();
}

export async function clockOutAsync(payload: { userId?: string; pin?: string }): Promise<TimeTrackingEntry> {
  const res = await fetch('/api/staff/time-tracking/clock-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || 'Clock out failed'), { code: err.code });
  }
  return res.json();
}

export async function getScheduleAsync(weekStart: string): Promise<{
  weekStart: string;
  shifts: ScheduleShift[];
  warnings: Array<{ userId: string; userName: string; weeklyHours: number }>;
}> {
  const res = await fetch(`/api/staff/schedule?weekStart=${encodeURIComponent(weekStart)}`);
  if (!res.ok) throw new Error('Failed to fetch schedule');
  return res.json();
}

export async function saveScheduleBulkAsync(
  weekStart: string,
  shifts: Array<{ userId: string; dayOfWeek: number; startTime: string; endTime: string }>,
  clearedUserIds: string[] = []
): Promise<{ weekStart: string; count: number; shifts: ScheduleShift[] }> {
  const res = await fetch('/api/staff/schedule/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekStart, shifts, clearedUserIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || 'Failed to save schedule'), { code: err.code });
  }
  return res.json();
}

export { toWeekStartString } from './schedule-validation';
