import { formatDateParam, isValidDateParam, parseDateParam } from './task-dates.ts';
import { isValidLocationKey, isValidShiftType } from './checklist-locations.ts';

export type ChecklistCompletionInput = {
  shiftType: string;
  date: string;
  locationKey: string;
  taskKey: string;
  completed: boolean;
  photoUrl?: string | null;
  userId?: string | null;
};

export class ChecklistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChecklistValidationError';
  }
}

export class ShiftClosedError extends Error {
  constructor() {
    super('SHIFT_CLOSED');
    this.name = 'ShiftClosedError';
  }
}

export class ChecklistForbiddenError extends Error {
  constructor(message = 'Cannot edit checklist for this date') {
    super(message);
    this.name = 'ChecklistForbiddenError';
  }
}

/** T10.1 — completion payload must include timestamp + userId when marking done */
export function buildCompletionFields(
  completed: boolean,
  userId?: string | null,
  now: Date = new Date()
): { completedAt: Date | null; completedById: string | null } {
  if (!completed) {
    return { completedAt: null, completedById: null };
  }
  if (!userId?.trim()) {
    throw new ChecklistValidationError('userId is required when completing a checklist item');
  }
  return { completedAt: now, completedById: userId.trim() };
}

export function validateChecklistQuery(date?: string | null, shiftType?: string | null) {
  if (!date || !isValidDateParam(date)) {
    throw new ChecklistValidationError('Invalid or missing date. Expected YYYY-MM-DD.');
  }
  if (!shiftType || !isValidShiftType(shiftType)) {
    throw new ChecklistValidationError('Invalid or missing shiftType. Expected opening or closing.');
  }
}

export function validateChecklistCreate(body: ChecklistCompletionInput): void {
  validateChecklistQuery(body.date, body.shiftType);
  if (!body.taskKey?.trim()) {
    throw new ChecklistValidationError('taskKey is required');
  }
  if (!body.locationKey || !isValidLocationKey(body.locationKey)) {
    throw new ChecklistValidationError('Invalid locationKey');
  }
  if (typeof body.completed !== 'boolean') {
    throw new ChecklistValidationError('completed must be a boolean');
  }
  if (body.completed) {
    buildCompletionFields(true, body.userId);
  }
}

/** T10.6 — past dates forbidden; T10.2 guard applied separately via shift repo */
export function assertEditableChecklistDate(date: string, today: Date = new Date()): void {
  if (!isValidDateParam(date)) {
    throw new ChecklistValidationError('Invalid date format');
  }
  const target = parseDateParam(date);
  const todayStart = parseDateParam(formatDateParam(today));
  if (target < todayStart) {
    throw new ChecklistForbiddenError('Cannot edit past checklists');
  }
}

export function isPastChecklistDate(date: string, today: Date = new Date()): boolean {
  const target = parseDateParam(date);
  const todayStart = parseDateParam(formatDateParam(today));
  return target < todayStart;
}
