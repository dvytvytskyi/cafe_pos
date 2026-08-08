import { prisma } from './db.ts';

const ROLE_ID = 'role-tasks-test';
const USER_ID = 'user-tasks-test';

async function main() {
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'Task Tester', permissions: {} },
  });

  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'Task Test User',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
      avatarInitials: 'TT',
    },
  });

  console.log(USER_ID);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
