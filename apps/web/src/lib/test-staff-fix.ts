/**
 * Modules 16–17 — Staff fix integration tests (T16.4–T17.5)
 */
import { prisma, disconnectDb } from './db.ts';
import { createHash } from 'crypto';

const BASE = 'http://localhost:3000';
const ROLE_ID = 'role-staff-fix-test';
const PREFIX = 'StaffFixTest';

function hashPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { roleId: ROLE_ID } });
  await prisma.role.delete({ where: { id: ROLE_ID } }).catch(() => {});
}

async function setupRole() {
  await cleanup();
  await prisma.role.create({
    data: {
      id: ROLE_ID,
      name: `${PREFIX}-Waiter`,
      permissions: { orders: ['view', 'create'] },
    },
  });
}

async function createStaff(name: string, pin: string) {
  const res = await fetch(`${BASE}/api/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      pin,
      roleId: ROLE_ID,
      position: 'Waiter',
      section: 'Floor',
      status: 'active',
    }),
  });
  return { res, body: await res.json() };
}

async function main() {
  console.log('--- Modules 16–17 Staff Fix Integration Tests ---');
  let exitCode = 0;

  try {
    await setupRole();

    const created: { id: string; name: string; pin: string }[] = [];
    for (let i = 1; i <= 3; i++) {
      const pin = `${4000 + i}`;
      const { res, body } = await createStaff(`${PREFIX} Employee ${i}`, pin);
      if (res.status !== 201) {
        console.error(`❌ T17.5: failed to create employee ${i}`, body);
        exitCode = 1;
        break;
      }
      created.push({ id: body.id, name: body.name, pin });
    }
    if (exitCode === 0) {
      console.log('✅ T17.5 create user with role');

      const dbUser = await prisma.user.findUnique({ where: { id: created[0]!.id } });
      if (!dbUser?.pinHash || dbUser.pinHash === created[0]!.pin) {
        console.error('❌ T17.3 integration: pin not hashed in DB');
        exitCode = 1;
      } else if (dbUser.pinHash !== hashPin(created[0]!.pin)) {
        console.error('❌ T17.3 integration: pinHash mismatch');
        exitCode = 1;
      }
    }

    const pageRes = await fetch(`${BASE}/api/staff?page=1&limit=2&status=active`);
    const pageBody = await pageRes.json();
    if (
      pageRes.status !== 200 ||
      !Array.isArray(pageBody.items) ||
      pageBody.items.length > 2 ||
      typeof pageBody.total !== 'number'
    ) {
      console.error('❌ T16.4 pagination', pageBody);
      exitCode = 1;
    } else {
      console.log(`✅ T16.4 pagination page=1 limit=2 total=${pageBody.total}`);
    }

    const listRes = await fetch(`${BASE}/api/staff`);
    const listBody = await listRes.json();
    const sample = Array.isArray(listBody) ? listBody[0] : listBody.items?.[0];
    if (!sample || 'pin' in sample || 'pinHash' in sample || 'password' in sample) {
      console.error('❌ T16.5 sensitive fields exposed in GET', sample);
      exitCode = 1;
    } else {
      console.log('✅ T16.5 pin/password absent in GET response');
    }

    const dupRes = await fetch(`${BASE}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${PREFIX} Duplicate`,
        pin: created[0]!.pin,
        roleId: ROLE_ID,
        status: 'active',
      }),
    });
    const dupBody = await dupRes.json();
    if (dupRes.status !== 409 || dupBody.code !== 'PIN_DUPLICATE') {
      console.error('❌ T17.4 duplicate PIN', dupRes.status, dupBody);
      exitCode = 1;
    } else {
      console.log('✅ T17.4 duplicate PIN → 409 PIN_DUPLICATE');
    }

    if (exitCode === 0) {
      console.log('--- Modules 16–17 Staff Fix Integration Tests Passed ---');
    }
  } catch (err) {
    exitCode = 1;
    console.error(err);
  } finally {
    await cleanup();
    await disconnectDb();
    process.exit(exitCode);
  }
}

main();
