/**
 * Module 33 — financial reports integration tests
 */
import { prisma, disconnectDb } from './db.ts';
import { classifyAbcAnalysis } from './reports-financial.ts';

const BASE = 'http://localhost:3000';
const LOC = 'default';
const PREFIX = 'M33-Report';

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { order: { customerName: { startsWith: PREFIX } } } });
  await prisma.order.deleteMany({ where: { customerName: { startsWith: PREFIX } } });
}

async function main() {
  console.log('--- Module 33 Reports Integration Tests ---');
  await cleanup();

  await prisma.location.upsert({
    where: { id: LOC },
    create: { id: LOC, name: 'Default Location' },
    update: {},
  });

  const today = new Date().toISOString().slice(0, 10);

  await prisma.order.create({
    data: {
      id: `${PREFIX}-1`,
      orderNumber: `${PREFIX}-ORD-1`,
      source: 'dine_in',
      customerName: `${PREFIX}-Guest-1`,
      locationId: LOC,
      status: 'completed',
      total: 33,
      paid: true,
      amountPaid: 33,
      createdAt: new Date(),
      items: {
        create: [
          { name: `${PREFIX}-Latte`, price: 11, quantity: 2 },
          { name: `${PREFIX}-Toast`, price: 11, quantity: 1 },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      id: `${PREFIX}-2`,
      orderNumber: `${PREFIX}-ORD-2`,
      source: 'takeaway',
      customerName: `${PREFIX}-Guest-2`,
      locationId: LOC,
      status: 'completed',
      total: 22,
      paid: true,
      amountPaid: 22,
      createdAt: new Date(),
      items: { create: [{ name: `${PREFIX}-Latte`, price: 22, quantity: 1 }] },
    },
  });

  const res = await fetch(`${BASE}/api/reports/financial?startDate=${today}&endDate=${today}&locationId=${LOC}`);
  const body = await res.json();
  if (res.status !== 200 || !body.summary) {
    console.error('❌ GET financial report failed', res.status, body);
    process.exit(1);
  }
  console.log('✅ GET /api/reports/financial');

  const expectedGross = 55;
  if (Math.abs(body.summary.grossRevenue - expectedGross) > 0.01) {
    console.error('❌ gross revenue mismatch', body.summary.grossRevenue, expectedGross);
    process.exit(1);
  }
  console.log('✅ T33.4 summary gross revenue matches seeded orders');

  const latte = body.dishes.find((d: { name: string }) => d.name === `${PREFIX}-Latte`);
  if (!latte || latte.quantity !== 3) {
    console.error('❌ dish GROUP BY quantity failed', body.dishes);
    process.exit(1);
  }
  console.log('✅ T33.4 dish aggregation by name');

  const localAbc = classifyAbcAnalysis([
    { name: `${PREFIX}-Latte`, category: 'Menu', revenue: 44, quantity: 3 },
    { name: `${PREFIX}-Toast`, category: 'Menu', revenue: 11, quantity: 1 },
  ]);
  if (body.dishes[0]?.abcClass !== localAbc[0]?.abcClass) {
    console.error('❌ ABC class mismatch', body.dishes[0], localAbc[0]);
    process.exit(1);
  }
  console.log('✅ T33.4 ABC classes in API response');

  if (!Array.isArray(body.revenueByDay) || body.revenueByDay.length === 0) {
    console.error('❌ revenueByDay missing', body.revenueByDay);
    process.exit(1);
  }
  console.log('✅ T33.4 revenue grouped by day');

  const bad = await fetch(`${BASE}/api/reports/financial?startDate=bad&endDate=${today}`);
  if (bad.status !== 400) {
    console.error('❌ invalid date expected 400');
    process.exit(1);
  }
  console.log('✅ invalid date → 400');

  await cleanup();
  await disconnectDb();
  console.log('--- Module 33 Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
