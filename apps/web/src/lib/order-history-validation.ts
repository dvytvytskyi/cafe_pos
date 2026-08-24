import { DEFAULT_LOCATION_ID } from './constants.ts';

export const ORDER_HISTORY_SOURCES = ['dine_in', 'takeaway', 'glovo', 'ubereats'] as const;
export type OrderHistorySource = (typeof ORDER_HISTORY_SOURCES)[number];

export const ORDER_PAYMENT_METHODS = ['card', 'cash', 'points', 'giftcard'] as const;
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const DEFAULT_HISTORY_LIMIT = 20;
export const MAX_HISTORY_LIMIT = 100;

export class OrderHistoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderHistoryValidationError';
  }
}

export type OrderHistoryFilters = {
  locationId: string;
  page: number;
  limit: number;
  source?: OrderHistorySource;
  startDate: Date;
  endDate: Date;
  paymentMethod?: OrderPaymentMethod;
  query?: string;
  customerId?: string;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function parseIsoDate(value: string, label: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new OrderHistoryValidationError(`Invalid ${label} date format`);
  }
  return d;
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function resolveDefaultDateRange(startRaw?: string | null, endRaw?: string | null): {
  startDate: Date;
  endDate: Date;
} {
  const today = new Date();
  if (!startRaw && !endRaw) {
    return { startDate: startOfDay(today), endDate: endOfDay(today) };
  }
  const startDate = startRaw ? startOfDay(parseIsoDate(startRaw, 'startDate')) : startOfDay(today);
  const endDate = endRaw ? endOfDay(parseIsoDate(endRaw, 'endDate')) : endOfDay(today);
  if (startDate.getTime() > endDate.getTime()) {
    throw new OrderHistoryValidationError('startDate must be before or equal to endDate');
  }
  return { startDate, endDate };
}

export function parseOrderHistoryFilters(searchParams: URLSearchParams): OrderHistoryFilters {
  const locationId = searchParams.get('locationId')?.trim() || DEFAULT_LOCATION_ID;

  const pageRaw = searchParams.get('page');
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  if (!Number.isInteger(page) || page < 1) {
    throw new OrderHistoryValidationError('page must be a positive integer');
  }

  const limitRaw = searchParams.get('limit');
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_HISTORY_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HISTORY_LIMIT) {
    throw new OrderHistoryValidationError(`limit must be between 1 and ${MAX_HISTORY_LIMIT}`);
  }

  const { startDate, endDate } = resolveDefaultDateRange(
    searchParams.get('startDate'),
    searchParams.get('endDate')
  );

  const source = searchParams.get('source')?.trim().toLowerCase();
  if (source && !(ORDER_HISTORY_SOURCES as readonly string[]).includes(source)) {
    throw new OrderHistoryValidationError(`Invalid source. Allowed: ${ORDER_HISTORY_SOURCES.join(', ')}`);
  }

  const paymentMethod = searchParams.get('paymentMethod')?.trim().toLowerCase();
  if (paymentMethod && !(ORDER_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    throw new OrderHistoryValidationError(`Invalid paymentMethod. Allowed: ${ORDER_PAYMENT_METHODS.join(', ')}`);
  }

  const query = searchParams.get('query')?.trim();
  if (query && query.length > 120) {
    throw new OrderHistoryValidationError('query must be at most 120 characters');
  }

  const customerId = searchParams.get('customerId')?.trim();
  if (customerId && customerId.length > 64) {
    throw new OrderHistoryValidationError('customerId must be at most 64 characters');
  }

  return {
    locationId,
    page,
    limit,
    source: source as OrderHistorySource | undefined,
    startDate,
    endDate,
    paymentMethod: paymentMethod as OrderPaymentMethod | undefined,
    query: query || undefined,
    customerId: customerId || undefined,
  };
}
