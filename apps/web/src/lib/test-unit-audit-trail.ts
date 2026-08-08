/**
 * Module 29 — audit trail chain unit tests (legacy regression T29.6)
 */
import assert from 'assert';
import { validateAuditTrailChain } from './audit-validation.ts';

export async function run() {
  console.log('Running test-unit-audit-trail...');

  const validChain = [
    { action: 'shift_open', prevHash: '0000000000000000', hash: 'hash-1' },
    { action: 'order_completed', prevHash: 'hash-1', hash: 'hash-2' },
    { action: 'shift_close', prevHash: 'hash-2', hash: 'hash-3' },
  ];

  const invalidChain = [
    { action: 'shift_open', prevHash: '0000000000000000', hash: 'hash-1' },
    { action: 'order_completed', prevHash: 'hash-tampered', hash: 'hash-2' },
    { action: 'shift_close', prevHash: 'hash-2', hash: 'hash-3' },
  ];

  assert.strictEqual(validateAuditTrailChain(validChain), true, 'Valid audit chain should pass validation');
  assert.strictEqual(validateAuditTrailChain(invalidChain), false, 'Broken audit chain must fail validation');

  console.log('✅ test-unit-audit-trail passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
