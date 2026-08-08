/**
 * Module 5 — eMenu order integration (T5.4–T5.5)
 */
import { prisma, disconnectDb } from './db.ts';
import { orderService } from '../services/order.service.ts';
import { searchDishesByName, filterDishesByAllergens } from './emenu.ts';
import type { EMenuDish } from './emenu.ts';

const locationId = 'default';
const tableId = `t-em-${Date.now().toString().slice(-5)}`;
const orderId = `ORD-EM-${Date.now().toString().slice(-6)}`;

const sampleDishes: EMenuDish[] = [
  { id: 'd1', categoryId: '1', categoryName: 'Coffee', name: 'Latte', description: '', image: '', basePrice: 4, allergens: ['Dairy'] },
  { id: 'd2', categoryId: '2', categoryName: 'Pastries', name: 'Almond Croissant', description: '', image: '', basePrice: 4.5, allergens: ['Gluten', 'Dairy', 'Nuts'] },
];

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  await prisma.table.delete({ where: { id: tableId } }).catch(() => {});
}

async function main() {
  console.log('--- Module 5 eMenu Integration Test ---');

  try {
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
        number: 'EM-1',
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
      tableId,
      source: 'dine_in',
      status: 'incoming',
      customerName: 'eMenu Guest',
      total: 12.5,
      tipType: 'percent',
      tipValue: 10,
      items: [
        { name: 'Latte', price: 4, quantity: 2 },
        { name: 'Croissant', price: 4.5, quantity: 1 },
      ],
    } as any);

    if (created.status !== 'incoming') {
      console.error('❌ T5.4 Expected incoming status', created);
      process.exit(1);
    }
    console.log('✅ T5.4 eMenu order created with status incoming');

    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!dbOrder || dbOrder.tipType !== 'percent' || dbOrder.tipValue !== 10) {
      console.error('❌ Tip metadata not persisted', dbOrder);
      process.exit(1);
    }
    console.log('✅ T5.4 Tip metadata persisted');

    const active = await orderService.getActiveOrders(locationId);
    if (!active.some((o) => o.id === orderId)) {
      console.error('❌ T5.5 Order not in active list');
      process.exit(1);
    }
    console.log('✅ T5.5 Order visible in active orders (OrdersBoard feed)');

    const search = searchDishesByName(sampleDishes, 'latte');
    if (search.length !== 1) {
      console.error('❌ T5.1 search regression failed');
      process.exit(1);
    }
    const noNuts = filterDishesByAllergens(sampleDishes, ['Nuts']);
    if (noNuts.some((d) => d.name.includes('Almond'))) {
      console.error('❌ T5.2 allergen filter regression failed');
      process.exit(1);
    }
    console.log('✅ T5.1–T5.3 Unit helpers regression ok');

    console.log('--- Module 5 eMenu Integration Test PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  } finally {
    await cleanup().catch(() => {});
    await disconnectDb();
    const { queue } = await import('./queue/index.ts');
    await queue.closeAll().catch(() => {});
  }
}

main();
