/**
 * Run tests for the latest ready module (or a specific module).
 *
 * Usage:
 *   npm run test:latest              # unit + integration + browser for latest ready module
 *   npm run test:browser-latest      # browser only for latest ready module
 *   npm run test:module -- 25        # full test for module 25
 *   npm run test:module -- 25 --browser-only
 */
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '../..');
const REPO_ROOT = join(WEB_ROOT, '../..');
const PLAN_PATH = join(REPO_ROOT, 'plan-back/fe-be-upd.md');

type ModuleDef = {
  name: string;
  /** npm script — unit + integration + browser */
  full: string;
  /** browser-only script(s) */
  browser: string[];
};

/** Modules with browser E2E in the M9+ incremental track. */
export const MODULE_REGISTRY: Record<number, ModuleDef> = {
  1: { name: 'TablesView', full: 'test:tables', browser: [] },
  2: { name: 'POS Terminal', full: 'test:pos', browser: [] },
  3: { name: 'Payment', full: 'test:payment-transaction', browser: [] },
  4: { name: 'Refunds/Fiscal', full: 'test:fiscal', browser: [] },
  5: { name: 'eMenu', full: 'test:emenu', browser: [] },
  6: { name: 'OrdersBoard', full: 'test:orders-board', browser: [] },
  9: { name: 'BoardSettings', full: 'test:board-settings', browser: ['test-board-settings-browser.ts'] },
  10: { name: 'DailyChecklists', full: 'test:checklists', browser: ['test-checklists-browser.ts'] },
  11: { name: 'PhotoProofUpload', full: 'test:upload', browser: ['test-upload-browser.ts'] },
  12: { name: 'OpsDashboard', full: 'test:operations-kpi', browser: ['test-operations-kpi-browser.ts'] },
  13: { name: 'MenusView', full: 'test:menus', browser: ['test-menus-view-browser.ts'] },
  14: { name: 'DishModal', full: 'test:dish-modal', browser: ['test-dish-modal-browser.ts'] },
  15: { name: 'Modifiers', full: 'test:modifiers', browser: ['test-modifiers-browser.ts'] },
  16: { name: 'Staff admin', full: 'test:staff', browser: ['test-staff-browser.ts'] },
  17: { name: 'EmployeeModal', full: 'test:staff', browser: ['test-staff-browser.ts'] },
  18: { name: 'Time tracking', full: 'test:time-tracking', browser: ['test-timecard-browser.ts'] },
  19: { name: 'Schedule', full: 'test:schedule', browser: ['test-schedule-browser.ts'] },
  20: { name: 'CRM admin', full: 'test:crm', browser: ['test-crm-browser.ts'] },
  21: { name: 'Customer modal', full: 'test:crm', browser: ['test-crm-browser.ts'] },
  22: { name: 'Points modal', full: 'test:crm', browser: ['test-crm-browser.ts'] },
  23: { name: 'QR code', full: 'test:crm', browser: ['test-crm-qr-browser.ts'] },
  24: { name: 'Profile', full: 'test:profile', browser: ['test-profile-browser.ts'] },
  25: { name: 'POS settings', full: 'test:pos-settings', browser: ['test-pos-settings-browser.ts'] },
  26: { name: 'Printers', full: 'test:printers', browser: ['test-printers-browser.ts'] },
  27: { name: 'Taxes', full: 'test:taxes', browser: ['test-taxes-browser.ts'] },
  28: { name: 'Gift cards', full: 'test:giftcards', browser: ['test-giftcards-browser.ts'] },
  29: { name: 'Audit panel', full: 'test:audit', browser: ['test-audit-browser.ts'] },
  30: { name: 'Backups', full: 'test:backups', browser: ['test-backups-browser.ts'] },
  31: { name: 'Reputation', full: 'test:reputation', browser: ['test-reputation-browser.ts'] },
  32: { name: 'History', full: 'test:orders-history', browser: ['test-orders-history-browser.ts'] },
  33: { name: 'Reports', full: 'test:reports', browser: ['test-reports-financial-browser.ts'] },
  34: { name: 'Inventory', full: 'test:inventory', browser: ['test-inventory-browser.ts'] },
  35: { name: 'Auth / Home', full: 'test:auth', browser: ['test-auth-browser.ts'] },
};

/** Parse plan table — last column `ready` = browser/manual done. */
export function findLatestReadyModule(planText: string): number | null {
  let latest: number | null = null;

  for (const line of planText.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 6) continue;

    const num = Number.parseInt(cols[0]!, 10);
    if (Number.isNaN(num) || num < 9) continue;

    const browserStatus = cols[5]!.toLowerCase();
    if (browserStatus === 'ready' && MODULE_REGISTRY[num]) {
      if (latest === null || num > latest) latest = num;
    }
  }

  return latest;
}

function parseArgs(argv: string[]) {
  let moduleId: number | null = null;
  let browserOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--browser-only' || arg === '-b') {
      browserOnly = true;
    } else if (arg === '--module' || arg === '-m') {
      moduleId = Number.parseInt(argv[++i] ?? '', 10);
    } else if (/^\d+$/.test(arg)) {
      moduleId = Number.parseInt(arg, 10);
    }
  }

  return { moduleId, browserOnly };
}

function run(cmd: string, args: string[], label: string): number {
  console.log(`\n▶ ${label}`);
  console.log(`  ${cmd} ${args.join(' ')}\n`);
  const result = spawnSync(cmd, args, { cwd: WEB_ROOT, stdio: 'inherit', env: process.env });
  return result.status ?? 1;
}

function main() {
  const { moduleId: argModule, browserOnly } = parseArgs(process.argv.slice(2));

  let moduleId = argModule;
  if (moduleId === null) {
    let planText: string;
    try {
      planText = readFileSync(PLAN_PATH, 'utf8');
    } catch {
      console.error(`❌ Cannot read plan: ${PLAN_PATH}`);
      process.exit(1);
    }
    moduleId = findLatestReadyModule(planText);
    if (moduleId === null) {
      console.error('❌ No ready browser module found in plan (M9+). Set manually: npm run test:module -- 25');
      process.exit(1);
    }
    console.log(`📋 Latest ready module from plan: M${moduleId} — ${MODULE_REGISTRY[moduleId]?.name ?? '?'}`);
  }

  const mod = MODULE_REGISTRY[moduleId];
  if (!mod) {
    console.error(`❌ Module M${moduleId} has no test registry entry. Add it to run-latest-module-test.ts`);
    process.exit(1);
  }

  console.log(`\n=== M${moduleId} ${mod.name} ===`);
  console.log(browserOnly ? 'Mode: browser only' : 'Mode: full (unit + integration + browser)');

  if (browserOnly) {
    let exitCode = 0;
    for (const file of mod.browser) {
      const code = run(
        'node',
        ['--experimental-strip-types', `src/lib/${file}`],
        `Browser: ${file}`
      );
      if (code !== 0) exitCode = code;
    }
    process.exit(exitCode);
  }

  const code = run('npm', ['run', mod.full], `Full: npm run ${mod.full}`);
  process.exit(code);
}

main();
