export const TAX_SLUGS = ['food', 'alcohol', 'exempt'] as const;
export type TaxSlug = (typeof TAX_SLUGS)[number];

export const MIN_TAX_PERCENT = 0;
export const MAX_TAX_PERCENT = 100;

export class TaxValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxValidationError';
  }
}

export function isValidTaxSlug(value: string): value is TaxSlug {
  return (TAX_SLUGS as readonly string[]).includes(value);
}

export function isValidTaxPercent(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_TAX_PERCENT && value <= MAX_TAX_PERCENT;
}

export function validateTaxRatePercent(value: unknown): number {
  const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  if (!isValidTaxPercent(num)) {
    throw new TaxValidationError(`Tax rate must be between ${MIN_TAX_PERCENT} and ${MAX_TAX_PERCENT}%`);
  }
  return Math.round(num * 100) / 100;
}

export type TaxRatePatch = {
  slug: string;
  ratePercent: unknown;
};

export function validateTaxRatePatch(input: TaxRatePatch): { slug: TaxSlug; ratePercent: number } {
  const slug = input.slug?.trim().toLowerCase();
  if (!slug || !isValidTaxSlug(slug)) {
    throw new TaxValidationError(`Slug must be one of: ${TAX_SLUGS.join(', ')}`);
  }
  const ratePercent = validateTaxRatePercent(input.ratePercent);
  return { slug, ratePercent };
}
