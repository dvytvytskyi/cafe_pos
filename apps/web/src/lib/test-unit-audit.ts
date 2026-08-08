/**
 * Module 29 — audit validation + immutability unit tests
 */
import assert from 'assert';
import { AuditRepository } from '../repositories/audit.repository.ts';
import {
  AUDIT_ACTIONS,
  isValidAuditAction,
  parseAuditFilters,
  validateAuditTrailChain,
  AuditValidationError,
} from './audit-validation.ts';

export async function run() {
  console.log('--- Module 29 Audit Unit Tests ---');

  console.log('✅ T29.1 AuditRepository has no update/delete methods');
  const repo = new AuditRepository();
  assert.strictEqual(typeof (repo as { update?: unknown }).update, 'undefined');
  assert.strictEqual(typeof (repo as { delete?: unknown }).delete, 'undefined');
  assert.strictEqual(typeof repo.logEvent, 'function');
  assert.strictEqual(typeof repo.findLogs, 'function');

  console.log('✅ validate audit trail chain');
  assert.strictEqual(
    validateAuditTrailChain([
      { prevHash: '0000000000000000', hash: 'a' },
      { prevHash: 'a', hash: 'b' },
    ]),
    true
  );
  assert.strictEqual(
    validateAuditTrailChain([
      { prevHash: '0000000000000000', hash: 'a' },
      { prevHash: 'broken', hash: 'b' },
    ]),
    false
  );

  console.log('✅ parse audit filters');
  const params = new URLSearchParams('action=shift_open&limit=50&offset=0');
  const f = parseAuditFilters(params);
  assert.strictEqual(f.action, 'shift_open');
  assert.strictEqual(f.limit, 50);

  console.log('✅ invalid action rejected');
  const badParams = new URLSearchParams('action=hack_the_planet');
  assert.throws(() => parseAuditFilters(badParams), AuditValidationError);

  console.log('✅ all audit actions registered');
  assert.ok(AUDIT_ACTIONS.includes('menu_item_archived'));
  assert.ok(isValidAuditAction('order_completed'));

  console.log('--- Module 29 Unit Tests Passed ---');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
