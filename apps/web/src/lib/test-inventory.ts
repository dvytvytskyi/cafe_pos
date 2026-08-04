import { GET as invGET, POST as invPOST } from '../app/api/inventory/route';
import { POST as adjustPOST } from '../app/api/inventory/adjust/route';
import { inventoryRepository } from '../repositories/inventory.repository';
import { prisma } from './db';

async function main() {
  console.log('--- Starting Merch Inventory & Transfers Integration Test ---');

  const locationId = 'loc-inv-test';
  const sku = 'CRG-TEE';
  const orderId = 'ord-inv-test-id';

  try {
    // 0. Cleanup past items and orders
    console.log('Cleaning up past test records from DB...');
    await prisma.inventoryTransfer.deleteMany({ where: { item: { sku } } });
    await prisma.merchInventory.deleteMany({ where: { sku } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});

    await prisma.location.create({
      data: { id: locationId, name: 'Inventory Shop', address: 'Warehouse Rd 10' }
    });

    // 1. Create a Merch item via POST /api/inventory
    console.log('Creating Merch Item: Corgi T-Shirt (initial stock: 10)...');
    const createReq = new Request('http://localhost/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Corgi T-Shirt',
        sku,
        price: 25.00,
        initialStock: 10
      })
    });

    const createRes = await invPOST(createReq);
    const createdItem = await createRes.json();

    console.log('Created Item Response:', createdItem);
    if (createRes.status !== 201 || createdItem.quantity !== 10) {
      console.error('❌ ERROR: Failed to create inventory item.');
      process.exit(1);
    }
    console.log('✅ Success: Merch item created with initial stock level.');

    const itemId = createdItem.id;

    // 2. Adjust stock: Restock +5 items (check_in)
    console.log('Restocking +5 items (check_in)...');
    const restockReq = new Request('http://localhost/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, type: 'check_in', quantity: 5, reason: 'Weekly shipment' })
    });

    const restockRes = await adjustPOST(restockReq);
    const restockItem = await restockRes.json();

    console.log('Restock Response Quantity:', restockItem.quantity);
    if (restockRes.status !== 200 || restockItem.quantity !== 15) {
      console.error('❌ ERROR: Check-in stock adjustment failed.');
      process.exit(1);
    }
    console.log('✅ Success: Stock level increased successfully.');

    // 3. Adjust stock: Write-off -2 items (check_out)
    console.log('Writing-off -2 items (check_out)...');
    const checkoutReq = new Request('http://localhost/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, type: 'check_out', quantity: 2, reason: 'Damaged item' })
    });

    const checkoutRes = await adjustPOST(checkoutReq);
    const checkoutItem = await checkoutRes.json();

    console.log('Checkout Response Quantity:', checkoutItem.quantity);
    if (checkoutRes.status !== 200 || checkoutItem.quantity !== 13) {
      console.error('❌ ERROR: Check-out stock adjustment failed.');
      process.exit(1);
    }
    console.log('✅ Success: Stock level decreased successfully.');

    // 4. Simulate complete sales order containing 3 Corgi T-Shirts
    console.log('Simulating completed order containing 3 Corgi T-Shirts...');
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'ORD-INV-999',
        locationId,
        status: 'completed',
        paid: true,
        total: 75.00,
        source: 'waiter',
        items: {
          create: [
            {
              id: 'ord-item-inv-test',
              name: 'Corgi T-Shirt', // Matches name of inventory item
              price: 25.00,
              quantity: 3
            }
          ]
        }
      }
    });

    // Trigger automated stock deduction hook
    console.log('Triggering automated stock deduction hook for order...');
    await inventoryRepository.deductStockFromOrder(orderId);

    // Verify database stock level is 10 and transfer log of type 'sale' exists
    const finalItem = await prisma.merchInventory.findUnique({
      where: { id: itemId },
      include: { transfers: true }
    });

    console.log('Final Item Stock Quantity:', finalItem?.quantity);
    console.log('Final Item Transfers logs count:', finalItem?.transfers.length);

    if (!finalItem || finalItem.quantity !== 10) {
      console.error('❌ ERROR: Automated stock deduction failed.');
      process.exit(1);
    }

    const saleTransfer = finalItem.transfers.find(t => t.type === 'sale');
    if (!saleTransfer || saleTransfer.quantity !== 3 || !saleTransfer.reason?.includes('ORD-INV-999')) {
      console.error('❌ ERROR: Sale transfer log not found or details mismatch.', saleTransfer);
      process.exit(1);
    }
    console.log('✅ Success: Automated stock deduction hook executed correctly, recording sale logs.');

    // 5. GET inventory list
    console.log('Fetching inventory list via GET /api/inventory...');
    const listRes = await invGET();
    const list = await listRes.json();

    console.log('Inventory list size:', list.length);
    if (listRes.status !== 200 || list.length !== 1 || list[0].id !== itemId) {
      console.error('❌ ERROR: GET inventory list failed.');
      process.exit(1);
    }
    console.log('✅ Success: GET inventory list fetched and verified.');

    // 6. Cleanup
    console.log('Cleaning up mock database records...');
    await prisma.inventoryTransfer.deleteMany({ where: { itemId } });
    await prisma.merchInventory.delete({ where: { id: itemId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.location.delete({ where: { id: locationId } });

    console.log('--- Merch Inventory & Transfers Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Inventory integration test:', error);
    try {
      await prisma.inventoryTransfer.deleteMany({ where: { item: { sku } } }).catch(() => {});
      await prisma.merchInventory.deleteMany({ where: { sku } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
      await prisma.order.deleteMany({ where: { id: orderId } }).catch(() => {});
      await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
