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

async function main() {
  const { prisma, disconnectDb } = await import('../src/lib/db.ts');

  const stats = {
    locations: await prisma.location.count(),
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    reviews: await prisma.customerReview.count(),
    fiscalRecords: await prisma.fiscalRecord.count(),
    cashShifts: await prisma.cashShift.count(),
    shiftSchedules: await prisma.shiftSchedule.count(),
    users: await prisma.user.count(),
    tasks: await prisma.task.count(),
    dailyChecklists: await prisma.dailyChecklist.count(),
    auditLogs: await prisma.auditLog.count(),
    stockTransfers: await prisma.stockTransfer.count(),
    timeCards: await prisma.timeCard.count(),
    giftCards: await prisma.giftCard.count(),
    tables: await prisma.table.count(),
    menuItems: await prisma.menuItem.count(),
    transactions: await prisma.transaction.count(),
    activeOrders: await prisma.order.count({
      where: { status: { in: ['incoming', 'preparing', 'ready', 'served'] } },
    }),
    completedOrders: await prisma.order.count({ where: { status: 'completed' } }),
  };

  console.log(JSON.stringify(stats, null, 2));
  await disconnectDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
