import { POST as ordersPOST, GET as ordersGET } from '../app/api/orders/route';
import { PUT as orderPUT } from '../app/api/orders/[id]/route';
import { prisma } from './db';
import { cache } from './cache';

async function main() {
  console.log('--- Starting POS Order Flow Integration Test ---');

  const locationId = 'default';
  const tableId = `tab-pos-${Date.now()}`;
  const orderId = `ORD-POS-${Date.now().toString().slice(-6)}`;

  try {
    await cache.delete(`active_orders_${locationId}`);

    await prisma.location.upsert({
      where: { id: locationId },
      create: { id: locationId, name: 'Default', address: 'Main' },
      update: {},
    });

    await prisma.table.upsert({
      where: { id: tableId },
      create: {
        id: tableId,
        locationId,
        number: 'POS-1',
        x: 100,
        y: 100,
        width: 60,
        height: 60,
        shape: 'rect',
        status: 'available',
        roomId: 'room-main',
        roomName: 'Main',
        seats: 4,
      },
      update: {},
    });

    const createReq = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        locationId,
        source: 'dine_in',
        status: 'preparing',
        tableId,
        customerName: 'Table POS-1',
        total: 9,
        items: [{ name: 'Cappuccino', price: 4.5, quantity: 2, comments: 'no sugar' }],
      }),
    });

    const createRes = await ordersPOST(createReq);
    const created = await createRes.json();
    if (createRes.status !== 201 || created.status !== 'preparing') {
      console.error('❌ Create failed', createRes.status, created);
      process.exit(1);
    }
    console.log('✅ POST order with status preparing');

    const getReq = new Request(`http://localhost/api/orders?locationId=${locationId}`);
    const getRes = await ordersGET(getReq);
    const active = await getRes.json();
    const found = active.find((o: { id: string }) => o.id === orderId);
    if (!found || found.tableId !== tableId) {
      console.error('❌ Active orders missing created order', active);
      process.exit(1);
    }
    console.log('✅ GET active orders includes preparing order on table');

    const updateReq = new Request(`http://localhost/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ name: 'Cappuccino', price: 4.5, quantity: 3, comments: 'no sugar' }],
        total: 13.5,
        customerName: 'Table POS-1',
      }),
    });
    const updateRes = await orderPUT(updateReq, { params: Promise.resolve({ id: orderId }) });
    const updated = await updateRes.json();
    if (updateRes.status !== 200 || updated.items.length !== 1 || updated.total !== 13.5) {
      console.error('❌ PUT update failed', updated);
      process.exit(1);
    }
    console.log('✅ PUT order items updated');

    const cached = await cache.get(`active_orders_${locationId}`);
    if (cached !== null) {
      console.error('❌ Cache should be invalidated after update');
      process.exit(1);
    }
    console.log('✅ Cache invalidated after order update');

    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.table.delete({ where: { id: tableId } }).catch(() => {});

    console.log('--- POS Order Flow Integration Test PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    await prisma.table.delete({ where: { id: tableId } }).catch(() => {});
    process.exit(1);
  }
}

main();
