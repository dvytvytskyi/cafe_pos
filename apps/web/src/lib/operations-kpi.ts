import { parseDateParam, isValidDateParam } from './task-dates.ts';

export const COMPLETED_TASK_STATUSES = ['completed', 'archived'] as const;

export class OperationsKpiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationsKpiValidationError';
  }
}

/** T12.1 — completion % = done/total*100 (rounded) */
export function calcCompletionPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

/** T12.2 — zero tasks → 0%, no NaN */
export function buildCompletionSummary(completed: number, total: number) {
  return {
    total,
    completed,
    completionPercent: calcCompletionPercent(completed, total),
    isEmpty: total === 0,
  };
}

export function countCompletedTasks(byStatus: Record<string, number>): number {
  return COMPLETED_TASK_STATUSES.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);
}

export function validateKpiQuery(date?: string | null, shiftId?: string | null): { date: string; shiftId?: string } {
  if (!date || !isValidDateParam(date)) {
    throw new OperationsKpiValidationError('Invalid or missing date. Expected YYYY-MM-DD.');
  }
  if (shiftId !== undefined && shiftId !== null && shiftId !== '' && typeof shiftId !== 'string') {
    throw new OperationsKpiValidationError('Invalid shiftId');
  }
  return {
    date,
    shiftId: shiftId?.trim() || undefined,
  };
}

export type OperationsKpiPayload = {
  date: string;
  shiftId: string | null;
  tasks: {
    total: number;
    completed: number;
    completionPercent: number;
    isEmpty: boolean;
    byStatus: Record<string, number>;
  };
  checklists: {
    total: number;
    completed: number;
    completionPercent: number;
    isEmpty: boolean;
  };
};

export function buildKpiPayload(input: {
  date: string;
  shiftId: string | null;
  taskByStatus: Record<string, number>;
  checklistTotal: number;
  checklistCompleted: number;
}): OperationsKpiPayload {
  const taskTotal = Object.values(input.taskByStatus).reduce((sum, n) => sum + n, 0);
  const taskCompleted = countCompletedTasks(input.taskByStatus);

  return {
    date: input.date,
    shiftId: input.shiftId,
    tasks: {
      ...buildCompletionSummary(taskCompleted, taskTotal),
      byStatus: input.taskByStatus,
    },
    checklists: buildCompletionSummary(input.checklistCompleted, input.checklistTotal),
  };
}

/** Normalize date for DB queries */
export function kpiDateToDb(date: string): Date {
  return parseDateParam(date);
}
