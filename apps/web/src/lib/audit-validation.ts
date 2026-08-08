export const AUDIT_ACTIONS = [
  'shift_open',
  'shift_close',
  'cash_adjustment',
  'order_completed',
  'order_cancelled',
  'order_refunded',
  'invoice_generated',
  'menu_item_archived',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditLogFilters = {
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export class AuditValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditValidationError';
  }
}

export function isValidAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function parseAuditFilters(searchParams: URLSearchParams): AuditLogFilters {
  const filters: AuditLogFilters = {};

  const action = searchParams.get('action')?.trim();
  if (action) {
    if (!isValidAuditAction(action)) {
      throw new AuditValidationError(`Invalid action. Allowed: ${AUDIT_ACTIONS.join(', ')}`);
    }
    filters.action = action;
  }

  const userId = searchParams.get('userId')?.trim();
  if (userId) {
    filters.userId = userId.slice(0, 64);
  }

  const from = searchParams.get('from');
  if (from) {
    const d = new Date(from);
    if (Number.isNaN(d.getTime())) {
      throw new AuditValidationError('Invalid from date');
    }
    filters.from = d;
  }

  const to = searchParams.get('to');
  if (to) {
    const d = new Date(to);
    if (Number.isNaN(d.getTime())) {
      throw new AuditValidationError('Invalid to date');
    }
    filters.to = d;
  }

  const limitRaw = searchParams.get('limit');
  if (limitRaw) {
    const limit = Number.parseInt(limitRaw, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new AuditValidationError('limit must be between 1 and 500');
    }
    filters.limit = limit;
  } else {
    filters.limit = 100;
  }

  const offsetRaw = searchParams.get('offset');
  if (offsetRaw) {
    const offset = Number.parseInt(offsetRaw, 10);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new AuditValidationError('offset must be a non-negative integer');
    }
    filters.offset = offset;
  } else {
    filters.offset = 0;
  }

  return filters;
}

export function validateAuditTrailChain(
  logs: Array<{ prevHash: string; hash: string }>
): boolean {
  for (let i = 1; i < logs.length; i++) {
    if (logs[i]!.prevHash !== logs[i - 1]!.hash) {
      return false;
    }
  }
  return true;
}
