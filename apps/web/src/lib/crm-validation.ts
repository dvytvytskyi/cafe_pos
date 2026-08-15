export class CrmValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmValidationError';
  }
}

export class PhoneDuplicateError extends Error {
  constructor() {
    super('PHONE_DUPLICATE');
    this.name = 'PhoneDuplicateError';
  }
}

export class InsufficientPointsError extends Error {
  constructor() {
    super('INSUFFICIENT_POINTS');
    this.name = 'InsufficientPointsError';
  }
}

export class PointsAdjustmentConflictError extends Error {
  constructor() {
    super('POINTS_ADJUSTMENT_CONFLICT');
    this.name = 'PointsAdjustmentConflictError';
  }
}

/** T21.1 — E.164 after normalization */
export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

/** T21.2 — practical RFC 5322 subset */
export const EMAIL_RFC_REGEX =
  /^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const MAX_POINTS_ADJUSTMENT = 10000;

export function validateCustomerName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new CrmValidationError('Name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new CrmValidationError('Name must be at least 2 characters');
  }
  return trimmed;
}

export function validatePhoneE164(phone: unknown): string {
  if (typeof phone !== 'string' || !phone.trim()) {
    throw new CrmValidationError('Phone number is required');
  }
  const normalized = normalizePhone(phone.trim());
  if (!E164_PHONE_REGEX.test(normalized)) {
    throw new CrmValidationError('Phone must be a valid E.164 number (e.g. +34612345678)');
  }
  return normalized;
}

export function validateEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.trim()) {
    throw new CrmValidationError('Email is required');
  }
  const trimmed = email.trim();
  if (!EMAIL_RFC_REGEX.test(trimmed)) {
    throw new CrmValidationError('Email address is invalid');
  }
  return trimmed;
}

/** T22.2 — cap absolute adjustment to 10000 */
export function capPointsDelta(pointsDelta: number): number {
  if (!Number.isFinite(pointsDelta) || pointsDelta === 0) return 0;
  if (pointsDelta > 0) return Math.min(pointsDelta, MAX_POINTS_ADJUSTMENT);
  return Math.max(pointsDelta, -MAX_POINTS_ADJUSTMENT);
}

/** T22.1 — block spend below zero balance */
export function validatePointsAdjustment(pointsDelta: number, currentBalance: number): number {
  const capped = capPointsDelta(pointsDelta);
  if (capped === 0) {
    throw new CrmValidationError('pointsDelta must be a non-zero number');
  }
  const newBalance = parseFloat((currentBalance + capped).toFixed(2));
  if (newBalance < 0) {
    throw new InsufficientPointsError();
  }
  return capped;
}

/** POS quick-register: unique contact when phone omitted */
export function buildQuickGuestContact(
  name: string,
  phone?: string
): { phone: string; email: string } {
  const trimmedName = name.trim();
  const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest';
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  if (phone?.trim()) {
    return {
      phone: phone.trim(),
      email: `${slug}.${unique}@guest.corgi.local`,
    };
  }

  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return {
    phone: `+346${digits}`,
    email: `${slug}.${unique}@guest.corgi.local`,
  };
}

/** T20.1 — normalize phone to E.164-like format */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  let cleaned = trimmed.replace(/[^\d+]/g, '');

  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('380')) {
      cleaned = `+${cleaned}`;
    } else if (cleaned.startsWith('34')) {
      cleaned = `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      cleaned = `+380${cleaned.slice(1)}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }

  return cleaned;
}

/** Last 9 digits for suffix matching (e.g. +380… vs 099…) */
export function phoneSuffix(phone: string): string {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return digits.slice(-9);
}

export function phonesMatch(a: string, b: string): boolean {
  const sa = phoneSuffix(a);
  const sb = phoneSuffix(b);
  return sa.length >= 7 && sb.length >= 7 && sa === sb;
}

export type CustomerSortField = 'name' | 'bonusPoints' | 'lastVisit';
export type SortOrder = 'asc' | 'desc';

export function parseSortField(sortBy: string | null | undefined): CustomerSortField {
  if (sortBy === 'bonusPoints' || sortBy === 'lastVisit') return sortBy;
  return 'name';
}

export function parseSortOrder(order: string | null | undefined): SortOrder {
  return order === 'desc' ? 'desc' : 'asc';
}

/** T20.2 — sort customers by points or last visit */
export function sortCustomers<T extends { name: string; points: number; lastVisitDate?: string | null }>(
  items: T[],
  sortBy: CustomerSortField,
  order: SortOrder
): T[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'bonusPoints') {
      cmp = a.points - b.points;
    } else if (sortBy === 'lastVisit') {
      cmp = (a.lastVisitDate ?? '').localeCompare(b.lastVisitDate ?? '');
    } else {
      cmp = a.name.localeCompare(b.name);
    }
    return order === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

/** T20.3 — pagination bounds */
export function validatePaginationParams(page: unknown, limit: unknown): { page: number; limit: number } {
  const pageNum = typeof page === 'number' ? page : parseInt(String(page ?? ''), 10);
  const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit ?? ''), 10);

  if (!Number.isFinite(pageNum) || pageNum < 1) {
    throw new CrmValidationError('page must be >= 1');
  }
  if (!Number.isFinite(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new CrmValidationError('limit must be between 1 and 100');
  }

  return { page: pageNum, limit: limitNum };
}

export type CustomerListItem = {
  name: string;
  phone: string;
  email: string;
};

/** Client-side search filter for CRM table */
export function filterCustomersBySearch<T extends CustomerListItem>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.email.toLowerCase().includes(q)) return true;
    if (c.phone.includes(q)) return true;
    return phonesMatch(c.phone, q);
  });
}

export const EMPTY_CRM_LIST_MESSAGE = 'No guests match the search criteria.';

/** M23 — loyalty QR token: crm_client:{uuid} */
export const CRM_QR_PREFIX = 'crm_client:';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** T23.1 — build QR token */
export function buildCustomerQrCode(customerId: string): string {
  if (!UUID_REGEX.test(customerId)) {
    throw new CrmValidationError('Invalid customer id for QR code');
  }
  return `${CRM_QR_PREFIX}${customerId}`;
}

/** T23.1 — parse and validate QR token */
export function parseCustomerQrCode(code: unknown): string {
  if (typeof code !== 'string' || !code.trim()) {
    throw new CrmValidationError('QR code is required');
  }
  const trimmed = code.trim();
  if (!trimmed.startsWith(CRM_QR_PREFIX)) {
    throw new CrmValidationError('Invalid QR code format');
  }
  const customerId = trimmed.slice(CRM_QR_PREFIX.length);
  if (!UUID_REGEX.test(customerId)) {
    throw new CrmValidationError('Invalid QR code customer id');
  }
  return customerId;
}

export function isCustomerQrCode(value: string): boolean {
  try {
    parseCustomerQrCode(value);
    return true;
  } catch {
    return false;
  }
}
