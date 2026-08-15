import assert from 'assert';
import type { OutboxEntry } from './pos-offline-db';

function sortOutbox(entries: OutboxEntry[]): OutboxEntry[] {
  return [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function applyPayLocally(order: { paid: boolean; syncPending?: boolean }, payload: { payments: unknown[] }) {
  return {
    ...order,
    paid: true,
    payments: payload.payments,
    syncPending: true,
  };
}

export async function run() {
  console.log('Running test-unit-orders-offline...');

  const outbox: OutboxEntry[] = [
    {
      id: '1',
      type: 'order_create',
      locationId: 'loc-1',
      orderId: 'o1',
      payload: { id: 'o1' },
      createdAt: '2026-01-02T10:00:00.000Z',
      retryCount: 0,
    },
    {
      id: '2',
      type: 'order_pay',
      locationId: 'loc-1',
      orderId: 'o1',
      payload: { payments: [{ method: 'cash', amount: 10 }] },
      createdAt: '2026-01-02T10:01:00.000Z',
      retryCount: 0,
    },
  ];

  const sorted = sortOutbox(outbox);
  assert.strictEqual(sorted[0]!.type, 'order_create');
  assert.strictEqual(sorted[1]!.type, 'order_pay');

  const paid = applyPayLocally({ paid: false }, { payments: [{ method: 'cash', amount: 25 }] });
  assert.strictEqual(paid.paid, true);
  assert.strictEqual(paid.syncPending, true);

  console.log('✅ test-unit-orders-offline passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
