/**
 * Module 2 — POS order flow integration (T2.5–T2.7)
 */
import { prisma, disconnectDb } from './db.ts';
import { orderService } from '../services/order.service.ts';
import { cache } from './cache/index.ts';

const locationId = 'default';
const tableId = `tab-pos-${Date.now()}`;
const orderId = `ORD-POS-${Date.now().toString().slice(-6)}`;

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  await prisma.table.delete({ where: { id: tableId } }).catch(() => {});
}

async function main() {
  console.log('--- Starting POS Order Flow Integration Test ---');

  try {
    await cache.delete(`active_orders_${locationId}`);
    await cleanup();

    await prisma.location.upsert({
      where: { id: locationId },
      create: { id: locationId, name: 'Default', address: 'Main' },
      update: {},
    });

    await prisma.table.upsert({
      where: { id: tableId },
      create: {
        id: tableId,
        locationId,
        number: 'POS-1',
        x: 100,
        y: 100,
        width: 60,
        height: 60,
        shape: 'rect',
        status: 'available',
        roomId: 'room-main',
        roomName: 'Main',
        seats: 4,
      },
      update: {},
    });

    const created = await orderService.createOrder({
      id: orderId,
      locationId,
      source: 'dine_in',
      status: 'preparing',
      tableId,
      customerName: 'Table POS-1',
      total: 9,
      items: [{ name: 'Cappuccino', price: 4.5, quantity: 2, comments: 'no sugar' }],
    } as any);

    if (created.status !== 'preparing') {
      console.error('❌ Create failed', created);
      process.exit(1);
    }
    console.log('✅ T2.5: POST order with status preparing');

    const active = await orderService.getActiveOrders(locationId);
    const found = active.find((o) => o.id === orderId);
    if (!found || found.tableId !== tableId) {
      console.error('❌ Active orders missing created order', active);
      process.exit(1);
    }
    console.log('✅ T2.5: Active orders include preparing order on table');

    const updated = await orderService.updateOrder(orderId, {
      items: [{ name: 'Cappuccino', price: 4.5, quantity: 3, comments: 'no sugar' }],
      total: 14.85,
      customerName: 'Table POS-1',
    } as any);

    if (!updated.items || updated.items.length !== 1 || updated.total !== 14.85) {
      console.error('❌ T2.6 PUT update failed', updated);
      process.exit(1);
    }
    console.log('✅ T2.6: Order items updated');

    const cached = await cache.get(`active_orders_${locationId}`);
    if (cached !== null) {
      console.error('❌ T2.7 Cache should be invalidated after update');
      process.exit(1);
    }
    console.log('✅ T2.7: Cache invalidated after order update');

    console.log('--- POS Order Flow Integration Test PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  } finally {
    await cleanup().catch(() => {});
    await disconnectDb();
  }
}

main();
