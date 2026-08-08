import { prisma } from '../lib/db.ts';
import { cache } from '../lib/cache/index.ts';
import {
  validateTaxRatePatch,
  type TaxSlug,
  TaxValidationError,
} from '../lib/tax-validation.ts';

export type TaxRateRecord = {
  id: string;
  name: string;
  slug: TaxSlug;
  ratePercent: number;
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
};

export const TAX_RATES_CACHE_KEY = 'tax_rates:default';

const DEFAULT_RATES: Array<{ name: string; slug: TaxSlug; ratePercent: number }> = [
  { name: 'Food', slug: 'food', ratePercent: 10 },
  { name: 'Alcohol', slug: 'alcohol', ratePercent: 21 },
];

function mapRow(row: {
  id: string;
  name: string;
  slug: string;
  ratePercent: number;
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
}): TaxRateRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug as TaxSlug,
    ratePercent: row.ratePercent,
    locationId: row.locationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class TaxRepository {
  async ensureDefaults(locationId = 'default'): Promise<void> {
    const count = await prisma.taxRate.count({ where: { locationId } });
    if (count > 0) return;

    await prisma.taxRate.createMany({
      data: DEFAULT_RATES.map((r) => ({ ...r, locationId })),
    });
  }

  async findAll(locationId = 'default'): Promise<TaxRateRecord[]> {
    await this.ensureDefaults(locationId);
    const rows = await prisma.taxRate.findMany({
      where: { locationId },
      orderBy: { slug: 'asc' },
    });
    return rows.map(mapRow);
  }

  async getCached(locationId = 'default'): Promise<TaxRateRecord[]> {
    const cacheKey = `${TAX_RATES_CACHE_KEY}:${locationId}`;
    const cached = await cache.get<TaxRateRecord[]>(cacheKey);
    if (cached) return cached;

    const rates = await this.findAll(locationId);
    await cache.set(cacheKey, rates);
    return rates;
  }

  async saveRates(
    patches: Array<{ slug: string; ratePercent: unknown }>,
    locationId = 'default'
  ): Promise<TaxRateRecord[]> {
    await this.ensureDefaults(locationId);

    const validated = patches.map((p) => validateTaxRatePatch(p));

    await prisma.$transaction(async (tx) => {
      for (const patch of validated) {
        const existing = await tx.taxRate.findUnique({
          where: { locationId_slug: { locationId, slug: patch.slug } },
        });
        if (!existing) {
          throw new TaxValidationError(`Tax rate not found: ${patch.slug}`);
        }
        await tx.taxRate.update({
          where: { id: existing.id },
          data: { ratePercent: patch.ratePercent },
        });
      }
    });

    await cache.delete(`${TAX_RATES_CACHE_KEY}:${locationId}`);
    return this.findAll(locationId);
  }
}

export const taxRepository = new TaxRepository();
