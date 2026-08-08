/**
 * Staff & Authorization integration regression (T16.8)
 */
import { prisma, disconnectDb } from './db.ts';
import { createHash } from 'crypto';

const BASE = 'http://localhost:3000';

function hashPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

async function main() {
  console.log('--- Starting Staff & Authorization Integration Test ---');

  const locationId = 'loc-staff-test';
  const roleId = 'role-staff-test';
  const adminRoleId = 'role-staff-admin-test';

  try {
    console.log('Setting up mock Location and Role in DB...');
    await prisma.orderItem.deleteMany({ where: { order: { locationId } } });
    await prisma.fiscalRecord.deleteMany({ where: { order: { locationId } } });
    await prisma.order.deleteMany({ where: { locationId } });
    await prisma.user.deleteMany({ where: { roleId: { in: [roleId, adminRoleId] } } });
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } }).catch(() => {});

    await prisma.location.create({
      data: { id: locationId, name: 'Staff Test Cafe', address: 'Calle Major 10' },
    });

    await prisma.role.create({
      data: {
        id: roleId,
        name: 'Waiter Staff Test Auth',
        permissions: { orders: ['create', 'view'] },
      },
    });

    await prisma.role.create({
      data: {
        id: adminRoleId,
        name: 'Manager Staff Test Auth',
        permissions: { staff: ['create', 'view', 'edit', 'delete'], orders: ['create', 'view'] },
      },
    });

    await prisma.user.create({
      data: {
        id: 'user-staff-admin-test',
        name: 'Admin Tester',
        pinHash: hashPin('9900'),
        roleId: adminRoleId,
        email: 'admin-staff-test@corgicafe.local',
        status: 'active',
        locations: { connect: [{ id: locationId }] },
      },
    });

    const adminLogin = await fetch(`${BASE}/api/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '9900' }),
    });
    const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0] ?? '';
    if (adminLogin.status !== 200 || !adminCookie) {
      console.error('❌ admin login failed for staff test');
      process.exit(1);
    }

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
      status: 'active',
    };

    const createRes = await fetch(`${BASE}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify(createPayload),
    });
    const createdUser = await createRes.json();

    if (createRes.status !== 201 || !createdUser.id || createdUser.name !== 'Maria Hidalgo') {
      console.error('❌ ERROR: Failed to create staff member via API.', createdUser);
      process.exit(1);
    }
    console.log('✅ Success: Staff member created successfully.');

    const targetUserId = createdUser.id;

    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!dbUser || dbUser.pinHash === '7788' || !dbUser.pinHash) {
      console.error('❌ ERROR: User not saved correctly or PIN hash is missing/insecure.');
      process.exit(1);
    }
    if (dbUser.pinHash !== hashPin('7788')) {
      console.error('❌ ERROR: PIN hash mismatch.');
      process.exit(1);
    }
    console.log('✅ Success: User saved with secure PIN hashing.');

    console.log('Verifying PIN login with CORRECT PIN...');
    const loginRes = await fetch(`${BASE}/api/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '7788' }),
    });
    const loginResult = await loginRes.json();

    if (loginRes.status !== 200 || !loginResult.success || loginResult.user.id !== targetUserId) {
      console.error('❌ ERROR: Login with correct PIN failed.', loginResult);
      process.exit(1);
    }
    console.log('✅ Success: Login with correct PIN succeeded.');

    console.log('Verifying PIN login with INCORRECT PIN...');
    const badLoginRes = await fetch(`${BASE}/api/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '0000' }),
    });
    if (badLoginRes.status !== 401) {
      console.error('❌ ERROR: Login with incorrect PIN did not return 401.');
      process.exit(1);
    }
    console.log('✅ Success: Login with incorrect PIN correctly rejected.');

    console.log('Fetching staff list via GET /api/staff...');
    const listRes = await fetch(`${BASE}/api/staff`);
    const listResult = await listRes.json();
    const foundUser = listResult.find((u: { id: string; pinHash?: string }) => u.id === targetUserId);

    if (!foundUser || foundUser.pinHash !== undefined) {
      console.error('❌ ERROR: Staff member not in list or sensitive pinHash was exposed.');
      process.exit(1);
    }
    console.log('✅ Success: Staff list retrieved, exposing zero sensitive fields.');

    console.log('Updating staff member details...');
    const updateRes = await fetch(`${BASE}/api/staff/${targetUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Maria Hidalgo Updated',
        position: 'Senior Floor Manager',
        phone: '+34 600 999 999',
      }),
    });
    const updatedUserRes = await updateRes.json();

    if (
      updateRes.status !== 200 ||
      updatedUserRes.name !== 'Maria Hidalgo Updated' ||
      updatedUserRes.position !== 'Senior Floor Manager'
    ) {
      console.error('❌ ERROR: PUT update endpoint failed.', updatedUserRes);
      process.exit(1);
    }
    console.log('✅ Success: Staff member details updated successfully.');

    console.log('Deleting staff member...');
    const deleteRes = await fetch(`${BASE}/api/staff/${targetUserId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    });
    const deleteResult = await deleteRes.json();

    if (deleteRes.status !== 200 || !deleteResult.success) {
      console.error('❌ ERROR: DELETE endpoint failed.');
      process.exit(1);
    }

    const verifyDbUserDeleted = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (verifyDbUserDeleted) {
      console.error('❌ ERROR: User was not deleted from PostgreSQL.');
      process.exit(1);
    }
    console.log('✅ Success: Staff member deleted from PostgreSQL.');

    await prisma.user.deleteMany({ where: { roleId: { in: [roleId, adminRoleId] } } }).catch(() => {});
    await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } }).catch(() => {});

    console.log('--- Staff & Authorization Integration Test Passed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during Staff/Auth integration test:', error);
    try {
      await prisma.user.deleteMany({ where: { roleId: { in: [roleId, adminRoleId] } } }).catch(() => {});
      await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
      await prisma.role.deleteMany({ where: { id: { in: [roleId, adminRoleId] } } }).catch(() => {});
    } catch {
      /* ignore */
    }
    process.exit(1);
  } finally {
    await disconnectDb();
  }
}

main();
