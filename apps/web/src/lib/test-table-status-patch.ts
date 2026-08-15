/**
 * Module 1 — Table status PATCH integration (T1.6)
 */
import { prisma, disconnectDb } from './db';
import { tableRepository } from '../repositories/table.repository';

const locationId = 'loc-patch-test';
const tableId = 'tab-patch-1';

async function cleanup() {
  await prisma.table.deleteMany({ where: { locationId } }).catch(() => {});
  await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
}

async function main() {
  console.log('--- Starting Table Status PATCH Integration Test ---');

  try {
    await cleanup();

    await prisma.location.create({
      data: { id: locationId, name: 'PATCH Test Cafe', address: 'Test St' },
    });

    await tableRepository.saveRoomLayouts(locationId, [
      {
        id: 'room-main',
        name: 'Main',
        tables: [
          {
            id: tableId,
            name: '1',
            x: 100,
            y: 100,
            width: 60,
            height: 60,
            type: 'rect',
            seats: 4,
            status: 'available',
          },
        ],
        zones: [],
        obstacles: [],
      },
    ]);

    const updated = await tableRepository.updateTableStatus(tableId, 'occupied');
    if (updated.status !== 'occupied') {
      console.error('❌ ERROR: PATCH did not return occupied status', updated);
      process.exit(1);
    }

    const dbTable = await prisma.table.findUnique({ where: { id: tableId } });
    if (!dbTable || dbTable.status !== 'occupied') {
      console.error('❌ ERROR: DB status not updated');
      process.exit(1);
    }

    console.log('✅ T1.6: Table status PATCH works without full layout POST');
    console.log('--- Table Status PATCH Integration Test Passed ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  } finally {
    await cleanup().catch(() => {});
    await disconnectDb();
  }
}

main();
