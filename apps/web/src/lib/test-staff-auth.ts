import { POST as loginPinPOST } from '../app/api/auth/login-pin/route';
import { GET as staffGET, POST as staffPOST } from '../app/api/staff/route';
import { PUT as staffPUT, DELETE as staffDELETE } from '../app/api/staff/[id]/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting Staff & Authorization Integration Test ---');

  const locationId = 'loc-staff-test';
  const roleId = 'role-staff-test';
  const testStaffId = 'emp-staff-test-id';

  try {
    // 0. Setup Location and Role records first
    console.log('Setting up mock Location and Role in DB...');
    await prisma.orderItem.deleteMany({ where: { order: { locationId } } });
    await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } });
    await prisma.order.deleteMany({ where: { locationId } });
    await prisma.user.deleteMany({ where: { roleId } });
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    await prisma.role.delete({ where: { id: roleId } }).catch(() => {});

    await prisma.location.create({
      data: { id: locationId, name: 'Staff Test Cafe', address: 'Calle Major 10' }
    });

    await prisma.role.create({
      data: { id: roleId, name: 'Waiter', permissions: { orders: ['create', 'view'] } }
    });

    // 1. Create a staff member via POST /api/staff
    console.log('Creating staff member via POST /api/staff...');
    const createPayload = {
      name: 'Maria Hidalgo',
      pin: '7788',
      roleId,
      locationIds: [locationId],
      position: 'Floor Waiter',
      section: 'Floor',
      nie: 'X1234567A',
      phone: '+34 600 111 222',
      email: 'maria@corgicafe.com',
      contractStart: '2026-08-01',
      scheduleStart: '08:00',
      scheduleEnd: '16:00',
      daysPerWeek: 5,
      avatarInitials: 'MH',
      status: 'active'
    };

    const createReq = new Request('http://localhost/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });

    const createRes = await staffPOST(createReq);
    const createdUser = await createRes.json();

    console.log('Created User Response:', createdUser);

    if (createRes.status !== 201 || !createdUser.id || createdUser.name !== 'Maria Hidalgo') {
      console.error('❌ ERROR: Failed to create staff member via API.');
      process.exit(1);
    }
    console.log('✅ Success: Staff member created successfully.');

    // Save ID for further checks
    const targetUserId = createdUser.id;

    // Verify DB contains pinHash and not the raw pin
    const dbUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!dbUser || dbUser.pinHash === '7788' || !dbUser.pinHash) {
      console.error('❌ ERROR: User not saved correctly or PIN hash is missing/insecure.');
      process.exit(1);
    }
    console.log('✅ Success: User successfully saved in PostgreSQL with secure PIN hashing.');

    // 2. Verify PIN Login via POST /api/auth/login-pin
    console.log('Verifying PIN login with CORRECT PIN...');
    const loginReq = new Request('http://localhost/api/auth/login-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '7788' })
    });

    const loginRes = await loginPinPOST(loginReq);
    const loginResult = await loginRes.json();

    console.log('Login Correct Response:', loginResult);
    if (loginRes.status !== 200 || !loginResult.success || loginResult.user.id !== targetUserId) {
      console.error('❌ ERROR: Login with correct PIN failed.');
      process.exit(1);
    }
    console.log('✅ Success: Login with correct PIN succeeded.');

    // 3. Verify PIN Login with INCORRECT PIN
    console.log('Verifying PIN login with INCORRECT PIN...');
    const badLoginReq = new Request('http://localhost/api/auth/login-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '0000' })
    });

    const badLoginRes = await loginPinPOST(badLoginReq);
    console.log(`Login Incorrect Status: ${badLoginRes.status}`);

    if (badLoginRes.status !== 401) {
      console.error('❌ ERROR: Login with incorrect PIN did not return 401.');
      process.exit(1);
    }
    console.log('✅ Success: Login with incorrect PIN correctly rejected.');

    // 4. Fetch staff list via GET /api/staff
    console.log('Fetching staff list via GET /api/staff...');
    const listReq = new Request('http://localhost/api/staff');
    const listRes = await staffGET();
    const listResult = await listRes.json();

    console.log('Staff list size:', listResult.length);
    const foundUser = listResult.find((u: any) => u.id === targetUserId);

    if (!foundUser || foundUser.pinHash !== undefined) {
      console.error('❌ ERROR: Staff member not in list or sensitive pinHash was exposed.');
      process.exit(1);
    }
    console.log('✅ Success: Staff list retrieved, exposing zero sensitive fields.');

    // 5. Update employee details via PUT /api/staff/[id]
    console.log('Updating staff member details...');
    const updatePayload = {
      name: 'Maria Hidalgo Updated',
      position: 'Senior Floor Manager',
      phone: '+34 600 999 999'
    };

    const updateReq = new Request(`http://localhost/api/staff/${targetUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    // Mock Next.js App Router context parameters
    const updateRes = await staffPUT(updateReq, { params: Promise.resolve({ id: targetUserId }) });
    const updatedUserRes = await updateRes.json();

    console.log('Updated User Response:', updatedUserRes);

    if (updateRes.status !== 200 || updatedUserRes.name !== 'Maria Hidalgo Updated' || updatedUserRes.position !== 'Senior Floor Manager') {
      console.error('❌ ERROR: PUT update endpoint failed.');
      process.exit(1);
    }
    console.log('✅ Success: Staff member details updated successfully.');

    // 6. Delete staff member via DELETE /api/staff/[id]
    console.log('Deleting staff member...');
    const deleteReq = new Request(`http://localhost/api/staff/${targetUserId}`, {
      method: 'DELETE'
    });

    const deleteRes = await staffDELETE(deleteReq, { params: Promise.resolve({ id: targetUserId }) });
    const deleteResult = await deleteRes.json();

    console.log('Delete Response:', deleteResult);

    if (deleteRes.status !== 200 || !deleteResult.success) {
      console.error('❌ ERROR: DELETE endpoint failed.');
      process.exit(1);
    }

    const verifyDbUserDeleted = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (verifyDbUserDeleted) {
      console.error('❌ ERROR: User was not deleted from PostgreSQL.');
      process.exit(1);
    }
    console.log('✅ Success: Staff member deleted from PostgreSQL.');

    // 7. Cleanup Role and Location
    console.log('Cleaning up mock Location and Role...');
    await prisma.location.delete({ where: { id: locationId } });
    await prisma.role.delete({ where: { id: roleId } });

    console.log('--- Staff & Authorization Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Staff/Auth integration test:', error);
    try {
      await prisma.user.deleteMany({ where: { roleId } }).catch(() => {});
      await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
      await prisma.role.delete({ where: { id: roleId } }).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
