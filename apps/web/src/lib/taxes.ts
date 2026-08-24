import type { TaxSlug } from './tax-validation';

export type TaxRate = {
  id: string;
  name: string;
  slug: TaxSlug;
  ratePercent: number;
  locationId: string;
};

export type TaxRatesMap = Record<TaxSlug, number>;

export const TAX_RATES_UPDATED_EVENT = 'corgi-tax-rates-updated';

export class TaxApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'TaxApiError';
    this.status = status;
  }
}

export function taxRatesToMap(rates: TaxRate[]): TaxRatesMap {
  const food = rates.find((r) => r.slug === 'food')?.ratePercent ?? 10;
  const alcohol = rates.find((r) => r.slug === 'alcohol')?.ratePercent ?? 21;
  const exempt = rates.find((r) => r.slug === 'exempt')?.ratePercent ?? 0;
  return { food, alcohol, exempt };
}

export function notifyTaxRatesUpdated(rates: TaxRate[]): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TAX_RATES_UPDATED_EVENT, { detail: rates }));
}

export async function getTaxRatesAsync(locationId = 'default'): Promise<TaxRate[]> {
  const qs = locationId !== 'default' ? `?locationId=${encodeURIComponent(locationId)}` : '';
  const res = await fetch(`/api/taxes${qs}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new TaxApiError(body.error ?? 'Failed to load tax rates', res.status);
  }
  return res.json();
}

export async function saveTaxRatesAsync(
  patches: Array<{ slug: TaxSlug; ratePercent: number }>,
  locationId = 'default'
): Promise<TaxRate[]> {
  const res = await fetch('/api/taxes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId, rates: patches }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new TaxApiError(body.error ?? 'Failed to save tax rates', res.status);
  }
  notifyTaxRatesUpdated(body);
  return body;
}
