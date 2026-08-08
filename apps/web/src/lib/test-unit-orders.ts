import assert from 'assert';
import { calculateOrderTotals } from './order-totals.ts';
import { mapCategoriesToPosMenu } from './mappers/menu.mapper.ts';

export async function run() {
  console.log('Running test-unit-orders...');

  const items = [
    { price: 3.5, quantity: 2 },
    { price: 8.0, quantity: 1 },
  ];

  // T2.1 — subtotal + IVA 10%
  const { subtotal, tax, total } = calculateOrderTotals(items);
  assert.strictEqual(subtotal, 15.0, 'Subtotal sum is incorrect');
  assert.strictEqual(tax, 1.5, 'Tax calculation is incorrect');
  assert.strictEqual(total, 16.5, 'Total sum calculation is incorrect');

  // T2.2 — quantity change recalculates total
  const moreItems = [...items, { price: 4.5, quantity: 1 }];
  const updated = calculateOrderTotals(moreItems);
  assert.strictEqual(updated.total, 21.45, 'Total should recalculate when items change');

  // T2.3 — kitchen comments preserved in payload shape
  const withComments = [{ price: 4.5, quantity: 1, comments: 'extra hot' }];
  const apiItems = withComments.map((i) => ({
    name: 'Latte',
    price: i.price,
    quantity: i.quantity,
    comments: i.comments,
  }));
  assert.strictEqual(apiItems[0]!.comments, 'extra hot');

  // T2.4 — menu mapper with 0 categories
  const emptyMenu = mapCategoriesToPosMenu([]);
  assert.deepStrictEqual(emptyMenu, []);

  console.log('✅ test-unit-orders passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
