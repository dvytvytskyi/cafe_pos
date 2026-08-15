import { prisma } from '../src/lib/db.ts';
import { MAIN_WAREHOUSE_LOCATION_ID } from '../src/lib/inventory-constants.ts';

async function main() {
  let mainWh = await prisma.location.findUnique({ where: { id: MAIN_WAREHOUSE_LOCATION_ID } });
  if (!mainWh) {
    mainWh = await prisma.location.create({
      data: {
        id: MAIN_WAREHOUSE_LOCATION_ID,
        name: 'Main WH',
        address: 'Polígon Industrial Zona Franca, Barcelona',
      },
    });
    console.log('Created Main WH location');
  }

  const items = await prisma.merchInventory.findMany();
  for (const item of items) {
    const rows = await prisma.inventoryLocationStock.findMany({ where: { itemId: item.id } });
    if (rows.length === 0 && item.quantity > 0) {
      await prisma.inventoryLocationStock.create({
        data: { itemId: item.id, locationId: MAIN_WAREHOUSE_LOCATION_ID, quantity: item.quantity },
      });
      console.log(`Backfilled stock for ${item.sku}`);
    } else if (rows.length === 1 && rows[0].locationId !== MAIN_WAREHOUSE_LOCATION_ID) {
      await prisma.inventoryLocationStock.update({
        where: { id: rows[0].id },
        data: { locationId: MAIN_WAREHOUSE_LOCATION_ID },
      });
      console.log(`Moved ${item.sku} stock to Main WH`);
    }
  }

  await prisma.stockTransfer.updateMany({
    where: { sourceLocationId: 'main' },
    data: { sourceLocationId: MAIN_WAREHOUSE_LOCATION_ID },
  });

  const legacyTargets = ['gothic', 'eixample', 'sagrada', 'default'];
  for (const legacy of legacyTargets) {
    const mapping: Record<string, string> = {
      gothic: 'loc-gotico',
      eixample: 'default',
      sagrada: 'loc-sagrada',
      default: 'default',
    };
    await prisma.stockTransfer.updateMany({
      where: { targetLocationId: legacy },
      data: { targetLocationId: mapping[legacy] ?? legacy },
    });
    await prisma.stockTransfer.updateMany({
      where: { sourceLocationId: legacy },
      data: { sourceLocationId: mapping[legacy] ?? legacy },
    });
  }

  const locs = await prisma.location.findMany({ orderBy: { name: 'asc' } });
  console.log(
    'Locations:',
    locs.map((l) => `${l.id} (${l.name})`).join(', ')
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
