import { GET as shiftsGET, POST as shiftsPOST } from '../app/api/shifts/route.ts';
import { POST as closePOST } from '../app/api/shifts/[id]/close/route.ts';
import { POST as adjustPOST } from '../app/api/shifts/[id]/adjust/route.ts';
import { prisma } from './db.ts';

async function main() {
  console.log('--- Starting Cash Shifts Integration Test ---');

  const locationId = 'loc-shifts-test';
  const roleId = 'role-shifts-test';
  const userId = 'user-shifts-test';

  try {
    // 0. Setup Location, Role, and User
    console.log('Setting up Location, Role, and User in DB...');
    await prisma.transaction.deleteMany({ where: { order: { locationId } } });
    await prisma.orderItem.deleteMany({ where: { order: { locationId } } });
    await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } });
    await prisma.order.deleteMany({ where: { locationId } });
    await prisma.cashShift.deleteMany({ where: { locationId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    await prisma.role.delete({ where: { id: roleId } }).catch(() => {});

    await prisma.location.create({
      data: { id: locationId, name: 'Shift Test Cafe', address: 'Cashier Square 1' }
    });

    await prisma.role.create({
      data: { id: roleId, name: 'Cashier', permissions: {} }
    });

    await prisma.user.create({
      data: { id: userId, name: 'Cashier Bob', pinHash: 'dummy', roleId }
    });

    // 1. Open shift via POST /api/shifts
    console.log('Opening cash shift with €100 float...');
    const openReq = new Request('http://localhost/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, userId, floatStart: 100.00 })
    });

    const openRes = await shiftsPOST(openReq);
    const openedShift = await openRes.json();

    console.log('Opened Shift Response:', openedShift);
    if (openRes.status !== 200 || openedShift.status !== 'open' || openedShift.floatStart !== 100) {
      console.error('❌ ERROR: Failed to open cash shift.');
      process.exit(1);
    }
    console.log('✅ Success: Cash shift opened.');

    const shiftId = openedShift.id;

    // 2. Perform Cash-Out Adjustment (Withdrawal €20)
    console.log('Recording Cash-Out adjustment €20 for buying cups...');
    const adjReq = new Request(`http://localhost/api/shifts/${shiftId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'out', amount: 20.00, reason: 'Buy cups' })
    });

    const adjRes = await adjustPOST(adjReq, { params: Promise.resolve({ id: shiftId }) });
    const adjShift = await adjRes.json();

    console.log('Adjustment Response:', adjShift);
    if (adjRes.status !== 200 || adjShift.expected !== 80 || adjShift.cashOut !== 20) {
      console.error('❌ ERROR: Cash-Out adjustment calculation failed.');
      process.exit(1);
    }
    console.log('✅ Success: Cash-Out adjustment successfully recorded.');

    // 3. Mock transactions created during this shift's window
    console.log('Mocking orders and transactions in DB during shift window...');
    const mockOrder1 = await prisma.order.create({
      data: {
        id: 'ord-shift-1',
        orderNumber: 'ORD-SHF-001',
        locationId,
        status: 'completed',
        paid: true,
        total: 30.00,
        source: 'waiter'
      }
    });

    await prisma.transaction.create({
      data: {
        orderId: mockOrder1.id,
        method: 'cash',
        amount: 30.00,
        createdAt: new Date() // During shift
      }
    });

    const mockOrder2 = await prisma.order.create({
      data: {
        id: 'ord-shift-2',
        orderNumber: 'ORD-SHF-002',
        locationId,
        status: 'completed',
        paid: true,
        total: 45.00,
        source: 'waiter'
      }
    });

    await prisma.transaction.create({
      data: {
        orderId: mockOrder2.id,
        method: 'card',
        amount: 45.00,
        createdAt: new Date()
      }
    });

    console.log('Mock transactions added successfully.');

    // 4. Close Shift with blind reconciliation actualCash = €115.00
    // Expected cash: floatStart(100) + cashSales(30) - cashOut(20) = 110. Difference = +5.00
    console.log('Closing shift with actual cash counting of €115.00...');
    const closeReq = new Request(`http://localhost/api/shifts/${shiftId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualCash: 115.00 })
    });

    const closeRes = await closePOST(closeReq, { params: Promise.resolve({ id: shiftId }) });
    const closedShift = await closeRes.json();

    console.log('Closed Shift Response:', closedShift);
    if (
      closeRes.status !== 200 || 
      closedShift.status !== 'closed' || 
      closedShift.cashSales !== 30 || 
      closedShift.cardSales !== 45 || 
      closedShift.expected !== 110 || 
      closedShift.actual !== 115 || 
      closedShift.difference !== 5
    ) {
      console.error('❌ ERROR: Shift closing calculations or status update incorrect.');
      process.exit(1);
    }
    console.log('✅ Success: Shift closed. Financial aggregation and blind reconciliation mismatch computed correctly.');

    // 5. GET All Shifts for the Location
    console.log('Verifying shift is retrieved via GET /api/shifts...');
    const getReq = new Request(`http://localhost/api/shifts?locationId=${locationId}`);
    const getRes = await shiftsGET(getReq);
    const shiftsList = await getRes.json();

    console.log('Shifts list size:', shiftsList.length);
    if (getRes.status !== 200 || shiftsList.length !== 1 || shiftsList[0].id !== shiftId) {
      console.error('❌ ERROR: GET shifts returned invalid data.');
      process.exit(1);
    }
    console.log('✅ Success: GET shifts list fetched and verified.');

    // 6. Cleanup
    console.log('Cleaning up mock database records...');
    await prisma.transaction.deleteMany({ where: { order: { locationId } } });
    await prisma.order.deleteMany({ where: { locationId } });
    await prisma.cashShift.deleteMany({ where: { locationId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.location.delete({ where: { id: locationId } });
    await prisma.role.delete({ where: { id: roleId } });

    console.log('--- Cash Shifts Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Cash Shifts integration test:', error);
    try {
      await prisma.transaction.deleteMany({ where: { order: { locationId } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { locationId } }).catch(() => {});
      await prisma.cashShift.deleteMany({ where: { locationId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
      await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
      await prisma.role.delete({ where: { id: roleId } }).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
