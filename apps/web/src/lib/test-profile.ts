/**
 * Module 24 — Profile integration (T24.2–T24.3)
 */
import { prisma } from './db.ts';
import { hashPassword } from './profile-password.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M24-Profile';
const ROLE_ID = 'role-profile-test';
const USER_A = `${PREFIX}-user-a`;
const USER_B = `${PREFIX}-user-b`;

async function cleanup() {
  await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } }).catch(() => {});
  await prisma.role.deleteMany({ where: { id: ROLE_ID } }).catch(() => {});
}

async function setup() {
  await cleanup();
  await prisma.role.create({
    data: { id: ROLE_ID, name: `${PREFIX}-role`, permissions: {} },
  });
  await prisma.user.create({
    data: {
      id: USER_A,
      name: `${PREFIX} Alpha`,
      email: `${PREFIX}-a@test.com`,
      pinHash: 'dummy',
      roleId: ROLE_ID,
      passwordHash: hashPassword('OldPass1!'),
    },
  });
  await prisma.user.create({
    data: {
      id: USER_B,
      name: `${PREFIX} Beta`,
      email: `${PREFIX}-b@test.com`,
      pinHash: 'dummy',
      roleId: ROLE_ID,
    },
  });
}

async function main() {
  console.log('--- Module 24 Profile Integration Tests ---');
  await setup();

  const getRes = await fetch(`${BASE}/api/profile?userId=${USER_A}`);
  const profile = await getRes.json();
  if (getRes.status !== 200 || profile.id !== USER_A || profile.passwordHash !== undefined) {
    console.error('❌ GET profile failed', getRes.status, profile);
    process.exit(1);
  }
  console.log('✅ GET profile returns safe fields');

  const dupRes = await fetch(`${BASE}/api/profile?userId=${USER_A}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: profile.name, email: `${PREFIX}-b@test.com` }),
  });
  const dupBody = await dupRes.json();
  if (dupRes.status !== 409 || dupBody.error !== 'EMAIL_ALREADY_IN_USE') {
    console.error('❌ duplicate email expected 409', dupRes.status, dupBody);
    process.exit(1);
  }
  console.log('✅ T24.2 duplicate email → 409 EMAIL_ALREADY_IN_USE');

  const badPwd = await fetch(`${BASE}/api/profile/password?userId=${USER_A}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword: 'WrongPass1!', newPassword: 'NewPass2@' }),
  });
  const badBody = await badPwd.json();
  if (badPwd.status !== 400 || badBody.error !== 'INVALID_CURRENT_PASSWORD') {
    console.error('❌ wrong old password expected 400', badPwd.status, badBody);
    process.exit(1);
  }
  console.log('✅ T24.3 invalid current password → 400');

  const okPwd = await fetch(`${BASE}/api/profile/password?userId=${USER_A}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword: 'OldPass1!', newPassword: 'NewPass2@' }),
  });
  if (okPwd.status !== 200) {
    console.error('❌ password change failed', okPwd.status, await okPwd.text());
    process.exit(1);
  }
  const dbUser = await prisma.user.findUnique({ where: { id: USER_A } });
  const { verifyPassword } = await import('./profile-password.ts');
  if (!dbUser?.passwordHash || !verifyPassword('NewPass2@', dbUser.passwordHash)) {
    console.error('❌ password hash not updated in DB');
    process.exit(1);
  }
  console.log('✅ T24.3 password change verified in DB');

  const updateRes = await fetch(`${BASE}/api/profile?userId=${USER_A}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `${PREFIX} Updated`, email: `${PREFIX}-updated@test.com`, phone: '+380991112233' }),
  });
  const updated = await updateRes.json();
  if (updateRes.status !== 200 || updated.name !== `${PREFIX} Updated`) {
    console.error('❌ profile update failed', updateRes.status, updated);
    process.exit(1);
  }
  console.log('✅ profile fields update → 200');

  await cleanup();
  console.log('--- Module 24 Profile Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  process.exit(1);
});
