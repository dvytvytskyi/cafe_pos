import { orderService } from '../services/order.service';
import { prisma } from './db';
import { cache } from './cache';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

async function main() {
  console.log('--- Starting OrderService Integration & Regression Test ---');

  const locationId = 'loc-test-123';
  const orderId = `ord-test-${Date.now().toString().slice(-6)}`;
  let testLocation: any;

  try {
    // 0. Setup a test location in DB first to satisfy foreign key constraints
    console.log('Setting up mock location in DB...');
    await prisma.order.deleteMany({ where: { locationId } }).catch(() => {});
    testLocation = await prisma.location.upsert({
      where: { id: locationId },
      create: {
        id: locationId,
        name: 'OrderService Test Location',
        address: 'Test Street 404',
      },
      update: {
        name: 'OrderService Test Location',
        address: 'Test Street 404',
      },
    });

    // Clean any residual cache
    const cacheKey = `active_orders_${locationId}`;
    await cache.delete(cacheKey);

    // 1. Test Order Creation
    console.log('Creating order via orderService...');
    const orderData = {
      id: orderId,
      locationId: locationId,
      status: 'preparing' as any,
      paymentStatus: 'unpaid' as any,
      total: 35.00,
      customerName: 'Test Customer',
      items: [
        { name: 'Special Burger', price: 15.00, quantity: 2 },
        { name: 'Lemonade', price: 5.00, quantity: 1 },
      ],
    };

    const createdOrder = await orderService.createOrder(orderData as any);
    console.log('Created order:', createdOrder);

    if (createdOrder && createdOrder.id === orderId && createdOrder.items.length === 2) {
      console.log('✅ Success: Order created and mapped successfully!');
    } else {
      console.error('❌ ERROR: Order creation failed or returned incorrect data.');
      process.exit(1);
    }

    // Verify DB directly
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (dbOrder && dbOrder.total === 35.00 && dbOrder.items.length === 2) {
      console.log('✅ Success: Order successfully persisted in PostgreSQL!');
    } else {
      console.error('❌ ERROR: Order not found in database or has wrong details.');
      process.exit(1);
    }

    // 2. Test getActiveOrders (loads into Redis cache)
    console.log('Fetching active orders...');
    const activeOrdersFirst = await orderService.getActiveOrders(locationId);
    console.log(`Retrieved ${activeOrdersFirst.length} active orders.`);

    // Verify it was saved to Redis
    const cachedData = await cache.get<any[]>(cacheKey);
    console.log('Redis cache content for active orders:', cachedData);
    if (cachedData && cachedData.length === 1 && cachedData[0].id === orderId) {
      console.log('✅ Success: Active orders correctly cached in Redis!');
    } else {
      console.error('❌ ERROR: Cache key is empty or has wrong data.');
      process.exit(1);
    }

    // 3. Test getActiveOrders cache reading
    console.log('Fetching active orders again (should hit Redis cache)...');
    // Modify database directly to see if the service still returns cached version
    await prisma.order.update({
      where: { id: orderId },
      data: { total: 99.99 },
    });

    const activeOrdersSecond = await orderService.getActiveOrders(locationId);
    if (activeOrdersSecond[0].total === 35.00) {
      console.log('✅ Success: Read hit the cache successfully (returned cached total 35.00 instead of 99.99)!');
    } else {
      console.error('❌ ERROR: Service did not hit the cache (loaded new DB total 99.99).');
      process.exit(1);
    }

    // Restore DB total
    await prisma.order.update({
      where: { id: orderId },
      data: { total: 35.00 },
    });

    // 4. Test updateOrderStatus (completing order and setting to paid)
    console.log('Updating order status to completed + paid...');
    // Mock the payment status in orderRepository update call or we can update DB
    await prisma.order.update({
      where: { id: orderId },
      data: { paid: true, amountPaid: 35.00 }, // mark paid in DB
    });

    // Set up BullMQ listener to intercept verifactu-sync job
    const receivedJobs: any[] = [];
    const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
    const worker = new Worker('verifactu-sync', async (job) => {
      if (job.data?.orderId === orderId) {
        console.log('BullMQ Worker intercepted job:', job.name, job.data);
        receivedJobs.push(job.data);
      }
    }, { connection });

    // Call update status to trigger sync job and cache invalidation
    const updatedOrder = await orderService.updateOrderStatus(orderId, 'completed');
    console.log('Updated order details:', updatedOrder);

    // Verify cache was invalidated
    const cacheAfterUpdate = await cache.get(cacheKey);
    if (cacheAfterUpdate === null) {
      console.log('✅ Success: Redis cache was correctly invalidated after status update.');
    } else {
      console.error('❌ ERROR: Cache was not cleared after order update.');
      process.exit(1);
    }

    // Verify BullMQ job publication
    console.log('Waiting for BullMQ sync job...');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait for worker

    if (receivedJobs.length === 1 && receivedJobs[0].orderId === orderId) {
      console.log('✅ Success: BullMQ job verifactu-sync was published successfully!');
    } else {
      console.error('❌ ERROR: BullMQ job was not published or has wrong payload.', receivedJobs);
      process.exit(1);
    }

    // Clean up connections
    await worker.close();
    await connection.quit();

    // 5. Clean up DB records
    console.log('Cleaning up DB test records...');
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    console.log('✅ Success: DB test records cleaned up.');

    console.log('--- OrderService Test Completed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during OrderService integration test:', error);
    // Cleanup if setup succeeded
    if (testLocation) {
      try {
        await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
        await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
      } catch (e) {}
    }
    process.exit(1);
  }
}

main();
