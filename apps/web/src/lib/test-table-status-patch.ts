import { PATCH as tablePATCH } from '../app/api/tables/[id]/route';
import { POST as layoutPOST } from '../app/api/locations/[id]/layout/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting Table Status PATCH Integration Test ---');

  const locationId = 'loc-patch-test';
  const tableId = 'tab-patch-1';

  try {
    await prisma.table.deleteMany({ where: { locationId } }).catch(() => {});
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});

    await prisma.location.create({
      data: { id: locationId, name: 'PATCH Test Cafe', address: 'Test St' },
    });

    const rooms = [
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
    ];

    const postReq = new Request(`http://localhost/api/locations/${locationId}/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms }),
    });
    const postRes = await layoutPOST(postReq, { params: Promise.resolve({ id: locationId }) });
    if (postRes.status !== 200) {
      console.error('❌ ERROR: Failed to seed layout');
      process.exit(1);
    }

    const patchReq = new Request(`http://localhost/api/tables/${tableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'occupied' }),
    });
    const patchRes = await tablePATCH(patchReq, { params: Promise.resolve({ id: tableId }) });
    const patchBody = await patchRes.json();

    if (patchRes.status !== 200 || patchBody.status !== 'occupied') {
      console.error('❌ ERROR: PATCH did not return occupied status', patchBody);
      process.exit(1);
    }

    const dbTable = await prisma.table.findUnique({ where: { id: tableId } });
    if (!dbTable || dbTable.status !== 'occupied') {
      console.error('❌ ERROR: DB status not updated');
      process.exit(1);
    }

    const invalidReq = new Request(`http://localhost/api/tables/${tableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid' }),
    });
    const invalidRes = await tablePATCH(invalidReq, { params: Promise.resolve({ id: tableId }) });
    if (invalidRes.status !== 400) {
      console.error('❌ ERROR: Expected 400 for invalid status');
      process.exit(1);
    }

    console.log('✅ Success: Table status PATCH works without full layout POST');

    await prisma.table.deleteMany({ where: { locationId } });
    await prisma.location.delete({ where: { id: locationId } });

    console.log('--- Table Status PATCH Integration Test Passed ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
