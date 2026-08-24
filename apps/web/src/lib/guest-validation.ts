import { validatePhoneE164, validateEmail, validateCustomerName } from './crm-validation';
import {
  GUEST_SUPPORTED_LOCALES,
  type GuestLocale,
  DEFAULT_GUEST_LOCALE,
} from './guest-constants';

export class GuestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuestValidationError';
  }
}

export function parseGuestLocale(value: unknown): GuestLocale {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_GUEST_LOCALE;
  const locale = value.trim().toLowerCase();
  if ((GUEST_SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return locale as GuestLocale;
  }
  return DEFAULT_GUEST_LOCALE;
}

export function validateLocationId(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw === 'default') return 'loc-gotico';
  return raw;
}

export function validateTableParam(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new GuestValidationError('table must be a string');
  return value.trim();
}

export function normalizeTableId(raw: string | null | undefined): string {
  if (!raw?.trim()) return 't4';
  const trimmed = raw.trim();
  if (trimmed.includes('-')) return trimmed;
  const num = trimmed.replace(/^[Tt]/, '');
  return `t${num}`;
}

export interface GuestOrderLineInput {
  menuItemId?: string;
  merchSkuId?: string;
  itemType: 'food' | 'merch';
  name: string;
  quantity: number;
  unitPrice: number;
  comments?: string;
  modifiers?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
  }>;
}

export function validateGuestOrderLines(items: unknown): GuestOrderLineInput[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new GuestValidationError('Order must contain at least one item');
  }
  return items.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new GuestValidationError(`Invalid item at index ${index}`);
    }
    const item = raw as Record<string, unknown>;
    const itemType = item.itemType === 'merch' ? 'merch' : 'food';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (name.length < 1) throw new GuestValidationError(`Item name required at index ${index}`);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      throw new GuestValidationError(`Invalid quantity at index ${index}`);
    }
    const unitPrice = Number(item.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new GuestValidationError(`Invalid price at index ${index}`);
    }
    return {
      menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : undefined,
      merchSkuId: typeof item.merchSkuId === 'string' ? item.merchSkuId : undefined,
      itemType,
      name,
      quantity: Math.floor(quantity),
      unitPrice,
      comments: typeof item.comments === 'string' ? item.comments.slice(0, 500) : undefined,
      modifiers: Array.isArray(item.modifiers)
        ? validateModifierSelections(item.modifiers)
        : undefined,
    };
  });
}

export function validateOtpCode(code: unknown): string {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    throw new GuestValidationError('OTP code must be 6 digits');
  }
  return code.trim();
}

export function validateGuestRegisterInput(body: unknown): {
  name: string;
  email: string;
  phone: string;
  allergyNotes?: string;
} {
  if (!body || typeof body !== 'object') throw new GuestValidationError('Invalid body');
  const data = body as Record<string, unknown>;
  return {
    name: validateCustomerName(data.name),
    email: validateEmail(data.email),
    phone: validatePhoneE164(data.phone),
    allergyNotes:
      typeof data.allergyNotes === 'string' ? data.allergyNotes.slice(0, 500) : undefined,
  };
}

export function validatePointsToSpend(value: unknown, customerPoints?: number): number {
  if (value === undefined || value === null || value === '') return 0;
  const points = Number(value);
  if (!Number.isFinite(points) || points < 0) {
    throw new GuestValidationError('pointsToSpend must be a non-negative number');
  }
  if (customerPoints !== undefined && points > customerPoints) {
    throw new GuestValidationError('Insufficient loyalty points');
  }
  return Math.round(points * 100) / 100;
}

export function validateModifierSelections(
  modifiers: unknown
): GuestOrderLineInput['modifiers'] {
  if (modifiers === undefined || modifiers === null) return undefined;
  if (!Array.isArray(modifiers)) {
    throw new GuestValidationError('modifiers must be an array');
  }
  return modifiers.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new GuestValidationError(`Invalid modifier at index ${index}`);
    }
    const m = raw as Record<string, unknown>;
    const optionName = typeof m.optionName === 'string' ? m.optionName.trim() : '';
    if (!optionName) throw new GuestValidationError(`modifier optionName required at ${index}`);
    const price = Number(m.price ?? 0);
    if (!Number.isFinite(price) || price < 0) {
      throw new GuestValidationError(`Invalid modifier price at ${index}`);
    }
    return {
      groupId: typeof m.groupId === 'string' ? m.groupId : '',
      groupName: typeof m.groupName === 'string' ? m.groupName : '',
      optionId: typeof m.optionId === 'string' ? m.optionId : '',
      optionName,
      price,
    };
  });
}

export function validateTipInput(
  tipType: unknown,
  tipValue: unknown
): { tipType?: 'percent' | 'fixed'; tipValue?: number } {
  if (tipType === undefined || tipType === null || tipValue === undefined || tipValue === null) {
    return {};
  }
  if (tipType !== 'percent' && tipType !== 'fixed') {
    throw new GuestValidationError('tipType must be percent or fixed');
  }
  const value = Number(tipValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new GuestValidationError('Invalid tip value');
  }
  if (tipType === 'percent' && value > 100) {
    throw new GuestValidationError('Tip percent cannot exceed 100');
  }
  return { tipType, tipValue: value };
}
