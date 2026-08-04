import assert from 'assert';
import { mapApiOrderToUi, mapUiOrderToApi } from './mappers/order.mapper.ts';

export async function run() {
  console.log('Running test-unit-order-mapper...');

  const apiOrder = {
    id: 'ORD-100',
    tableId: 't1',
    locationId: 'default',
    source: 'dine_in',
    status: 'preparing',
    paymentStatus: 'unpaid' as const,
    total: 18,
    createdAt: '2026-08-04T10:00:00.000Z',
    customerName: 'Table 1',
    customerId: 'g-1',
    items: [{ name: 'Latte', price: 4.5, quantity: 2, comments: 'extra hot' }],
  };

  const ui = mapApiOrderToUi(apiOrder);
  assert.strictEqual(ui.id, 'ORD-100');
  assert.strictEqual(ui.paid, false);
  assert.strictEqual(ui.status, 'preparing');
  assert.ok(ui.time instanceof Date);
  assert.strictEqual(ui.items[0].comments, 'extra hot');

  const apiPayload = mapUiOrderToApi({
    source: 'dine_in',
    status: 'preparing',
    tableId: 't1',
    locationId: 'default',
    total: 18,
    customerName: 'Table 1',
    items: [{ name: 'Latte', price: 4.5, quantity: 2, comments: 'extra hot' }],
  });

  assert.strictEqual(apiPayload.locationId, 'default');
  assert.strictEqual(apiPayload.source, 'dine_in');
  assert.strictEqual(apiPayload.status, 'preparing');
  assert.strictEqual(apiPayload.tableId, 't1');
  assert.ok(Array.isArray(apiPayload.items));

  const roundTrip = mapApiOrderToUi({
    ...apiOrder,
    ...apiPayload,
    id: 'ORD-100',
    createdAt: apiOrder.createdAt,
  } as any);
  assert.strictEqual(roundTrip.tableId, 't1');
  assert.strictEqual(roundTrip.items.length, 1);

  console.log('✅ test-unit-order-mapper passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
