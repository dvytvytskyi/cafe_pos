import { orderRepository } from '../repositories/order.repository';
import { orderService } from '../services/order.service';
import { prisma } from './db';
import { cache } from './cache';

async function main() {
  console.log('--- Starting Payment Transaction Integration Test ---');

  const locationId = 'default';
  const orderId = `ORD-PAY-${Date.now().toString().slice(-6)}`;
  let giftCode = '';

  try {
    await cache.delete(`active_orders_${locationId}`);

    await prisma.location.upsert({
      where: { id: locationId },
      create: { id: locationId, name: 'Default', address: 'Main' },
      update: {},
    });

    await orderRepository.create({
      id: orderId,
      locationId,
      source: 'dine_in',
      status: 'preparing',
      customerName: 'Payment Test',
      total: 40,
      items: [{ name: 'Latte', price: 20, quantity: 2 }] as any,
    });
    console.log('✅ Unpaid order created');

    const paidOrder = await orderService.completePayment(orderId, {
      payments: [{ method: 'card', amount: 40 }],
      total: 40,
    });

    if (!paidOrder.paid || paidOrder.status !== 'completed') {
      console.error('❌ Single card payment failed', paidOrder);
      process.exit(1);
    }

    const txCount = await prisma.transaction.count({ where: { orderId } });
    if (txCount !== 1) {
      console.error('❌ Expected 1 transaction record', txCount);
      process.exit(1);
    }
    console.log('✅ T3.6 Single card payment → paid + 1 transaction');

    const auditCount = await prisma.auditLog.count({
      where: { action: 'order_completed' },
    });
    if (auditCount < 1) {
      console.error('❌ Audit log missing for completed order');
      process.exit(1);
    }
    console.log('✅ T3.11 Audit log on complete');

    const cached = await cache.get(`active_orders_${locationId}`);
    if (cached !== null) {
      console.error('❌ Cache should be invalidated after payment');
      process.exit(1);
    }
    console.log('✅ T3.12 Cache invalidated after payment');

    await prisma.transaction.deleteMany({ where: { orderId } });
    // FiscalRecord is immutable (VERI*FACTU trigger) — leave paid order row; later cases use fresh IDs.

    const splitOrderId = `ORD-SPL-${Date.now().toString().slice(-6)}`;
    await orderRepository.create({
      id: splitOrderId,
      locationId,
      source: 'dine_in',
      status: 'preparing',
      customerName: 'Split Pay',
      total: 50,
      items: [{ name: 'Brunch', price: 50, quantity: 1 }] as any,
    });

    const gc = await prisma.giftCard.create({
      data: {
        code: `CORGI-PAY-${Date.now().toString().slice(-6)}`,
        initialBalance: 25,
        balance: 25,
        status: 'active',
        expiryDate: new Date(Date.now() + 86400000 * 365),
      },
    });
    giftCode = gc.code;

    await orderService.completePayment(splitOrderId, {
      payments: [{ method: 'cash', amount: 25 }],
      total: 50,
    });

    const splitPaid = await orderService.completePayment(splitOrderId, {
      payments: [{ method: 'giftcard', amount: 25, code: giftCode }],
      total: 50,
    });

    if (!splitPaid.paid) {
      console.error('❌ Split gift card payment failed', splitPaid);
      process.exit(1);
    }

    const splitTx = await prisma.transaction.count({ where: { orderId: splitOrderId } });
    if (splitTx !== 2) {
      console.error('❌ Expected 2 transactions for split payment', splitTx);
      process.exit(1);
    }
    console.log('✅ T3.7 50% cash + 50% giftcard → 2 transactions');

    const failOrderId = `ORD-FAIL-${Date.now().toString().slice(-6)}`;
    await orderRepository.create({
      id: failOrderId,
      locationId,
      source: 'dine_in',
      status: 'preparing',
      customerName: 'Fail Test',
      total: 10,
      items: [{ name: 'Coffee', price: 10, quantity: 1 }] as any,
    });

    try {
      await orderService.completePayment(failOrderId, {
        payments: [{ method: 'giftcard', amount: 10, code: 'INVALID-CODE-XYZ' }],
        total: 10,
      });
      console.error('❌ Gift card fail should throw');
      process.exit(1);
    } catch {
      // expected
    }

    const stillUnpaid = await prisma.order.findUnique({ where: { id: failOrderId } });
    if (stillUnpaid?.paid) {
      console.error('❌ Order should remain unpaid after gift card failure');
      process.exit(1);
    }
    console.log('✅ T3.8 Gift card fail → order not paid (rollback)');

    const customer = await prisma.customer.create({
      data: {
        name: 'Loyalty Tester',
        phone: `+380${Date.now().toString().slice(-9)}`,
        email: `loyalty-${Date.now()}@test.local`,
        tier: 'Bronze',
        points: 100,
        ltv: 0,
        visitCount: 0,
        joinedDate: new Date().toISOString().split('T')[0],
      },
    });

    const loyaltyOrderId = `ORD-LOY-${Date.now().toString().slice(-6)}`;
    await orderRepository.create({
      id: loyaltyOrderId,
      locationId,
      source: 'dine_in',
      status: 'preparing',
      customerName: customer.name,
      customerId: customer.id,
      total: 20,
      items: [{ name: 'Tea', price: 20, quantity: 1 }] as any,
    });

    const beforePoints = customer.points;
    await orderService.completePayment(loyaltyOrderId, {
      payments: [{ method: 'card', amount: 20 }],
      customerId: customer.id,
      total: 20,
    });

    const updatedCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
    if (!updatedCustomer || updatedCustomer.points <= beforePoints) {
      console.error('❌ Customer should earn points on pay', updatedCustomer);
      process.exit(1);
    }
    console.log('✅ T3.9 Loyalty earn on pay');

    const pointsOrderId = `ORD-PTS-${Date.now().toString().slice(-6)}`;
    await orderRepository.create({
      id: pointsOrderId,
      locationId,
      source: 'dine_in',
      status: 'preparing',
      customerName: customer.name,
      customerId: customer.id,
      total: 30,
      items: [{ name: 'Salad', price: 30, quantity: 1 }] as any,
    });

    try {
      await orderService.completePayment(pointsOrderId, {
        payments: [{ method: 'points', amount: 200 }],
        customerId: customer.id,
        total: 30,
      });
      console.error('❌ T3.10 Should reject insufficient points');
      process.exit(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (!msg.includes('Insufficient')) {
        console.error('❌ T3.10 Unexpected error', msg);
        process.exit(1);
      }
    }
    const stillUnpaidPts = await prisma.order.findUnique({ where: { id: pointsOrderId } });
    if (stillUnpaidPts?.paid) {
      console.error('❌ T3.10 Order should remain unpaid after points failure');
      process.exit(1);
    }
    console.log('✅ T3.10 Loyalty spend > balance → rejected + rollback');

    await prisma.transaction.deleteMany({
      where: { orderId: { in: [splitOrderId, failOrderId, loyaltyOrderId, pointsOrderId] } },
    });
    for (const id of [failOrderId, pointsOrderId]) {
      await prisma.order.delete({ where: { id } }).catch(() => {});
    }
    await prisma.customer.delete({ where: { id: customer.id } }).catch(async () => {
      await prisma.loyaltyTransaction.deleteMany({ where: { customerId: customer.id } });
      await prisma.customer.delete({ where: { id: customer.id } }).catch(() => {});
    });
    if (giftCode) await prisma.giftCard.delete({ where: { code: giftCode } }).catch(() => {});

    console.log('--- Payment Transaction Integration Test PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    if (giftCode) await prisma.giftCard.delete({ where: { code: giftCode } }).catch(() => {});
    process.exit(1);
  }
}

main();
