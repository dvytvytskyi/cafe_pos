import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pgPool: Pool;
};

const pool =
  globalForPrisma.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

/** Close Prisma + pg pool so Node scripts can exit (adapter keeps pool open after $disconnect). */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect().catch(() => {});
  if (!pool.ended) {
    await pool.end().catch(() => {});
  }
}

/** Run a one-shot import/script and exit cleanly (avoids hang after pool disconnect). */
export async function runScriptAndExit(fn: () => Promise<void>): Promise<void> {
  let exitCode = 0;
  try {
    await fn();
  } catch (e) {
    console.error(e);
    exitCode = 1;
  } finally {
    await disconnectDb();
    process.exit(exitCode);
  }
}
