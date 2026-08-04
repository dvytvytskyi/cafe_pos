import { GET as layoutGET, POST as layoutPOST } from '../app/api/locations/[id]/layout/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting Location & Room Layouts Integration Test ---');

  const locationId = 'loc-layout-test';

  try {
    // 0. Setup Location first
    console.log('Setting up mock Location in DB...');
    await prisma.orderItem.deleteMany({ where: { order: { locationId } } });
    await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } });
    await prisma.order.deleteMany({ where: { locationId } });
    await prisma.table.deleteMany({ where: { locationId } });
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});

    await prisma.location.create({
      data: { id: locationId, name: 'Layout Test Cafe', address: 'Layout Road 99' }
    });

    // 1. Prepare rooms layout payload
    const mockRooms: any[] = [
      {
        id: 'room-main',
        name: 'Main Dining Room',
        tables: [
          { id: 'tab-1', name: 'Table 1', x: 100, y: 100, width: 60, height: 60, type: 'rect', seats: 4, status: 'available' },
          { id: 'tab-2', name: 'Table 2', x: 200, y: 100, width: 60, height: 60, type: 'circle', seats: 4, status: 'occupied' },
          { id: 'tab-3', name: 'Table 3', x: 300, y: 100, width: 80, height: 80, type: 'rect', seats: 6, status: 'available' }
        ],
        zones: [
          { id: 'zone-a', name: 'Zone A', points: [{ x: 50, y: 50 }, { x: 400, y: 50 }, { x: 400, y: 200 }] }
        ],
        obstacles: [
          { id: 'ob-bar', name: 'Service Bar Counter', points: [{ x: 10, y: 10 }, { x: 100, y: 10 }] }
        ]
      },
      {
        id: 'room-terrace',
        name: 'Outdoor Terrace',
        tables: [
          { id: 'tab-4', name: 'Terrace 1', x: 500, y: 500, width: 60, height: 60, type: 'rect', seats: 2, status: 'available' },
          { id: 'tab-5', name: 'Terrace 2', x: 600, y: 500, width: 60, height: 60, type: 'rect', seats: 2, status: 'dirty' }
        ],
        zones: [],
        obstacles: []
      }
    ];

    // 2. Invoke POST API route
    console.log('Sending layout payload to POST /api/locations/[id]/layout...');
    const postReq = new Request(`http://localhost/api/locations/${locationId}/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms: mockRooms })
    });

    const postRes = await layoutPOST(postReq, { params: Promise.resolve({ id: locationId }) });
    const postResult = await postRes.json();

    console.log('POST Response:', postResult);
    if (postRes.status !== 200 || !postResult.success) {
      console.error('❌ ERROR: POST API returned failure status.');
      process.exit(1);
    }
    console.log('✅ Success: Layout saved via API endpoint.');

    // 3. Verify Database State directly
    console.log('Verifying DB entries directly...');
    const dbLoc = await prisma.location.findUnique({
      where: { id: locationId }
    });

    const meta = dbLoc?.layoutMetadata as any;
    if (!meta || !meta['room-main'] || meta['room-main'].zones.length !== 1 || meta['room-main'].obstacles.length !== 1) {
      console.error('❌ ERROR: Location metadata (zones/obstacles) not saved correctly.');
      process.exit(1);
    }
    console.log('✅ Success: Location metadata successfully saved in PostgreSQL.');

    const dbTables = await prisma.table.findMany({
      where: { locationId }
    });

    console.log('DB Tables found:', dbTables.length);
    if (dbTables.length !== 5) {
      console.error(`❌ ERROR: Expected 5 tables in DB, found ${dbTables.length}`);
      process.exit(1);
    }

    const t2 = dbTables.find(t => t.id === 'tab-2');
    if (!t2 || t2.number !== 'Table 2' || t2.roomId !== 'room-main' || t2.seats !== 4 || t2.shape !== 'circle') {
      console.error('❌ ERROR: Table details or shape/seats not saved correctly in DB.', t2);
      process.exit(1);
    }
    console.log('✅ Success: Table entries successfully saved and associated with correct rooms.');

    // 4. Invoke GET API route and check reconstruction
    console.log('Fetching layout from GET /api/locations/[id]/layout...');
    const getReq = new Request(`http://localhost/api/locations/${locationId}/layout`);
    const getRes = await layoutGET(getReq, { params: Promise.resolve({ id: locationId }) });
    const getResult = await getRes.json();

    console.log('GET Rooms count:', getResult.length);
    if (getRes.status !== 200 || getResult.length !== 2) {
      console.error('❌ ERROR: GET API failed to return the 2 reconstructed rooms.');
      process.exit(1);
    }

    const roomMain = getResult.find((r: any) => r.id === 'room-main');
    if (!roomMain || roomMain.tables.length !== 3 || roomMain.zones.length !== 1 || roomMain.obstacles.length !== 1) {
      console.error('❌ ERROR: Reconstructed Main Dining Room properties mismatch.', roomMain);
      process.exit(1);
    }
    console.log('✅ Success: GET API successfully reconstructed and returned the complete room layouts.');

    // 5. Cleanup
    console.log('Cleaning up mock Location and Tables...');
    await prisma.table.deleteMany({ where: { locationId } });
    await prisma.location.delete({ where: { id: locationId } });

    console.log('--- Location & Room Layouts Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Room/Layout integration test:', error);
    try {
      await prisma.table.deleteMany({ where: { locationId } }).catch(() => {});
      await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
