export const GIFT_CARD_STATUSES = ['active', 'redeemed', 'expired', 'disabled'] as const;
export type GiftCardStatus = (typeof GIFT_CARD_STATUSES)[number];

/** Alphanumeric charset excluding O, 0, I, 1 for readability. */
export const GIFT_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const GIFT_CODE_SEGMENT_LENGTH = 4;
export const GIFT_CODE_MAX_RETRIES = 8;

export class GiftCardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GiftCardValidationError';
  }
}

export function isValidGiftCardCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  const modern = /^CORGI-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
  const legacy = /^CORGI-\d{3,6}$/;
  return modern.test(normalized) || legacy.test(normalized);
}

export function generateGiftCodeSegment(length = GIFT_CODE_SEGMENT_LENGTH): string {
  let segment = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * GIFT_CODE_CHARSET.length);
    segment += GIFT_CODE_CHARSET[idx];
  }
  return segment;
}

export function formatGiftCardCode(): string {
  return `CORGI-${generateGiftCodeSegment()}-${generateGiftCodeSegment()}`;
}

export function validateInitialBalance(value: unknown): number {
  const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(num) || num <= 0 || num > 10000) {
    throw new GiftCardValidationError('initialBalance must be between 0.01 and 10000');
  }
  return Math.round(num * 100) / 100;
}

export function validateExpiryDate(date: Date, now = new Date()): void {
  if (Number.isNaN(date.getTime())) {
    throw new GiftCardValidationError('Invalid expiry date');
  }
  if (date.getTime() <= now.getTime()) {
    throw new GiftCardValidationError('expiryDate must be in the future');
  }
}

export function defaultExpiryDate(from = new Date()): Date {
  return new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000);
}

export function validateBatchCount(value: unknown): number {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 50) {
    throw new GiftCardValidationError('count must be an integer between 1 and 50');
  }
  return num;
}

export function validateStatusPatch(value: unknown): 'active' | 'disabled' {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (status !== 'active' && status !== 'disabled') {
    throw new GiftCardValidationError('status must be active or disabled');
  }
  return status;
}
