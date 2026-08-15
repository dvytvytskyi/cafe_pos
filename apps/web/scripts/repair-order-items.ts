/**
 * Restore line items wiped by the empty-items update bug (pre-2026-08-08).
 * Usage: npx tsx scripts/repair-order-items.ts [orderId]
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

/** Known restoration data for orders corrupted before the items-wipe fix. */
const KNOWN_RESTORATIONS: Record<
  string,
  Array<{ name: string; price: number; quantity: number }>
> = {
  'ORD-6052': [
    { name: 'Matcha Croissant', price: 3.9, quantity: 1 },
    { name: 'Basque Cheesecake', price: 5.5, quantity: 1 },
    { name: 'Corgi Signature Latte', price: 4.5, quantity: 1 },
    { name: 'Matcha Latte', price: 4.2, quantity: 1 },
  ],
};

async function main() {
  const orderId = process.argv[2] ?? 'ORD-6052';
  const { prisma, disconnectDb } = await import('../src/lib/db.ts');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    console.error(`Order not found: ${orderId}`);
    process.exit(1);
  }
  if (order.items.length > 0) {
    console.log(`Order ${order.orderNumber} already has ${order.items.length} items — nothing to do.`);
    await disconnectDb();
    return;
  }

  const template = KNOWN_RESTORATIONS[orderId];
  if (!template) {
    console.error(`No restoration template for ${orderId}. Add entries to KNOWN_RESTORATIONS.`);
    process.exit(1);
  }

  await prisma.orderItem.createMany({
    data: template.map((item) => ({
      orderId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      paid: order.paid,
    })),
  });

  console.log(`Restored ${template.length} items on ${order.orderNumber} (${orderId})`);
  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
