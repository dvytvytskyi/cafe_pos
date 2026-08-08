import {
  ALLOWED_CURRENCIES,
  ALLOWED_LANGUAGES,
  DEFAULT_POS_SETTINGS,
  type PosSettings,
} from './pos-settings.ts';

export class PosSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PosSettingsValidationError';
  }
}

const POS_SETTINGS_KEYS = new Set([
  'language',
  'currency',
  'receiptHeader',
  'receiptFooter',
  'autoPrintReceipts',
  'happyHourDiscount',
]);

export function isValidCurrency(value: string): boolean {
  return ALLOWED_CURRENCIES.includes(value.toUpperCase() as (typeof ALLOWED_CURRENCIES)[number]);
}

export function isValidLanguage(value: string): boolean {
  return ALLOWED_LANGUAGES.includes(value.toLowerCase() as (typeof ALLOWED_LANGUAGES)[number]);
}

export function validatePosSettingsPatch(body: Record<string, unknown>): Partial<PosSettings> {
  const unknownKeys = Object.keys(body).filter((k) => !POS_SETTINGS_KEYS.has(k));
  if (unknownKeys.length > 0) {
    throw new PosSettingsValidationError(`Unknown settings keys: ${unknownKeys.join(', ')}`);
  }

  const patch: Partial<PosSettings> = {};

  if (body.language !== undefined) {
    if (typeof body.language !== 'string' || !isValidLanguage(body.language)) {
      throw new PosSettingsValidationError('Invalid language. Expected ISO 639-1 code (en, es, uk).');
    }
    patch.language = body.language.toLowerCase();
  }

  if (body.currency !== undefined) {
    if (typeof body.currency !== 'string' || !isValidCurrency(body.currency)) {
      throw new PosSettingsValidationError('Invalid currency. Expected ISO 4217 code (EUR, USD, GBP, UAH).');
    }
    patch.currency = body.currency.toUpperCase();
  }

  if (body.receiptHeader !== undefined) {
    if (typeof body.receiptHeader !== 'string' || !body.receiptHeader.trim()) {
      throw new PosSettingsValidationError('receiptHeader is required');
    }
    patch.receiptHeader = body.receiptHeader.trim().slice(0, 200);
  }

  if (body.receiptFooter !== undefined) {
    if (typeof body.receiptFooter !== 'string' || !body.receiptFooter.trim()) {
      throw new PosSettingsValidationError('receiptFooter is required');
    }
    patch.receiptFooter = body.receiptFooter.trim().slice(0, 200);
  }

  if (body.autoPrintReceipts !== undefined) {
    if (typeof body.autoPrintReceipts !== 'boolean') {
      throw new PosSettingsValidationError('autoPrintReceipts must be a boolean');
    }
    patch.autoPrintReceipts = body.autoPrintReceipts;
  }

  if (body.happyHourDiscount !== undefined) {
    const discount = Number(body.happyHourDiscount);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      throw new PosSettingsValidationError('happyHourDiscount must be between 0 and 100');
    }
    patch.happyHourDiscount = Math.round(discount * 100) / 100;
  }

  if (Object.keys(patch).length === 0) {
    throw new PosSettingsValidationError('No valid POS settings fields provided');
  }

  return patch;
}

export function mergePosSettings(
  current: PosSettings,
  patch: Partial<PosSettings>
): PosSettings {
  return { ...current, ...patch };
}

export function normalizePosSettings(raw: unknown): PosSettings {
  const base = { ...DEFAULT_POS_SETTINGS };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.language === 'string' && isValidLanguage(obj.language)) {
    base.language = obj.language.toLowerCase();
  }
  if (typeof obj.currency === 'string' && isValidCurrency(obj.currency)) {
    base.currency = obj.currency.toUpperCase();
  }
  if (typeof obj.receiptHeader === 'string' && obj.receiptHeader.trim()) {
    base.receiptHeader = obj.receiptHeader.trim();
  }
  if (typeof obj.receiptFooter === 'string' && obj.receiptFooter.trim()) {
    base.receiptFooter = obj.receiptFooter.trim();
  }
  if (typeof obj.autoPrintReceipts === 'boolean') {
    base.autoPrintReceipts = obj.autoPrintReceipts;
  }
  if (typeof obj.happyHourDiscount === 'number' && Number.isFinite(obj.happyHourDiscount)) {
    base.happyHourDiscount = Math.min(100, Math.max(0, obj.happyHourDiscount));
  }

  return base;
}
