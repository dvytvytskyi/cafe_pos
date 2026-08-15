import { readFileSync } from 'fs';
import { resolve } from 'path';

for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
    break;
  } catch {
    /* next */
  }
}

async function main() {
  const { prisma, disconnectDb } = await import('../src/lib/db.ts');
  const range = await prisma.order.aggregate({
    _min: { createdAt: true },
    _max: { createdAt: true },
    _count: true,
  });
  console.log(JSON.stringify(range, null, 2));
  await disconnectDb();
}

main().catch(console.error);
