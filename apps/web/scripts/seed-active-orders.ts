/**
 * Replaces active board orders with fresh ones (recent timestamps, readable IDs).
 * Run: npm run seed:active-orders
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
    break;
  } catch {
    /* next */
  }
}

const LOCATIONS = [
  { id: 'default', name: 'Eixample' },
  { id: 'loc-gotico', name: 'Gótico' },
  { id: 'loc-arc', name: 'Arc de Triomf' },
  { id: 'loc-sagrada', name: 'Sagrada Família' },
  { id: 'loc-gracia', name: 'Gràcia' },
] as const;

const MENU_ITEMS = [
  { name: 'Corgi Signature Latte', price: 4.5 },
  { name: 'Avocado Toast', price: 12.5 },
  { name: 'Matcha Croissant', price: 3.9 },
  { name: 'Brunch Plate', price: 14.0 },
  { name: 'Berry Smoothie', price: 5.5 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Minutes ago from now — keeps board times realistic (5m – 3h). */
function minutesAgo(min: number, max: number) {
  return new Date(Date.now() - randInt(min, max) * 60_000);
}

function orderNumberForSource(source: string, seq: number): string {
  if (source === 'glovo') return `GLV-${seq}`;
  if (source === 'ubereats') return `UBR-${seq}`;
  return `ORD-${String(seq).padStart(6, '0')}`;
}

async function main() {
  const { prisma, disconnectDb } = await import('../src/lib/db.ts');

  await prisma.order.updateMany({
    where: { paid: true, status: 'served' },
    data: { status: 'completed' },
  });

  await prisma.order.updateMany({
    where: { source: { in: ['glovo', 'ubereats'] }, status: 'served' },
    data: { status: 'ready' },
  });

  const customers = await prisma.customer.findMany({ select: { id: true }, take: 50 });
  const customerIds = customers.map((c) => c.id);

  const activeIds = (
    await prisma.order.findMany({
      where: { status: { in: ['incoming', 'preparing', 'ready', 'served'] } },
      select: { id: true },
    })
  ).map((o) => o.id);

  if (activeIds.length > 0) {
    await prisma.fiscalRecord.deleteMany({ where: { orderId: { in: activeIds } } });
    await prisma.transaction.deleteMany({ where: { orderId: { in: activeIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: activeIds } } });
    await prisma.order.deleteMany({ where: { id: { in: activeIds } } });
  }

  const statuses = ['incoming', 'preparing', 'ready', 'served'] as const;
  const sources = ['dine_in', 'takeaway', 'glovo', 'ubereats'] as const;
  let seq = 920000;
  let created = 0;

  const ageByStatus: Record<(typeof statuses)[number], [number, number]> = {
    incoming: [5, 25],
    preparing: [15, 90],
    ready: [30, 120],
    served: [45, 180],
  };

  for (const loc of LOCATIONS) {
    for (let i = 0; i < randInt(4, 8); i++) {
      let status = pick([...statuses]);
      const source = pick([...sources]);
      if ((source === 'glovo' || source === 'ubereats') && status === 'served') {
        status = 'ready';
      }
      const [minAge, maxAge] = ageByStatus[status];
      const createdAt = minutesAgo(minAge, maxAge);
      const items = Array.from({ length: randInt(1, 3) }, () => {
        const mi = pick(MENU_ITEMS);
        return { name: mi.name, price: mi.price, quantity: randInt(1, 2), paid: false };
      });
      const total = round2(items.reduce((s, it) => s + it.price * it.quantity, 0));
      const tableNum = randInt(1, 14);
      const isPaid = status === 'served' && source !== 'glovo' && source !== 'ubereats' && Math.random() < 0.35;
      const finalStatus = isPaid ? 'completed' : status;
      const orderNumber = orderNumberForSource(source, seq++);

      await prisma.order.create({
        data: {
          orderNumber,
          source,
          customerName: pick(['Walk-in Guest', 'Maria L.', 'Delivery #4421', 'Table Guest']),
          customerId: customerIds.length && Math.random() < 0.3 ? pick(customerIds) : undefined,
          tableId: source === 'dine_in' ? `tbl-${loc.id}-${tableNum}` : undefined,
          locationId: loc.id,
          status: finalStatus,
          total,
          paid: isPaid,
          amountPaid: isPaid ? total : 0,
          createdAt,
          updatedAt: createdAt,
          items: { create: items },
          transactions: isPaid
            ? {
                create: [
                  {
                    method: pick(['card', 'cash', 'points'] as const),
                    amount: total,
                    createdAt,
                  },
                ],
              }
            : undefined,
        },
      });
      created++;
    }
  }

  const demoTableOrders: Array<{ table: number; status: (typeof statuses)[number] }> = [
    { table: 1, status: 'incoming' },
    { table: 2, status: 'preparing' },
    { table: 3, status: 'ready' },
    { table: 4, status: 'served' },
    { table: 8, status: 'preparing' },
    { table: 9, status: 'served' },
  ];

  for (const demo of demoTableOrders) {
    const items = [{ name: pick(MENU_ITEMS).name, price: pick(MENU_ITEMS).price, quantity: 1, paid: false }];
    const total = round2(items[0].price);
    const createdAt = minutesAgo(10, 45);
    await prisma.order.create({
      data: {
        orderNumber: `ORD-${String(seq++).padStart(6, '0')}`,
        source: 'dine_in',
        customerName: `Table ${demo.table}`,
        tableId: `tbl-default-${demo.table}`,
        locationId: 'default',
        status: demo.status,
        total,
        paid: false,
        amountPaid: 0,
        createdAt,
        updatedAt: createdAt,
        items: { create: items },
      },
    });
    created++;
  }

  console.log(`✅ Replaced board with ${created} active orders (Aug 8, 2026 — recent timestamps)`);

  try {
    const { cache } = await import('../src/lib/cache/index.ts');
    await cache.delete('active_orders_all');
    for (const loc of LOCATIONS) {
      await cache.delete(`active_orders_${loc.id}`);
    }
  } catch {
    /* cache optional in seed context */
  }

  await disconnectDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
