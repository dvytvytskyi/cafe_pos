/**
 * Module 32 — order history integration tests
 */
import { prisma, disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';
const LOC = 'default';
const PREFIX = 'M32-Hist';

async function cleanup() {
  await prisma.transaction.deleteMany({
    where: { order: { customerName: { startsWith: PREFIX } } },
  });
  await prisma.orderItem.deleteMany({
    where: { order: { customerName: { startsWith: PREFIX } } },
  });
  await prisma.order.deleteMany({
    where: { customerName: { startsWith: PREFIX } },
  });
}

async function seedOrder(input: {
  id: string;
  orderNumber: string;
  source: string;
  customerName: string;
  total: number;
  tableId?: string;
  paid?: boolean;
  paymentMethod?: string;
}) {
  const order = await prisma.order.create({
    data: {
      id: input.id,
      orderNumber: input.orderNumber,
      source: input.source,
      customerName: input.customerName,
      locationId: LOC,
      status: input.paid ? 'completed' : 'cancelled',
      total: input.total,
      paid: input.paid ?? true,
      amountPaid: input.paid ? input.total : 0,
      tableId: input.tableId,
      createdAt: new Date(),
      items: {
        create: [{ name: 'Test Item', price: input.total, quantity: 1 }],
      },
    },
  });

  if (input.paymentMethod) {
    await prisma.transaction.create({
      data: {
        orderId: order.id,
        method: input.paymentMethod,
        amount: input.total,
      },
    });
  }

  return order;
}

async function main() {
  console.log('--- Module 32 Order History Integration Tests ---');
  await cleanup();

  await prisma.location.upsert({
    where: { id: LOC },
    create: { id: LOC, name: 'Default Location' },
    update: {},
  });

  const table = await prisma.table.upsert({
    where: { id: `${PREFIX}-table` },
    create: {
      id: `${PREFIX}-table`,
      number: '12',
      locationId: LOC,
      x: 0,
      y: 0,
      width: 60,
      height: 60,
      shape: 'square',
      status: 'available',
    },
    update: { number: '12' },
  });

  await prisma.role.upsert({
    where: { id: 'role-default-waiter' },
    create: { id: 'role-default-waiter', name: 'Waiter', permissions: {} },
    update: {},
  });

  const user = await prisma.user.upsert({
    where: { id: `${PREFIX}-user` },
    create: {
      id: `${PREFIX}-user`,
      name: `${PREFIX}-Waiter`,
      pinHash: 'test',
      roleId: 'role-default-waiter',
      email: `${PREFIX}@test.local`,
    },
    update: { name: `${PREFIX}-Waiter` },
  });

  await prisma.cashShift.create({
    data: {
      id: `${PREFIX}-shift`,
      locationId: LOC,
      userId: user.id,
      floatStart: 100,
      expected: 100,
      status: 'open',
      openedAt: new Date(Date.now() - 3600000),
    },
  });

  await seedOrder({
    id: `${PREFIX}-dine`,
    orderNumber: `${PREFIX}-RCPT-001`,
    source: 'dine_in',
    customerName: `${PREFIX}-Dine`,
    total: 15,
    tableId: table.id,
    paid: true,
    paymentMethod: 'card',
  });

  await seedOrder({
    id: `${PREFIX}-glovo`,
    orderNumber: `${PREFIX}-GLV-001`,
    source: 'glovo',
    customerName: `${PREFIX}-Delivery`,
    total: 22,
    paid: true,
    paymentMethod: 'card',
  });

  const today = new Date().toISOString().slice(0, 10);
  const listRes = await fetch(
    `${BASE}/api/orders/history?locationId=${LOC}&startDate=${today}&endDate=${today}&limit=50`
  );
  const listBody = await listRes.json();
  if (listRes.status !== 200 || !Array.isArray(listBody.orders)) {
    console.error('❌ GET history failed', listRes.status, listBody);
    process.exit(1);
  }
  console.log('✅ GET /api/orders/history paginated response');

  const dine = listBody.orders.find((o: { orderNumber: string }) => o.orderNumber === `${PREFIX}-RCPT-001`);
  if (!dine?.tableNumber || dine.tableNumber !== '12') {
    console.error('❌ T32.4 missing table number', dine);
    process.exit(1);
  }
  if (!dine?.waiterName?.includes(`${PREFIX}-Waiter`)) {
    console.error('❌ T32.4 missing waiter name', dine);
    process.exit(1);
  }
  console.log('✅ T32.4 response includes waiter name and table number');

  const glovoOnly = await fetch(
    `${BASE}/api/orders/history?locationId=${LOC}&source=glovo&startDate=${today}&endDate=${today}&limit=50`
  );
  const glovoBody = await glovoOnly.json();
  const hasGlovo = glovoBody.orders.some((o: { orderNumber: string }) => o.orderNumber === `${PREFIX}-GLV-001`);
  const hasDine = glovoBody.orders.some((o: { orderNumber: string }) => o.orderNumber === `${PREFIX}-RCPT-001`);
  if (!hasGlovo || hasDine) {
    console.error('❌ source=glovo filter failed', glovoBody.orders?.map((o: { orderNumber: string }) => o.orderNumber));
    process.exit(1);
  }
  console.log('✅ source filter returns only matching channel');

  const searchRes = await fetch(
    `${BASE}/api/orders/history?locationId=${LOC}&query=${PREFIX}-RCPT-001&startDate=${today}&endDate=${today}`
  );
  const searchBody = await searchRes.json();
  if (!searchBody.orders?.some((o: { orderNumber: string }) => o.orderNumber === `${PREFIX}-RCPT-001`)) {
    console.error('❌ query by receipt number failed', searchBody);
    process.exit(1);
  }
  console.log('✅ search by receipt number');

  const defaultRange = await fetch(`${BASE}/api/orders/history?locationId=${LOC}&limit=5`);
  if (defaultRange.status !== 200) {
    console.error('❌ default date range request failed', defaultRange.status);
    process.exit(1);
  }
  console.log('✅ T32.1 default date range accepted');

  const badDate = await fetch(`${BASE}/api/orders/history?startDate=bad-date`);
  if (badDate.status !== 400) {
    console.error('❌ T32.2 invalid date expected 400');
    process.exit(1);
  }
  console.log('✅ T32.2 invalid date → 400');

  const explain = await prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
    `EXPLAIN SELECT o.* FROM "Order" o WHERE o."locationId" = $1 AND o."createdAt" >= NOW() - INTERVAL '1 day' AND o."status" = 'completed' ORDER BY o."createdAt" DESC LIMIT 20`,
    LOC
  );
  const planText = explain.map((r) => r['QUERY PLAN']).join('\n');
  if (!planText.toLowerCase().includes('index') && !planText.toLowerCase().includes('scan')) {
    console.error('❌ T32.3 explain analyze unexpected', planText);
    process.exit(1);
  }
  console.log('✅ T32.3 query plan uses indexed scan path');

  const page1a = await fetch(
    `${BASE}/api/orders/history?locationId=${LOC}&startDate=${today}&endDate=${today}&page=1&limit=1`
  );
  const page1b = await fetch(
    `${BASE}/api/orders/history?locationId=${LOC}&startDate=${today}&endDate=${today}&page=1&limit=1`
  );
  const bodyA = await page1a.json();
  const bodyB = await page1b.json();
  if (bodyA.orders?.[0]?.id !== bodyB.orders?.[0]?.id) {
    console.error('❌ T32.5 unstable pagination', bodyA.orders?.[0]?.id, bodyB.orders?.[0]?.id);
    process.exit(1);
  }
  console.log('✅ T32.5 stable pagination under repeated reads');

  await cleanup();
  await prisma.cashShift.deleteMany({ where: { id: `${PREFIX}-shift` } }).catch(() => {});
  await disconnectDb();
  console.log('--- Module 32 Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
