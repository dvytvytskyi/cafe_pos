import { POST } from '../app/api/offline-sync/route';
import { prisma } from './db';
import { cache } from './cache';
import { queue, Worker } from './queue';
import Redis from 'ioredis';

async function main() {
  console.log('--- Starting Offline Synchronization Integration Test ---');

  const locationId = 'loc-sync-test';
  let testLocation: any;

  try {
    // 0. Set up a test location in DB first to satisfy foreign key constraints
    console.log('Setting up mock location in DB...');
    // Delete any residues first
    await prisma.orderItem.deleteMany({ where: { order: { locationId } } });
    await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } });
    await prisma.order.deleteMany({ where: { locationId } });
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});

    testLocation = await prisma.location.create({
      data: {
        id: locationId,
        name: 'Offline Sync Test Location',
        address: 'Offline Street 77',
      },
    });

    // 1. Create a conflicting order in database first
    const conflictOrderId = 'order-conflict-123';
    const oldDate = new Date(Date.now() - 3600000); // 1 hour ago
    const newDate = new Date(Date.now() - 60000);    // 1 minute ago

    console.log('Creating initial conflicting order in DB...');
    await prisma.order.create({
      data: {
        id: conflictOrderId,
        orderNumber: 'ORD-CONFLICT',
        source: 'dine_in',
        locationId: locationId,
        status: 'pending',
        total: 10.0,
        paid: false,
        amountPaid: 0,
        createdAt: oldDate,
        updatedAt: oldDate,
        items: {
          create: [
            { name: 'Initial Coffee', price: 10.0, quantity: 1 }
          ]
        }
      }
    });

    // 2. Prepare the 10 sync orders
    const syncOrders: any[] = [];

    // 8 Standard new orders
    for (let i = 1; i <= 8; i++) {
      syncOrders.push({
        id: `order-new-${i}-${Date.now().toString().slice(-4)}`,
        locationId,
        status: 'completed',
        paymentStatus: 'paid',
        total: 15.0,
        items: [
          { name: `Item ${i}`, price: 15.0, quantity: 1 }
        ],
        createdAt: new Date(Date.now() - i * 10 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - i * 10 * 60000).toISOString(),
      });
    }

    // 1 Conflicting order (client has newer data: completed and paid)
    syncOrders.push({
      id: conflictOrderId,
      locationId,
      status: 'completed',
      paymentStatus: 'paid',
      total: 12.5, // changed price
      items: [
        { name: 'Initial Coffee', price: 10.0, quantity: 1 },
        { name: 'Extra Cookie', price: 2.5, quantity: 1 }
      ],
      createdAt: oldDate.toISOString(),
      updatedAt: newDate.toISOString(), // newer update timestamp
    });

    // 1 Future timestamp anomaly order
    const anomalyOrderId = 'order-anomaly-future';
    const futureTime = new Date(Date.now() + 2 * 3600000); // 2 hours in the future
    syncOrders.push({
      id: anomalyOrderId,
      locationId,
      status: 'pending',
      paymentStatus: 'unpaid',
      total: 8.0,
      items: [
        { name: 'Future Muffin', price: 8.0, quantity: 1 }
      ],
      createdAt: futureTime.toISOString(),
      updatedAt: futureTime.toISOString(),
    });

    // Setup Redis sub client to verify websocket broadcasts
    const subConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const receivedWsMessages: any[] = [];
    await subConnection.subscribe('pos-events');
    subConnection.on('message', (channel, message) => {
      if (channel === 'pos-events') {
        receivedWsMessages.push(JSON.parse(message));
      }
    });

    // Mock BullMQ worker to intercept verifactu sync jobs
    const verifactuJobs: any[] = [];
    const queueConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
    const syncOrderIds = new Set(syncOrders.map((o) => o.id));
    const worker = new Worker('verifactu-sync', async (job: any) => {
      if (syncOrderIds.has(job.data?.orderId)) {
        console.log('BullMQ Intercepted Veri*Factu sync job:', job.data);
        verifactuJobs.push(job.data);
      }
    }, { connection: queueConnection });

    // 3. Construct request and call POST offline-sync handler
    console.log(`Sending ${syncOrders.length} orders to POST /api/offline-sync...`);
    const payload = {
      orders: syncOrders,
      clientTime: new Date().toISOString(),
    };

    const request = new Request('http://localhost/api/offline-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    const result = await response.json();

    console.log('Sync Result:', JSON.stringify(result, null, 2));

    // Wait for async background jobs & events to settle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. Verify Results
    if (!result.success) {
      console.error('❌ ERROR: Sync response indicated failure.');
      process.exit(1);
    }

    if (result.syncedIds.length !== 10) {
      console.error(`❌ ERROR: Expected 10 synced IDs, got ${result.syncedIds.length}`);
      process.exit(1);
    }

    console.log('✅ Success: All 10 orders synced successfully!');

    // Verify DB states
    // 8 new orders + 1 conflict order + 1 anomaly order = 10 total orders under locationId
    const dbOrders = await prisma.order.findMany({
      where: { locationId },
      include: { items: true }
    });

    if (dbOrders.length !== 10) {
      console.error(`❌ ERROR: Expected 10 orders in DB, found ${dbOrders.length}`);
      process.exit(1);
    }
    console.log('✅ Success: 10 orders persisted in PostgreSQL.');

    // Check conflict resolution
    const resolvedConflictOrder = dbOrders.find(o => o.id === conflictOrderId);
    if (resolvedConflictOrder && resolvedConflictOrder.total === 12.5 && resolvedConflictOrder.status === 'completed' && resolvedConflictOrder.paid) {
      console.log('✅ Success: Conflict resolution worked. Order was updated to newer client state.');
    } else {
      console.error('❌ ERROR: Conflict order was not updated correctly.', resolvedConflictOrder);
      process.exit(1);
    }

    // Check time sync anomaly correction
    const anomalyOrder = dbOrders.find(o => o.id === anomalyOrderId);
    if (anomalyOrder) {
      const now = new Date();
      const timeDiff = Math.abs(anomalyOrder.createdAt.getTime() - now.getTime());
      if (timeDiff < 10000) { // within 10 seconds of server time
        console.log('✅ Success: Time sync anomaly detected and corrected. Future timestamp was reset to server time.');
      } else {
        console.error(`❌ ERROR: Anomaly order createdAt was not corrected. Found: ${anomalyOrder.createdAt.toISOString()}`);
        process.exit(1);
      }
    } else {
      console.error('❌ ERROR: Anomaly order not found in DB.');
      process.exit(1);
    }

    // Check verifactu jobs triggered (only for completed & paid orders)
    // 8 new orders are completed & paid. 1 conflict order became completed & paid. Total = 9
    console.log(`Veri*Factu Jobs Triggered: ${verifactuJobs.length} (Expected: 9)`);
    if (verifactuJobs.length === 9) {
      console.log('✅ Success: 9 VERI*FACTU tax compliance background sync jobs queued.');
    } else {
      console.error('❌ ERROR: Unexpected number of tax compliance jobs queued.');
      process.exit(1);
    }

    // Check WebSockets broadcast messages
    console.log(`WebSocket Broadcast Messages Captured: ${receivedWsMessages.length}`);
    if (receivedWsMessages.length >= 10) {
      console.log('✅ Success: WebSocket notifications broadcasted successfully.');
    } else {
      console.error('❌ ERROR: Missing WebSocket broadcast notifications.');
      process.exit(1);
    }

    // 5. Cleanup
    console.log('Cleaning up test DB records...');
    await prisma.orderItem.deleteMany({ where: { order: { locationId } } });
    await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } });
    await prisma.order.deleteMany({ where: { locationId } });
    await prisma.location.delete({ where: { id: locationId } });

    await worker.close();
    await queueConnection.quit();
    await subConnection.quit();

    console.log('--- Offline Sync Verification Test Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during offline sync test:', error);
    // Cleanup
    try {
      await prisma.orderItem.deleteMany({ where: { order: { locationId } } }).catch(() => {});
      await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { locationId } }).catch(() => {});
      await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
