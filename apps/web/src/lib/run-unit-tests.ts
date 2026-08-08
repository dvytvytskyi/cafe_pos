import { run as runFiscal } from './test-unit-fiscal';
import { run as runPin } from './test-unit-pin';
import { run as runPromotions } from './test-unit-promotions';
import { run as runOfflineSync } from './test-unit-offline-sync';
import { run as runShifts } from './test-unit-shifts';
import { run as runGiftCards } from './test-unit-giftcards';
import { run as runInventory } from './test-unit-inventory';
import { run as runOrders } from './test-unit-orders';
import { run as runOrderMapper } from './test-unit-order-mapper';
import { run as runWebhooks } from './test-unit-webhooks';
import { run as runBackups } from './test-unit-backups';
import { run as runNativeBridge } from './test-unit-native-bridge';
import { run as runStaffAuth } from './test-unit-staff-auth';
import { run as runTablesLayout } from './test-unit-tables-layout';
import { run as runMenu } from './test-unit-menu';
import { run as runAuditTrail } from './test-unit-audit-trail';
import { run as runPayment } from './test-unit-payment';
import { run as runEmenu } from './test-unit-emenu';
import { run as runOrdersBoard } from './test-unit-orders-board';
import { run as runTasks } from './test-unit-tasks';
import { run as runTaskOffline } from './test-unit-task-offline';
import { run as runNewTaskModal } from './test-unit-new-task-modal';
import { run as runBoardSettings } from './test-unit-board-settings';
import { run as runChecklists } from './test-unit-checklists';
import { run as runUpload } from './test-unit-upload';
import { run as runOperationsKpi } from './test-unit-operations-kpi';
import { run as runCrm } from './test-unit-crm';
import { run as runProfile } from './test-unit-profile';
import { run as runPosSettings } from './test-unit-pos-settings';

async function main() {
  console.log('==============================================');
  console.log('🚀 Running Corgi POS COMPLETE 17-Module Unit Testing Suite...');
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
    { name: '🔄 Order Mapper Round-trip', fn: runOrderMapper },
    { name: '🛡️ Webhook Signature Verification', fn: runWebhooks },
    { name: '💾 Database Backups Retention', fn: runBackups },
    { name: '🔌 Native Bridge Printer ESC/POS', fn: runNativeBridge },
    { name: '🔑 Staff Role Permission Matrix', fn: runStaffAuth },
    { name: '🗺️ Room Layout Bounding Overlaps', fn: runTablesLayout },
    { name: '🍔 Menu Filters & Price Lists', fn: runMenu },
    { name: '🛡️ POS Audit Trail Chain Integrity', fn: runAuditTrail },
    { name: '💳 Payment Checkout Logic (T3.1–T3.5)', fn: runPayment },
    { name: '📱 eMenu Search & Allergen Filters (T5.1–T5.3)', fn: runEmenu },
    { name: '📋 OrdersBoard Column Filters & Sort (T6.1–T6.3)', fn: runOrdersBoard },
    { name: '✅ Task Date Validation (T7.1)', fn: runTasks },
    { name: '📲 Task Offline Queue Shape (T7.2)', fn: runTaskOffline },
    { name: '📝 NewTaskModal Validation (T8.1–T8.2)', fn: runNewTaskModal },
    { name: '📋 BoardSettings Validation (T9.1–T9.2)', fn: runBoardSettings },
    { name: '✅ Checklist Validation (T10.1–T10.2)', fn: runChecklists },
    { name: '📷 Upload Validation (T11.1–T11.3)', fn: runUpload },
    { name: '📊 Operations KPI Math (T12.1–T12.2)', fn: runOperationsKpi },
    { name: '👥 CRM Phone, Pagination & QR (T20.1–T23.1)', fn: runCrm },
    { name: '👤 Profile Validation (T24.1)', fn: runProfile },
    { name: '⚙️ POS Settings Validation (T25.1)', fn: runPosSettings },
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
    console.log('🎉 All 20 unit tests passed successfully!');
    process.exit(0);
  }
}

main();
