import assert from 'assert';
import {
  filterOrdersForColumn,
  sortOrdersNewestFirst,
  groupItemsKitchenVsBar,
  isBarItem,
  getOrderDisplayLabel,
  getStatusAfterPreparing,
  getBoardColumnStatus,
  normalizeBoardOrder,
  coerceStatusForSource,
} from './orders-board.ts';
import { formatTimeAgo } from './format-time.ts';

const sampleOrders = [
  { id: '1', status: 'preparing', source: 'dine_in', time: new Date('2026-01-01T12:00:00Z') },
  { id: '2', status: 'ready', source: 'glovo', time: new Date('2026-01-01T11:00:00Z') },
  { id: '3', status: 'preparing', source: 'ubereats', time: new Date('2026-01-01T10:00:00Z') },
  { id: '4', status: 'served', source: 'takeaway', time: new Date('2026-01-01T09:00:00Z') },
];

export async function run() {
  console.log('Running test-unit-orders-board...');

  // T6.1 — filter by column + source
  const preparingAll = filterOrdersForColumn(sampleOrders, 'preparing', 'all');
  assert.strictEqual(preparingAll.length, 2);
  assert.ok(preparingAll.every((o) => o.status === 'preparing'));

  const preparingGlovo = filterOrdersForColumn(sampleOrders, 'preparing', 'glovo');
  assert.strictEqual(preparingGlovo.length, 0);

  const readyUber = filterOrdersForColumn(sampleOrders, 'ready', 'ubereats');
  assert.strictEqual(readyUber.length, 0);

  const readyGlovo = filterOrdersForColumn(sampleOrders, 'ready', 'glovo');
  assert.strictEqual(readyGlovo.length, 1);
  assert.strictEqual(readyGlovo[0].id, '2');

  const dineIn = filterOrdersForColumn(sampleOrders, 'served', 'dine_in');
  assert.strictEqual(dineIn.length, 1);
  assert.strictEqual(dineIn[0].source, 'takeaway');

  // T6.2 — newest first
  const sorted = sortOrdersNewestFirst([
    { status: 'preparing', source: 'dine_in', time: new Date('2026-01-01T15:00:00Z') },
    { status: 'preparing', source: 'dine_in', time: new Date('2026-01-01T08:00:00Z') },
    { status: 'preparing', source: 'dine_in', time: new Date('2026-01-01T12:00:00Z') },
  ]);
  assert.strictEqual(sorted[0].time.getTime(), new Date('2026-01-01T15:00:00Z').getTime());
  assert.strictEqual(sorted[2].time.getTime(), new Date('2026-01-01T08:00:00Z').getTime());

  const colSorted = sortOrdersNewestFirst(filterOrdersForColumn(sampleOrders, 'preparing', 'all'));
  assert.strictEqual(colSorted[0].id, '1');
  assert.strictEqual(colSorted[1].id, '3');

  // T6.3 — kitchen vs bar grouping
  assert.strictEqual(isBarItem('Iced Latte'), true);
  assert.strictEqual(isBarItem('Avocado Toast'), false);

  const grouped = groupItemsKitchenVsBar([
    { name: 'Flat White', quantity: 2 },
    { name: 'Croissant', quantity: 1 },
    { name: 'Fresh Juice', quantity: 1 },
  ]);
  assert.deepStrictEqual(grouped.bar, ['2x Flat White', '1x Fresh Juice']);
  assert.deepStrictEqual(grouped.kitchen, ['1x Croissant']);

  const now = new Date('2026-08-08T18:00:00Z');
  assert.strictEqual(formatTimeAgo(new Date('2026-08-08T17:50:00Z'), now), '10m ago');
  assert.strictEqual(formatTimeAgo(new Date('2026-08-08T16:00:00Z'), now), '2h ago');
  assert.strictEqual(formatTimeAgo(new Date('2026-08-07T18:00:00Z'), now), '1 day ago');
  assert.strictEqual(formatTimeAgo(new Date('2026-08-01T18:00:00Z'), now), '1 week ago');

  assert.strictEqual(getOrderDisplayLabel({ id: 'uuid', orderNumber: 'ORD-000123' }), 'ORD-000123');
  assert.strictEqual(getOrderDisplayLabel({ id: 'abcdef12-3456' }), 'ABCDEF12');

  // Delivery skips Served — preparing → ready, served status maps to ready column
  assert.strictEqual(getStatusAfterPreparing('glovo'), 'ready');
  assert.strictEqual(getStatusAfterPreparing('ubereats'), 'ready');
  assert.strictEqual(getStatusAfterPreparing('dine_in'), 'served');
  assert.strictEqual(getStatusAfterPreparing('takeaway'), 'completed');
  assert.strictEqual(coerceStatusForSource('glovo', 'served'), 'ready');
  assert.strictEqual(getBoardColumnStatus({ status: 'served', source: 'glovo' }), 'ready');
  assert.strictEqual(
    filterOrdersForColumn(
      [{ id: 'd1', status: 'served', source: 'glovo', time: new Date() }],
      'ready',
      'all'
    ).length,
    1
  );
  assert.strictEqual(normalizeBoardOrder({ status: 'served', source: 'ubereats' }).status, 'ready');

  console.log('✅ test-unit-orders-board passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
