/**
 * Integration test orchestrator — DB/Redis suites (no dev server required).
 * For HTTP API suites, run `npm run test:integration:http` with dev server on :3000.
 */
import { spawnSync } from 'child_process';
import path from 'path';

const webRoot = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

type Suite = { name: string; cmd: string; args: string[] };

const DB_SUITES: Suite[] = [
  { name: 'POS block (M1–M3)', cmd: 'npm', args: ['run', 'test:pos-block'] },
  { name: 'Fiscal + eMenu + OrdersBoard (M4–M6)', cmd: 'npm', args: ['run', 'test:m4-6'] },
  { name: 'Cash shifts', cmd: 'tsx', args: ['src/lib/test-cash-shifts.ts'] },
];

const HTTP_SUITES: Suite[] = [
  { name: 'Auth session (needs :3000)', cmd: 'npm', args: ['run', 'test:auth'] },
  { name: 'Inventory (needs :3000)', cmd: 'npm', args: ['run', 'test:inventory'] },
  { name: 'Order history (needs :3000)', cmd: 'tsx', args: ['src/lib/test-orders-history.ts'] },
];

function runSuite(suite: Suite): boolean {
  console.log(`\n▶ ${suite.name}`);
  const result = spawnSync(suite.cmd, suite.args, {
    cwd: webRoot,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status === 0;
}

function runGroup(title: string, suites: Suite[]): { passed: number; failed: number } {
  console.log(`\n--- ${title} ---`);
  let passed = 0;
  let failed = 0;
  for (const suite of suites) {
    if (runSuite(suite)) passed++;
    else failed++;
  }
  return { passed, failed };
}

function main() {
  const httpOnly = process.argv.includes('--http');

  console.log('==============================================');
  console.log('🧪 Corgi POS Integration Test Orchestrator');
  console.log('==============================================');

  const db = runGroup('Database / Redis integration', DB_SUITES);
  let http = { passed: 0, failed: 0 };
  if (httpOnly) {
    http = runGroup('HTTP API integration (dev server required)', HTTP_SUITES);
  } else {
    console.log('\nℹ️  Skipping HTTP suites. Run with --http when dev server is on :3000');
  }

  const passed = db.passed + http.passed;
  const failed = db.failed + http.failed;

  console.log('\n==============================================');
  console.log(`FINAL: ${passed} passed, ${failed} failed`);
  console.log('==============================================');
  process.exit(failed > 0 ? 1 : 0);
}

main();
