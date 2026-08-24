/**
 * Module 4 — Fiscal integration (T4.3–T4.7)
 */
import { prisma, disconnectDb } from './db.ts';
import {
  disableFiscalImmutabilityTrigger,
  enableFiscalImmutabilityTrigger,
} from './cleanup-test-data.ts';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const locationId = randomUUID();
const orderId = `ORD-FIS-${randomUUID().slice(0, 8)}`;

async function ensureFiscalImmutabilityTrigger() {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION prevent_fiscal_modification()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'Fiscal records are immutable. Modification and deletion are strictly prohibited by VERI*FACTU regulations.';
    END;
    $$ LANGUAGE plpgsql;
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS check_fiscal_immutability ON "FiscalRecord";`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER check_fiscal_immutability
    BEFORE UPDATE OR DELETE ON "FiscalRecord"
    FOR EACH ROW EXECUTE FUNCTION prevent_fiscal_modification();
  `);
}

async function cleanup() {
  await disableFiscalImmutabilityTrigger(prisma);
  try {
    await prisma.fiscalRecord.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    const fiscalTestLocs = await prisma.location.findMany({
      where: { name: 'Fiscal Test' },
      select: { id: true },
    });
    for (const loc of fiscalTestLocs) {
      const orderIds = (
        await prisma.order.findMany({ where: { locationId: loc.id }, select: { id: true } })
      ).map((o) => o.id);
      if (orderIds.length) {
        await prisma.fiscalRecord.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => {});
      }
      await prisma.table.deleteMany({ where: { locationId: loc.id } }).catch(() => {});
      await prisma.location.delete({ where: { id: loc.id } }).catch(() => {});
    }
  } finally {
    await enableFiscalImmutabilityTrigger(prisma);
  }
}

async function main() {
  console.log('--- Module 4 Fiscal Integration Test ---');

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const verifactuQueue = new Queue('verifactu-sync', { connection });

  try {
    const { fiscalService } = await import('../services/fiscal.service.ts');

    await ensureFiscalImmutabilityTrigger();
    await cleanup();

    await prisma.location.create({
      data: { id: locationId, name: 'Fiscal Test', address: 'Test St' },
    });

    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: orderId,
        locationId,
        source: 'dine_in',
        status: 'completed',
        total: 11,
        paid: true,
        amountPaid: 11,
        customerName: 'Fiscal Guest',
        items: { create: [{ name: 'Latte', price: 11, quantity: 1 }] },
      },
    });

    const beforeJobs = await verifactuQueue.getJobCounts('waiting', 'active', 'delayed', 'completed');
    const jobsBefore =
      beforeJobs.waiting + beforeJobs.active + beforeJobs.delayed + beforeJobs.completed;

    const { record, xml } = await fiscalService.syncVerifactu(orderId);
    if (!record.invoiceNumber || !record.hash) {
      console.error('❌ Fiscal record missing invoiceNumber or hash', record);
      process.exitCode = 1;
      return;
    }
    console.log('✅ T4.3 Fiscal record generated');

    if (!xml.includes('FacturaVerifactu')) {
      console.error('❌ Invalid fiscal XML');
      process.exitCode = 1;
      return;
    }
    console.log('✅ T4.3 Valid XML structure');

    await new Promise((r) => setTimeout(r, 400));
    const afterJobs = await verifactuQueue.getJobCounts('waiting', 'active', 'delayed', 'completed');
    const jobsAfter =
      afterJobs.waiting + afterJobs.active + afterJobs.delayed + afterJobs.completed;
    if (jobsAfter <= jobsBefore) {
      console.error('❌ T4.4 Expected verifactu:sync job in BullMQ queue');
      process.exitCode = 1;
      return;
    }
    console.log('✅ T4.4 BullMQ verifactu:sync job queued');

    const refund = await fiscalService.processRefund(orderId, {
      items: [{ itemIndex: 0, quantity: 1 }],
      reason: 'Test refund',
      method: 'card',
    });
    if (!refund.rectificativa.originalFiscalRecordId) {
      console.error('❌ T4.5 Rectificativa not linked to original', refund.rectificativa);
      process.exitCode = 1;
      return;
    }
    console.log('✅ T4.5 Partial refund creates linked rectificativa');

    const audits = await prisma.auditLog.findMany({
      where: { action: 'order_refunded' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const audit = audits.find((a) => {
      const details = a.details as { orderId?: string } | null;
      return details?.orderId === orderId;
    });
    if (!audit) {
      console.error('❌ T4.6 Audit order_refunded missing');
      process.exitCode = 1;
      return;
    }
    console.log('✅ T4.6 Audit order_refunded logged');

    let immutabilityBlocked = false;
    try {
      await prisma.fiscalRecord.update({
        where: { id: record.id },
        data: { total: 999 },
      });
    } catch {
      immutabilityBlocked = true;
    }
    if (!immutabilityBlocked) {
      console.error('❌ T4.7 FiscalRecord UPDATE should be blocked by trigger');
      process.exitCode = 1;
      return;
    }
    console.log('✅ T4.7 FiscalRecord immutability trigger active');

    console.log('--- Module 4 Fiscal Integration Test PASSED ---');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exitCode = 1;
  } finally {
    await verifactuQueue.close().catch(() => {});
    await connection.quit().catch(() => {});
    const { queue } = await import('./queue/index.ts');
    await queue.closeAll().catch(() => {});
    await cleanup().catch(() => {});
    await disconnectDb();
  }
}

main();
