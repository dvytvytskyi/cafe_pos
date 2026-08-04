import assert from 'assert';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Promotion {
  name: string;
  discountPercent: number;
  activeDays: number[];
  startHour: number;
  endHour: number;
  targetItems: string[];
}

const promoRules: Promotion[] = [
  {
    name: 'Happy Hour Friday',
    discountPercent: 20.0,
    activeDays: [5], // Friday
    startHour: 18,
    endHour: 20,
    targetItems: ['Espresso', 'Orange Juice'],
  },
];

function calculateDiscount(items: OrderItem[], date: Date): number {
  const day = date.getDay();
  const hour = date.getHours();

  const active = promoRules.find(p => p.activeDays.includes(day) && hour >= p.startHour && hour < p.endHour);
  if (!active) return 0;

  let deduction = 0;
  items.forEach(item => {
    if (active.targetItems.includes(item.name)) {
      deduction += (item.price * item.quantity) * (active.discountPercent / 100);
    }
  });

  return parseFloat(deduction.toFixed(2));
}

export async function run() {
  console.log('Running test-unit-promotions...');

  // Friday, Aug 7 2026 is Day 5.
  const dateInWindow = new Date('2026-08-07T19:00:00'); // 7 PM (Friday)
  const dateOutWindow = new Date('2026-08-07T17:00:00'); // 5 PM (Friday)
  const dateWrongDay = new Date('2026-08-08T19:00:00'); // 7 PM (Saturday)

  const items = [
    { name: 'Espresso', price: 2.00, quantity: 2 }, // Target: €4 subtotal
    { name: 'Croissant', price: 3.00, quantity: 1 } // Non-target
  ];

  // 1. Active window evaluation: 20% on €4.00 = €0.80 deduction.
  const disc1 = calculateDiscount(items, dateInWindow);
  assert.strictEqual(disc1, 0.80, 'Discount calculation inside promotion window is incorrect');

  // 2. Out of window evaluation: 0 deduction
  const disc2 = calculateDiscount(items, dateOutWindow);
  assert.strictEqual(disc2, 0.0, 'Discount must be zero outside promotion hours');

  // 3. Wrong day evaluation: 0 deduction
  const disc3 = calculateDiscount(items, dateWrongDay);
  assert.strictEqual(disc3, 0.0, 'Discount must be zero on inactive days of week');

  console.log('✅ test-unit-promotions passed.');
}
