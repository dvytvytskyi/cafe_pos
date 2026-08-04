import { run as runFiscal } from './test-unit-fiscal';
import { run as runPin } from './test-unit-pin';
import { run as runPromotions } from './test-unit-promotions';
import { run as runOfflineSync } from './test-unit-offline-sync';
import { run as runShifts } from './test-unit-shifts';
import { run as runGiftCards } from './test-unit-giftcards';
import { run as runInventory } from './test-unit-inventory';
import { run as runOrders } from './test-unit-orders';
import { run as runWebhooks } from './test-unit-webhooks';
import { run as runBackups } from './test-unit-backups';
import { run as runNativeBridge } from './test-unit-native-bridge';
import { run as runStaffAuth } from './test-unit-staff-auth';
import { run as runTablesLayout } from './test-unit-tables-layout';
import { run as runMenu } from './test-unit-menu';
import { run as runAuditTrail } from './test-unit-audit-trail';

async function main() {
  console.log('==============================================');
  console.log('🚀 Running Corgi POS COMPLETE 15-Module Unit Testing Suite...');
  console.log('==============================================');

  const tests = [
    { name: '🔒 Fiscal SHA-256 Chaining', fn: runFiscal },
    { name: '🔑 PIN Code Hashing', fn: runPin },
    { name: '🏷️ Promotions Scheduler', fn: runPromotions },
    { name: '📲 Offline Sync Vector Clocks', fn: runOfflineSync },
    { name: '💵 Cash Shifts Balance Math', fn: runShifts },
    { name: '💳 Gift Cards Expiry & Limits', fn: runGiftCards },
    { name: '📦 Stock Deductions Math', fn: runInventory },
    { name: '🛍️ Orders & Totals Calculations', fn: runOrders },
    { name: '🛡️ Webhook Signature Verification', fn: runWebhooks },
    { name: '💾 Database Backups Retention', fn: runBackups },
    { name: '🔌 Native Bridge Printer ESC/POS', fn: runNativeBridge },
    { name: '🔑 Staff Role Permission Matrix', fn: runStaffAuth },
    { name: '🗺️ Room Layout Bounding Overlaps', fn: runTablesLayout },
    { name: '🍔 Menu Filters & Price Lists', fn: runMenu },
    { name: '🛡️ POS Audit Trail Chain Integrity', fn: runAuditTrail }
  ];

  let passedCount = 0;
  let failedCount = 0;
  const results: { name: string; status: 'PASSED' | 'FAILED'; error?: string }[] = [];

  for (const t of tests) {
    try {
      await t.fn();
      results.push({ name: t.name, status: 'PASSED' });
      passedCount++;
    } catch (e: any) {
      console.error(`❌ Test failed: ${t.name}\n`, e);
      results.push({ name: t.name, status: 'FAILED', error: e.message });
      failedCount++;
    }
  }

  console.log('\n==============================================');
  console.log('📊 Unit Test Run Summary:');
  console.log('==============================================');
  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] - ${r.name}`);
    if (r.error) {
      console.log(`   └─ Error: ${r.error}`);
    }
  });
  console.log('----------------------------------------------');
  console.log(`Passed: ${passedCount}/${tests.length}`);
  console.log(`Failed: ${failedCount}/${tests.length}`);
  console.log('==============================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All 15 unit tests passed successfully!');
    process.exit(0);
  }
}

main();
