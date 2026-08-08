/**
 * Module 34 — Inventory integration (T34.3–T34.5, T34.7 regression)
 */
import { prisma, disconnectDb } from './db.ts';
import { inventoryRepository } from '../repositories/inventory.repository.ts';
import { cache } from './cache/index.ts';
import { INVENTORY_ITEMS_CACHE_KEY } from './inventory-cache.ts';

const BASE = 'http://localhost:3000';
const SKU = 'INV-MER-0001';
const locationId = 'loc-inv-test';
const orderId = 'ord-inv-test-id';

async function cleanup() {
  await prisma.stockTransfer.deleteMany({ where: { item: { sku: SKU } } });
  await prisma.inventoryTransfer.deleteMany({ where: { item: { sku: SKU } } });
  await prisma.merchInventory.deleteMany({ where: { sku: SKU } });
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
}

async function main() {
  console.log('--- Module 34 Inventory Integration Test ---');

  try {
    await cleanup();

    await prisma.location.create({
      data: { id: locationId, name: 'Inventory Shop', address: 'Warehouse Rd 10' },
    });

    console.log('Creating Merch Item (initial stock: 10)...');
    const createRes = await fetch(`${BASE}/api/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Corgi T-Shirt',
        sku: SKU,
        price: 25.0,
        initialStock: 10,
      }),
    });
    const createdItem = await createRes.json();

    if (createRes.status !== 201 || createdItem.quantity !== 10) {
      console.error('❌ ERROR: Failed to create inventory item.', createRes.status, createdItem);
      process.exit(1);
    }
    console.log('✅ Merch item created with initial stock level.');
    const itemId = createdItem.id;

    const badSkuRes = await fetch(`${BASE}/api/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bad SKU', sku: 'BAD', price: 1 }),
    });
    if (badSkuRes.status !== 400) {
      console.error('❌ invalid SKU expected 400, got', badSkuRes.status);
      process.exit(1);
    }
    console.log('✅ invalid SKU → 400');

    const restockRes = await fetch(`${BASE}/api/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, type: 'check_in', quantity: 5, reason: 'Weekly shipment' }),
    });
    const restockItem = await restockRes.json();
    if (restockRes.status !== 200 || restockItem.quantity !== 15) {
      console.error('❌ Check-in failed.', restockRes.status, restockItem);
      process.exit(1);
    }
    console.log('✅ Stock level increased successfully.');

    const zeroAdjust = await fetch(`${BASE}/api/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, type: 'check_out', quantity: 0 }),
    });
    if (zeroAdjust.status !== 400) {
      console.error('❌ zero adjust expected 400, got', zeroAdjust.status);
      process.exit(1);
    }
    console.log('✅ zero quantity adjust → 400');

    const checkoutRes = await fetch(`${BASE}/api/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, type: 'check_out', quantity: 2, reason: 'Damaged item' }),
    });
    const checkoutItem = await checkoutRes.json();
    if (checkoutRes.status !== 200 || checkoutItem.quantity !== 13) {
      console.error('❌ Check-out failed.', checkoutRes.status, checkoutItem);
      process.exit(1);
    }
    console.log('✅ Stock level decreased successfully.');

    const overTransfer = await fetch(`${BASE}/api/inventory/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity: 999, targetLocationId: 'sagrada' }),
    });
    const overBody = await overTransfer.json();
    if (overTransfer.status !== 400 || overBody.code !== 'INSUFFICIENT_STOCK') {
      console.error('❌ T34.3 expected INSUFFICIENT_STOCK 400, got', overTransfer.status, overBody);
      process.exit(1);
    }
    console.log('✅ T34.3 INSUFFICIENT_STOCK on transfer → 400');

    const transferRes = await fetch(`${BASE}/api/inventory/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity: 3, targetLocationId: 'eixample' }),
    });
    const transfer = await transferRes.json();
    if (transferRes.status !== 201 || transfer.status !== 'in_transit') {
      console.error('❌ transfer create failed', transferRes.status, transfer);
      process.exit(1);
    }

    const afterDebit = await prisma.merchInventory.findUnique({ where: { id: itemId } });
    if (!afterDebit || afterDebit.quantity !== 10) {
      console.error('❌ T34.4 debit failed, quantity=', afterDebit?.quantity);
      process.exit(1);
    }

    const completeRes = await fetch(`${BASE}/api/inventory/transfers/${transfer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const completed = await completeRes.json();
    if (completeRes.status !== 200 || completed.status !== 'completed') {
      console.error('❌ T34.4 complete failed', completeRes.status, completed);
      process.exit(1);
    }

    const logs = await prisma.inventoryTransfer.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
    });
    const outLog = logs.find((l) => l.type === 'check_out' && l.quantity === 3);
    const inLog = logs.find((l) => l.type === 'check_in' && l.reason?.includes('received'));
    if (!outLog || !inLog) {
      console.error('❌ T34.4 transfer logs missing', logs);
      process.exit(1);
    }
    console.log('✅ T34.4 COMPLETED transfer atomic debit/credit');

    await cache.set(INVENTORY_ITEMS_CACHE_KEY, [{ id: 'stale', sku: 'STALE' }]);
    await fetch(`${BASE}/api/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, type: 'check_in', quantity: 1 }),
    });
    const cachedAfter = await cache.get(INVENTORY_ITEMS_CACHE_KEY);
    if (cachedAfter !== null) {
      console.error('❌ T34.5 cache should be invalidated, got', cachedAfter);
      process.exit(1);
    }
    console.log('✅ T34.5 Redis inventory cache invalidated');

    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'ORD-INV-999',
        locationId,
        status: 'completed',
        paid: true,
        total: 75.0,
        source: 'waiter',
        items: {
          create: [
            {
              id: 'ord-item-inv-test',
              name: 'Corgi T-Shirt',
              price: 25.0,
              quantity: 3,
            },
          ],
        },
      },
    });

    await inventoryRepository.deductStockFromOrder(orderId);

    const finalItem = await prisma.merchInventory.findUnique({
      where: { id: itemId },
      include: { transfers: true },
    });

    if (!finalItem || finalItem.quantity !== 8) {
      console.error('❌ Automated stock deduction failed.', finalItem?.quantity);
      process.exit(1);
    }

    const saleTransfer = finalItem.transfers.find((t) => t.type === 'sale');
    if (!saleTransfer || saleTransfer.quantity !== 3) {
      console.error('❌ Sale transfer log mismatch.', saleTransfer);
      process.exit(1);
    }
    console.log('✅ Automated stock deduction hook executed correctly.');

    const listRes = await fetch(`${BASE}/api/inventory`);
    const list = await listRes.json();
    if (listRes.status !== 200 || !list.some((i: { id: string }) => i.id === itemId)) {
      console.error('❌ GET inventory list failed.');
      process.exit(1);
    }
    console.log('✅ GET inventory list fetched and verified.');

    const transfersList = await fetch(`${BASE}/api/inventory/transfers`);
    const transfersBody = await transfersList.json();
    if (transfersList.status !== 200 || !Array.isArray(transfersBody)) {
      console.error('❌ GET transfers failed');
      process.exit(1);
    }
    console.log('✅ GET /api/inventory/transfers ok');

    await cleanup();
    console.log('--- Module 34 Inventory Integration Test Passed ---');
  } catch (error) {
    console.error('Unexpected error during Inventory integration test:', error);
    await cleanup().catch(() => {});
    process.exit(1);
  } finally {
    await disconnectDb();
  }
}

main();
