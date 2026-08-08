/**
 * Module 6 — OrdersBoard integration (T6.4–T6.7)
 */
import { prisma, disconnectDb } from './db.ts';
import { orderService } from '../services/order.service.ts';
import { cache } from './cache/index.ts';
import Redis from 'ioredis';

const locationId = 'default';
const orderId = `ORD-KDS-${Date.now().toString().slice(-6)}`;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function cleanup() {
  await cache.delete(`active_orders_${locationId}`).catch(() => {});
  await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
}

async function main() {
  console.log('--- Module 6 OrdersBoard Integration Test ---');

  const subRedis = new Redis(REDIS_URL);
  const pubEvents: Array<{ name: string; payload: { orderId?: string } }> = [];
  await subRedis.subscribe('pos-events');
  subRedis.on('message', (_channel, message) => {
    try {
      pubEvents.push(JSON.parse(message));
    } catch {
      /* ignore */
    }
  });

  try {
    await cleanup();

    await prisma.location.upsert({
      where: { id: locationId },
      create: { id: locationId, name: 'Default', address: 'Main' },
      update: {},
    });

    await orderService.createOrder({
      id: orderId,
      locationId,
      source: 'takeaway',
      status: 'incoming',
      customerName: 'KDS Test',
      total: 8.5,
      items: [
        { name: 'Latte', price: 4.5, quantity: 1 },
        { name: 'Muffin', price: 4, quantity: 1 },
      ],
    } as any);
    console.log('✅ T6.4 Order created with incoming status');

    const active = await orderService.getActiveOrders(locationId);
    if (!active.some((o) => o.id === orderId)) {
      console.error('❌ Order missing from active list');
      process.exitCode = 1;
      return;
    }
    console.log('✅ T6.4 Active list includes new order');

    await orderService.updateOrderStatus(orderId, 'preparing');
    const dbPreparing = await prisma.order.findUnique({ where: { id: orderId } });
    if (dbPreparing?.status !== 'preparing') {
      console.error('❌ T6.4 Status not persisted');
      process.exitCode = 1;
      return;
    }
    console.log('✅ T6.4 Status PUT → preparing persisted');

    const cached = await cache.get(`active_orders_${locationId}`);
    if (cached !== null) {
      console.error('❌ T6.6 Cache should be invalidated after status change');
      process.exitCode = 1;
      return;
    }
    console.log('✅ T6.6 Cache invalidated on status change');

    await orderService.updateOrderStatus(orderId, 'ready');
    console.log('✅ T6.8 preparing → ready via service');

    await new Promise((r) => setTimeout(r, 600));
    const wsEvent = pubEvents.find(
      (e) =>
        (e.name === 'order:created' || e.name === 'order:updated') &&
        e.payload?.orderId === orderId,
    );
    if (!wsEvent) {
      console.error('❌ T6.7 Redis pub/sub did not receive order event', pubEvents);
      process.exitCode = 1;
      return;
    }
    console.log('✅ T6.7 WS broadcast path (Redis pos-events) verified');

    console.log('--- Module 6 OrdersBoard Integration Test PASSED ---');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exitCode = 1;
  } finally {
    await subRedis.unsubscribe('pos-events').catch(() => {});
    await subRedis.quit().catch(() => {});
    await cleanup().catch(() => {});
    await disconnectDb();
    const { queue } = await import('./queue/index.ts');
    await queue.closeAll().catch(() => {});
    process.exit(process.exitCode ?? 0);
  }
}

main();
