import assert from 'assert';
import {
  calculateOrderPricing,
  calculateDiscountAmount,
  calculateCashChange,
  isDeliverySource,
} from './order-totals.ts';

export async function run() {
  console.log('Running test-unit-order-pravky...');

  const items = [{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }];

  const percentDisc = calculateOrderPricing(items, {
    discount: { name: '10%', value: 10, type: 'percent' },
  });
  assert.strictEqual(percentDisc.discountAmount, 2.5);

  const fixedDisc = calculateOrderPricing(items, {
    discount: { name: '€3 off', value: 3, type: 'fixed' },
  });
  assert.strictEqual(fixedDisc.discountAmount, 3);

  assert.strictEqual(calculateDiscountAmount(100, { name: 'x', value: 5, type: 'fixed' }), 5);
  assert.strictEqual(calculateDiscountAmount(100, { name: 'x', value: 10, type: 'percent' }), 10);

  const change = calculateCashChange(16.5, 20);
  assert.strictEqual(change.changeGiven, 3.5);

  assert.strictEqual(isDeliverySource('glovo'), true);
  assert.strictEqual(isDeliverySource('dine_in'), false);

  console.log('✅ test-unit-order-pravky passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
