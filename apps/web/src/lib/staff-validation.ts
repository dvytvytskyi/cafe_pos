export class StaffValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaffValidationError';
  }
}

export class PinDuplicateError extends Error {
  constructor() {
    super('PIN_DUPLICATE');
    this.name = 'PinDuplicateError';
  }
}

/** T17.1 — PIN must be exactly 4 digits */
export function validatePin(pin: unknown): string {
  if (typeof pin !== 'string') {
    throw new StaffValidationError('PIN is required');
  }
  if (!/^\d{4}$/.test(pin)) {
    throw new StaffValidationError('PIN must be exactly 4 digits');
  }
  return pin;
}

/** T17.2 — first name / full name min 2 chars after trim */
export function validateEmployeeName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new StaffValidationError('Name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new StaffValidationError('Name must be at least 2 characters');
  }
  return trimmed;
}

export type StaffListItem = {
  name: string;
  status?: string | null;
};

/** T16.1 — case-insensitive search on name */
export function filterEmployeesBySearch<T extends StaffListItem>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((e) => e.name.toLowerCase().includes(q));
}

/** T16.2 — archived filter: show only inactive when archived=true */
export function filterEmployeesByArchived<T extends StaffListItem>(
  items: T[],
  showArchived: boolean
): T[] {
  if (showArchived) {
    return items.filter((e) => e.status === 'inactive');
  }
  return items.filter((e) => e.status !== 'inactive');
}

export function paginateItems<T>(items: T[], page: number, limit: number): T[] {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const start = (safePage - 1) * safeLimit;
  return items.slice(start, start + safeLimit);
}

export const EMPTY_STAFF_LIST_MESSAGE = 'No employees match your filters.';
