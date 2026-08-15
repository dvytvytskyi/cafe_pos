export type PosSettings = {
  language: string;
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  autoPrintReceipts: boolean;
  happyHourDiscount: number;
  verifactuEnabled: boolean;
};

export const POS_SETTINGS_DB_KEY = 'pos_settings';
export const POS_SETTINGS_CACHE_KEY = 'system_settings:pos';

export const DEFAULT_POS_SETTINGS: PosSettings = {
  language: 'en',
  currency: 'EUR',
  receiptHeader: 'Corgi Cafe',
  receiptFooter: 'Thank you for your visit!',
  autoPrintReceipts: true,
  happyHourDiscount: 15,
  verifactuEnabled: true,
};

/** ISO 4217 subset used by the cafe */
export const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP', 'UAH'] as const;
export type PosCurrency = (typeof ALLOWED_CURRENCIES)[number];

/** ISO 639-1 languages supported in POS */
export const ALLOWED_LANGUAGES = ['en', 'es', 'uk'] as const;
export type PosLanguage = (typeof ALLOWED_LANGUAGES)[number];

export const CURRENCY_SYMBOLS: Record<PosCurrency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  UAH: '₴',
};

export const POS_SETTINGS_UPDATED_EVENT = 'corgi-pos-settings-updated';

export function formatPosAmount(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code as PosCurrency] ?? code;
  return `${symbol}${amount.toFixed(2)}`;
}

export function notifyPosSettingsUpdated(settings: PosSettings): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(POS_SETTINGS_UPDATED_EVENT, { detail: settings }));
}

export class PosSettingsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PosSettingsApiError';
    this.status = status;
  }
}

export async function getPosSettingsAsync(): Promise<PosSettings> {
  const res = await fetch('/api/settings/pos');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PosSettingsApiError(body.error ?? 'Failed to load POS settings', res.status);
  }
  return res.json();
}

export async function savePosSettingsAsync(patch: Partial<PosSettings>): Promise<PosSettings> {
  const res = await fetch('/api/settings/pos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PosSettingsApiError(body.error ?? 'Failed to save POS settings', res.status);
  }
  notifyPosSettingsUpdated(body);
  return body;
}
