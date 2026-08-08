import assert from 'assert';

// T3.1 / T3.2 — Happy Hour discount window (payment checkout context)
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

const happyHour: Promotion = {
  name: 'Happy Hour Friday',
  discountPercent: 20,
  activeDays: [5],
  startHour: 18,
  endHour: 20,
  targetItems: ['Espresso', 'Orange Juice'],
};

function calculateHappyHourDeduction(items: OrderItem[], date: Date): number {
  const day = date.getDay();
  const hour = date.getHours();
  if (!happyHour.activeDays.includes(day) || hour < happyHour.startHour || hour >= happyHour.endHour) {
    return 0;
  }
  let deduction = 0;
  for (const item of items) {
    if (happyHour.targetItems.includes(item.name)) {
      deduction += item.price * item.quantity * (happyHour.discountPercent / 100);
    }
  }
  return parseFloat(deduction.toFixed(2));
}

// T3.3 / T3.4 — Gift card validation before pay
interface GiftCard {
  balance: number;
  expiryDate: string;
  status: 'active' | 'redeemed' | 'expired';
}

function validateGiftCardPayment(card: GiftCard, amount: number, now: Date): { ok: boolean; error?: string } {
  if (card.status !== 'active') return { ok: false, error: `Gift Card is ${card.status}.` };
  if (new Date(card.expiryDate).getTime() < now.getTime()) return { ok: false, error: 'Gift Card has expired.' };
  if (card.balance < amount - 0.001) {
    return { ok: false, error: `Insufficient gift card balance (Available: €${card.balance.toFixed(2)})` };
  }
  return { ok: true };
}

// T3.5 — Split payment balance check
function isPaymentBalanced(total: number, amountPaid: number, payments: { amount: number }[]): boolean {
  const sum = payments.reduce((s, p) => s + p.amount, 0);
  return Math.abs(sum - (amountPaid || 0)) < 0.01 && amountPaid >= total - 0.01;
}

export async function run() {
  console.log('Running test-unit-payment...');

  const items = [
    { name: 'Espresso', price: 2, quantity: 2 },
    { name: 'Croissant', price: 3, quantity: 1 },
  ];

  const t31 = calculateHappyHourDeduction(items, new Date('2026-08-07T19:00:00'));
  assert.strictEqual(t31, 0.8, 'T3.1 Happy Hour window overlap');

  const t32 = calculateHappyHourDeduction(items, new Date('2026-08-08T19:00:00'));
  assert.strictEqual(t32, 0, 'T3.2 Happy Hour wrong day');

  const gc: GiftCard = { balance: 15, expiryDate: '2027-01-01', status: 'active' };
  const t33 = validateGiftCardPayment(gc, 20, new Date('2026-08-05'));
  assert.strictEqual(t33.ok, false, 'T3.3 Gift card balance limit');
  assert.ok(t33.error?.includes('Insufficient'), 'T3.3 error message');

  const expired: GiftCard = { balance: 50, expiryDate: '2026-01-01', status: 'active' };
  const t34 = validateGiftCardPayment(expired, 10, new Date('2026-08-05'));
  assert.strictEqual(t34.ok, false, 'T3.4 Gift card expired');

  const t35 = isPaymentBalanced(40, 40, [
    { amount: 20 },
    { amount: 20 },
  ]);
  assert.strictEqual(t35, true, 'T3.5 Split payment sum = total');

  console.log('✅ test-unit-payment passed (T3.1–T3.5).');
}
