import assert from 'assert';
import {
  checkOverlap,
  isWithinCanvasBounds,
  validateTableDimensions,
  validateRoomLayout,
  LayoutValidationError,
  LAYOUT_CANVAS_SIZE,
} from './tables-validation.ts';
import { resolveTableDisplayStatus } from './table-status-sync.ts';
import type { Order } from './orders.ts';

export async function run() {
  console.log('Running test-unit-tables-layout...');

  const table1 = { x: 10, y: 10, w: 50, h: 50 };
  const table2Overlap = { x: 30, y: 30, w: 50, h: 50 };
  const table3Clear = { x: 100, y: 10, w: 50, h: 50 };

  // T1.1 — overlap
  assert.strictEqual(checkOverlap(table1, table2Overlap), true, 'Table overlap should be detected');
  assert.strictEqual(checkOverlap(table1, table3Clear), false, 'Clear layout tables should not overlap');

  // T1.2 — canvas bounds
  assert.strictEqual(
    isWithinCanvasBounds({ x: 0, y: 0, width: 60, height: 60 }, LAYOUT_CANVAS_SIZE),
    true,
  );
  assert.strictEqual(
    isWithinCanvasBounds({ x: LAYOUT_CANVAS_SIZE - 30, y: 0, width: 60, height: 60 }, LAYOUT_CANVAS_SIZE),
    false,
  );

    // T1.3 — negative size
    assert.ok(validateTableDimensions({ width: -10, height: 50 })?.includes('invalid size'));

  assert.throws(
    () =>
      validateRoomLayout([
        {
          id: 'room-1',
          name: 'Main',
          tables: [{ id: 't1', x: 10, y: 10, width: -5, height: 50, type: 'rect', name: '1' }],
          zones: [],
          obstacles: [],
        },
      ]),
    LayoutValidationError,
  );

  // Table status sync from active orders
  const orders: Order[] = [
    {
      id: 'ORD-1',
      source: 'dine_in',
      customerName: 'Guest',
      items: [],
      total: 10,
      status: 'preparing',
      time: new Date(),
      paid: false,
      orderedBy: 'waiter',
      tableId: 't1',
    },
  ];
  assert.strictEqual(resolveTableDisplayStatus('available', orders, 't1'), 'preparing');
  assert.strictEqual(resolveTableDisplayStatus('billed', orders, 't1'), 'billed');
  assert.strictEqual(resolveTableDisplayStatus('dirty', orders, 't1'), 'preparing');
  assert.strictEqual(resolveTableDisplayStatus('dirty', [], 't1'), 'available');
  assert.strictEqual(resolveTableDisplayStatus('occupied', [], 't1'), 'occupied');
  assert.strictEqual(resolveTableDisplayStatus('billed', [], 't9'), 'billed');
  assert.strictEqual(resolveTableDisplayStatus('available', [], 't1'), 'available');

  const servedOrders: Order[] = [
    {
      ...orders[0],
      id: 'ORD-2',
      status: 'served',
      tableId: 't2',
    },
  ];
  assert.strictEqual(resolveTableDisplayStatus('available', servedOrders, 't2'), 'served');

  console.log('✅ test-unit-tables-layout passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
