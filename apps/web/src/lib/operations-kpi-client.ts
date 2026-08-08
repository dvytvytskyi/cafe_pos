import type { OperationsKpiPayload } from './operations-kpi.ts';
import { formatDateParam } from './task-dates.ts';

export async function getOperationsKpiAsync(
  date: Date | string = new Date(),
  shiftId?: string
): Promise<OperationsKpiPayload> {
  const dateParam = typeof date === 'string' ? date : formatDateParam(date);
  const params = new URLSearchParams({ date: dateParam });
  if (shiftId) params.set('shiftId', shiftId);

  const res = await fetch(`/api/operations/kpi?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load operations KPI');
  }
  return res.json();
}
