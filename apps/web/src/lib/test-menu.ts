import { GET as catGET, POST as catPOST } from '../app/api/menu/categories/route';
import { POST as itemPOST } from '../app/api/menu/items/route';
import { PUT as itemPUT, DELETE as itemDELETE } from '../app/api/menu/items/[id]/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting Menu & Dishes Integration Test ---');

  const testCategoryName = 'Test Drinks Category';
  const testItemName = 'Test Mocha Mint';

  try {
    // 0. Setup and clean up past records
    console.log('Cleaning up past test categories and items...');
    await prisma.menuItem.deleteMany({ where: { name: testItemName } });
    await prisma.menuCategory.deleteMany({ where: { name: testCategoryName } });

    // 1. Create category via POST /api/menu/categories
    console.log('Creating category via POST /api/menu/categories...');
    const catReq = new Request('http://localhost/api/menu/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testCategoryName })
    });

    const catRes = await catPOST(catReq);
    const createdCat = await catRes.json();

    console.log('Category Response:', createdCat);
    if (catRes.status !== 201 || !createdCat.id || createdCat.name !== testCategoryName) {
      console.error('❌ ERROR: Failed to create menu category.');
      process.exit(1);
    }
    console.log('✅ Success: Menu category created.');

    const categoryId = createdCat.id;

    // 2. Create menu item via POST /api/menu/items
    console.log('Creating menu item with €3.50 price and allergens...');
    const itemReq = new Request('http://localhost/api/menu/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testItemName,
        description: 'Mint flavored double mocha shot',
        price: 3.50,
        categoryId,
        allergens: ['dairy', 'cocoa']
      })
    });

    const itemRes = await itemPOST(itemReq);
    const createdItem = await itemRes.json();

    console.log('Item Response:', createdItem);
    if (itemRes.status !== 201 || !createdItem.id || createdItem.price !== 3.50) {
      console.error('❌ ERROR: Failed to create menu item.');
      process.exit(1);
    }
    console.log('✅ Success: Menu item created.');

    const itemId = createdItem.id;

    // 3. Update price to trigger priceHistory audit trail
    console.log('Updating price from €3.50 to €4.25...');
    const updateReq = new Request(`http://localhost/api/menu/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 4.25 })
    });

    const updateRes = await itemPUT(updateReq, { params: Promise.resolve({ id: itemId }) });
    const updatedItem = await updateRes.json();

    console.log('Updated Item Response:', updatedItem);
    if (updateRes.status !== 200 || updatedItem.price !== 4.25) {
      console.error('❌ ERROR: Failed to update menu item price.');
      process.exit(1);
    }

    // Direct DB check for priceHistory
    const dbItem = await prisma.menuItem.findUnique({ where: { id: itemId } });
    console.log('DB Item Price History:', dbItem?.priceHistory);

    const history = dbItem?.priceHistory as any[];
    if (!history || history.length !== 1 || history[0].price !== 3.5) {
      console.error('❌ ERROR: priceHistory audit trail was not updated correctly.');
      process.exit(1);
    }
    console.log('✅ Success: Price history audit log generated successfully.');

    // 4. Archive item via DELETE /api/menu/items/[id]
    console.log('Archiving item...');
    const deleteReq = new Request(`http://localhost/api/menu/items/${itemId}`, {
      method: 'DELETE'
    });

    const deleteRes = await itemDELETE(deleteReq, { params: Promise.resolve({ id: itemId }) });
    const deletedItem = await deleteRes.json();

    if (deleteRes.status !== 200 || !deletedItem.isArchived) {
      console.error('❌ ERROR: Failed to archive menu item.');
      process.exit(1);
    }
    console.log('✅ Success: Menu item archived successfully.');

    // 5. Fetch categories and verify that archived items are hidden by default
    console.log('Fetching active menu categories...');
    const getReq = new Request('http://localhost/api/menu/categories');
    const getRes = await catGET(getReq);
    const getResult = await getRes.json();

    const currentCat = getResult.find((c: any) => c.id === categoryId);
    if (!currentCat || currentCat.items.length !== 0) {
      console.error('❌ ERROR: Archived item should not be retrieved in the active list.', currentCat);
      process.exit(1);
    }
    console.log('✅ Success: Active items returned successfully (archived items filtered out).');

    // 6. Cleanup
    console.log('Cleaning up mock category and item...');
    await prisma.menuItem.deleteMany({ where: { categoryId } });
    await prisma.menuCategory.delete({ where: { id: categoryId } });

    console.log('--- Menu & Dishes Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Menu/Dishes integration test:', error);
    try {
      await prisma.menuItem.deleteMany({ where: { name: testItemName } }).catch(() => {});
      await prisma.menuCategory.deleteMany({ where: { name: testCategoryName } }).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
