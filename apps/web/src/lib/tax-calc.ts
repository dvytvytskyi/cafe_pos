import type { TaxSlug } from './tax-validation.ts';
import { isValidTaxSlug } from './tax-validation.ts';

export type TaxRatesMap = Record<TaxSlug, number>;

export type OrderLineForTax = {
  name: string;
  price: number;
  quantity: number;
  taxSlug?: TaxSlug | string | null;
};

export type ReceiptTaxBreakdown = {
  foodNet: number;
  foodTax: number;
  alcoholNet: number;
  alcoholTax: number;
  exemptNet: number;
  totalNet: number;
  totalTax: number;
  totalGross: number;
};

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function splitGrossByVat(gross: number, ratePercent: number): { net: number; tax: number } {
  const divisor = 1 + ratePercent / 100;
  const net = roundMoney(gross / divisor);
  const tax = roundMoney(gross - net);
  return { net, tax };
}

const ALCOHOL_KEYWORDS = [
  'beer',
  'wine',
  'cocktail',
  'sangria',
  'gin',
  'cider',
  'rum',
  'whiskey',
  'shot',
  'vodka',
  'tequila',
  'brandy',
  'champagne',
  'prosecco',
];

export function isAlcoholItemName(name: string): boolean {
  const lower = name.toLowerCase();
  return ALCOHOL_KEYWORDS.some((kw) => lower.includes(kw));
}

export function taxSlugForItemName(name: string): TaxSlug {
  return isAlcoholItemName(name) ? 'alcohol' : 'food';
}

export function taxSlugForOrderLine(line: Pick<OrderLineForTax, 'name' | 'taxSlug'>): TaxSlug {
  const raw = line.taxSlug?.trim().toLowerCase();
  if (raw && isValidTaxSlug(raw)) return raw;
  return taxSlugForItemName(line.name);
}

export function calculateReceiptTaxes(
  items: OrderLineForTax[],
  rates: TaxRatesMap
): ReceiptTaxBreakdown {
  let foodNet = 0;
  let foodTax = 0;
  let alcoholNet = 0;
  let alcoholTax = 0;
  let exemptNet = 0;

  for (const item of items) {
    const slug = taxSlugForOrderLine(item);
    const ratePercent = rates[slug] ?? rates.food;
    const gross = roundMoney(item.price * item.quantity);
    const { net, tax } = splitGrossByVat(gross, ratePercent);

    if (slug === 'alcohol') {
      alcoholNet = roundMoney(alcoholNet + net);
      alcoholTax = roundMoney(alcoholTax + tax);
    } else if (slug === 'exempt') {
      exemptNet = roundMoney(exemptNet + gross);
    } else {
      foodNet = roundMoney(foodNet + net);
      foodTax = roundMoney(foodTax + tax);
    }
  }

  const totalNet = roundMoney(foodNet + alcoholNet + exemptNet);
  const totalTax = roundMoney(foodTax + alcoholTax);
  const totalGross = roundMoney(totalNet + totalTax);

  return {
    foodNet,
    foodTax,
    alcoholNet,
    alcoholTax,
    exemptNet,
    totalNet,
    totalTax,
    totalGross,
  };
}

export function taxRatesToMap(
  rows: Array<{ slug: string; ratePercent: number }>
): TaxRatesMap {
  const food = rows.find((r) => r.slug === 'food')?.ratePercent ?? 10;
  const alcohol = rows.find((r) => r.slug === 'alcohol')?.ratePercent ?? 21;
  const exempt = rows.find((r) => r.slug === 'exempt')?.ratePercent ?? 0;
  return { food, alcohol, exempt };
}
