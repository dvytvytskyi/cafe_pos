/**
 * Module 1 — TablesView layout integration (T1.4–T1.7)
 */
import { prisma, disconnectDb } from './db.ts';
import { tableRepository } from '../repositories/table.repository.ts';
import { LayoutValidationError } from './tables-validation.ts';

const locationId = 'loc-layout-test';

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { order: { locationId } } });
  await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } });
  await prisma.order.deleteMany({ where: { locationId } });
  await prisma.table.deleteMany({ where: { locationId } });
  await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
}

async function main() {
  console.log('--- Starting Location & Room Layouts Integration Test ---');

  try {
    await cleanup();

    await prisma.location.create({
      data: { id: locationId, name: 'Layout Test Cafe', address: 'Layout Road 99' },
    });

    const mockRooms = [
      {
        id: 'room-main',
        name: 'Main Dining Room',
        tables: [
          { id: 'tab-1', name: 'Table 1', x: 100, y: 100, width: 60, height: 60, type: 'rect' as const, seats: 4, status: 'available' as const },
          { id: 'tab-2', name: 'Table 2', x: 200, y: 100, width: 60, height: 60, type: 'circle' as const, seats: 4, status: 'occupied' as const },
          { id: 'tab-3', name: 'Table 3', x: 300, y: 100, width: 80, height: 80, type: 'rect' as const, seats: 6, status: 'available' as const },
        ],
        zones: [{ id: 'zone-a', name: 'Zone A', points: [{ x: 50, y: 50 }, { x: 400, y: 50 }, { x: 400, y: 200 }] }],
        obstacles: [{ id: 'ob-bar', name: 'Service Bar Counter', points: [{ x: 10, y: 10 }, { x: 100, y: 10 }] }],
      },
      {
        id: 'room-terrace',
        name: 'Outdoor Terrace',
        tables: [
          { id: 'tab-4', name: 'Terrace 1', x: 500, y: 500, width: 60, height: 60, type: 'rect' as const, seats: 2, status: 'available' as const },
          { id: 'tab-5', name: 'Terrace 2', x: 600, y: 500, width: 60, height: 60, type: 'rect' as const, seats: 2, status: 'available' as const },
        ],
        zones: [],
        obstacles: [],
      },
    ];

    await tableRepository.saveRoomLayouts(locationId, mockRooms);
    console.log('✅ T1.4: Layout saved via repository');

    const dbLoc = await prisma.location.findUnique({ where: { id: locationId } });
    const meta = dbLoc?.layoutMetadata as Record<string, { zones: unknown[]; obstacles: unknown[] }>;
    if (!meta?.['room-main'] || meta['room-main'].zones.length !== 1 || meta['room-main'].obstacles.length !== 1) {
      console.error('❌ ERROR: Location metadata not saved correctly');
      process.exit(1);
    }

    const dbTables = await prisma.table.findMany({ where: { locationId } });
    if (dbTables.length !== 5) {
      console.error(`❌ ERROR: Expected 5 tables, found ${dbTables.length}`);
      process.exit(1);
    }

    const t2 = dbTables.find((t) => t.id === 'tab-2');
    if (!t2 || t2.number !== 'Table 2' || t2.roomId !== 'room-main' || t2.shape !== 'circle') {
      console.error('❌ ERROR: Table details mismatch', t2);
      process.exit(1);
    }

    const reconstructed = await tableRepository.getRoomLayouts(locationId);
    if (reconstructed.length !== 2) {
      console.error('❌ ERROR: Expected 2 rooms from getRoomLayouts');
      process.exit(1);
    }
    const roomMain = reconstructed.find((r) => r.id === 'room-main');
    if (!roomMain || roomMain.tables.length !== 3) {
      console.error('❌ ERROR: Main room reconstruction failed');
      process.exit(1);
    }
    console.log('✅ T1.4: GET reconstruction matches saved layout');

    // T1.5 — delete table from layout
    const roomsAfterDelete = mockRooms.map((room) =>
      room.id === 'room-main'
        ? { ...room, tables: room.tables.filter((t) => t.id !== 'tab-3') }
        : room,
    );
    await tableRepository.saveRoomLayouts(locationId, roomsAfterDelete);
    const afterDeleteCount = await prisma.table.count({ where: { locationId } });
    if (afterDeleteCount !== 4 || (await prisma.table.findUnique({ where: { id: 'tab-3' } }))) {
      console.error('❌ ERROR: T1.5 delete table failed');
      process.exit(1);
    }
    console.log('✅ T1.5: Deleted table removed from DB');

    // T1.7 — FK guard
    await prisma.order.create({
      data: {
        id: 'ORD-LAYOUT-FK',
        orderNumber: 'ORD-LAYOUT-FK',
        locationId,
        source: 'dine_in',
        status: 'preparing',
        total: 10,
        tableId: 'tab-2',
        customerName: 'FK Test',
        items: { create: [{ name: 'Coffee', price: 10, quantity: 1 }] },
      },
    });
    const roomsFkAttempt = roomsAfterDelete.map((room) =>
      room.id === 'room-main'
        ? { ...room, tables: room.tables.filter((t) => t.id !== 'tab-2') }
        : room,
    );
    let fkBlocked = false;
    try {
      await tableRepository.saveRoomLayouts(locationId, roomsFkAttempt);
    } catch (e) {
      if (e instanceof LayoutValidationError) fkBlocked = true;
      else throw e;
    }
    if (!fkBlocked || !(await prisma.table.findUnique({ where: { id: 'tab-2' } }))) {
      console.error('❌ ERROR: T1.7 FK guard failed');
      process.exit(1);
    }
    console.log('✅ T1.7: FK guard blocks deleting table with orders');

    console.log('--- Location & Room Layouts Integration Test Passed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during Room/Layout integration test:', error);
    process.exit(1);
  } finally {
    await cleanup().catch(() => {});
    await disconnectDb();
  }
}

main();
