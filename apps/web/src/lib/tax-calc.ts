import type { TaxSlug } from './tax-validation.ts';

export type TaxRatesMap = Record<TaxSlug, number>;

export type OrderLineForTax = {
  name: string;
  price: number;
  quantity: number;
};

export type ReceiptTaxBreakdown = {
  foodNet: number;
  foodTax: number;
  alcoholNet: number;
  alcoholTax: number;
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

export function calculateReceiptTaxes(
  items: OrderLineForTax[],
  rates: TaxRatesMap
): ReceiptTaxBreakdown {
  let foodNet = 0;
  let foodTax = 0;
  let alcoholNet = 0;
  let alcoholTax = 0;

  for (const item of items) {
    const slug = taxSlugForItemName(item.name);
    const ratePercent = rates[slug];
    const gross = roundMoney(item.price * item.quantity);
    const { net, tax } = splitGrossByVat(gross, ratePercent);

    if (slug === 'alcohol') {
      alcoholNet = roundMoney(alcoholNet + net);
      alcoholTax = roundMoney(alcoholTax + tax);
    } else {
      foodNet = roundMoney(foodNet + net);
      foodTax = roundMoney(foodTax + tax);
    }
  }

  const totalNet = roundMoney(foodNet + alcoholNet);
  const totalTax = roundMoney(foodTax + alcoholTax);
  const totalGross = roundMoney(totalNet + totalTax);

  return {
    foodNet,
    foodTax,
    alcoholNet,
    alcoholTax,
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
  return { food, alcohol };
}
