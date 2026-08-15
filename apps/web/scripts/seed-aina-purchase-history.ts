/**
 * Seed paid purchase history + loyalty earn rows for Aina Díaz (CRM demo).
 * Run: npx tsx scripts/seed-aina-purchase-history.ts
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

const BRONZE_RATE = 0.05;

const PURCHASES = [
  {
    daysAgo: 2,
    items: [
      { name: 'Matcha Latte', price: 4.5, quantity: 2 },
      { name: 'Brunch Plate', price: 14.5, quantity: 1 },
    ],
    method: 'card' as const,
  },
  {
    daysAgo: 8,
    items: [{ name: 'Brunch Plate', price: 14.5, quantity: 1 }, { name: 'Flat White', price: 3.8, quantity: 1 }],
    method: 'card' as const,
  },
  {
    daysAgo: 14,
    items: [{ name: 'Matcha Latte', price: 4.5, quantity: 1 }, { name: 'Avocado Toast', price: 9.5, quantity: 1 }],
    method: 'cash' as const,
  },
  {
    daysAgo: 21,
    items: [{ name: 'Brunch Plate', price: 14.5, quantity: 2 }],
    method: 'card' as const,
  },
  {
    daysAgo: 28,
    items: [{ name: 'Cappuccino', price: 3.5, quantity: 2 }, { name: 'Croissant', price: 3.2, quantity: 2 }],
    method: 'cash' as const,
  },
  {
    daysAgo: 35,
    items: [{ name: 'Matcha Latte', price: 4.5, quantity: 1 }, { name: 'Brunch Plate', price: 14.5, quantity: 1 }],
    method: 'card' as const,
  },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function daysAgoDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12 + (daysAgo % 5), 15, 0, 0);
  return d;
}

async function main() {
  const { prisma, disconnectDb } = await import('../src/lib/db');

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: 'guest102@example.com' },
        { AND: [{ name: { contains: 'Aina', mode: 'insensitive' } }, { name: { contains: 'Díaz', mode: 'insensitive' } }] },
        { phone: '+34610000102' },
      ],
    },
  });

  if (!customer) {
    console.error('❌ Aina Díaz not found. Run npm run seed:demo first or create the guest in CRM.');
    process.exit(1);
  }

  console.log(`Found guest: ${customer.name} (${customer.id})`);

  const prefix = `ORD-AINA-${Date.now()}`;
  let created = 0;

  for (let i = 0; i < PURCHASES.length; i++) {
    const p = PURCHASES[i];
    const total = round2(p.items.reduce((s, it) => s + it.price * it.quantity, 0));
    const createdAt = daysAgoDate(p.daysAgo);
    const orderNumber = `${prefix}-${i + 1}`;

    const existing = await prisma.order.findUnique({ where: { orderNumber } });
    if (existing) continue;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        source: 'dine_in',
        customerName: customer.name,
        customerId: customer.id,
        loyaltyGuestIds: [customer.id],
        locationId: 'default',
        status: 'completed',
        total,
        paid: true,
        amountPaid: total,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: p.items.map((it) => ({ ...it, paid: true })),
        },
        transactions: {
          create: [{ method: p.method, amount: total, createdAt }],
        },
      },
    });

    const pointsEarned = round2(total * BRONZE_RATE);
    await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: 'earn',
        points: pointsEarned,
        orderId: order.id,
        createdAt,
      },
    });

    created++;
    console.log(`  ✅ ${orderNumber} — €${total.toFixed(2)} (+${pointsEarned.toFixed(2)} pts)`);
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      lastVisitDate: new Date().toISOString().slice(0, 10),
      favoriteDishes: ['Matcha Latte', 'Brunch Plate'],
    },
  });

  console.log(`\n✅ Created ${created} purchase history rows for ${customer.name}`);
  console.log('   Open /crm, search "Aina Díaz", check Purchase History.');

  await disconnectDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
