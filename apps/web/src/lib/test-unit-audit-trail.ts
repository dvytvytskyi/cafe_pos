import assert from 'assert';

interface AuditLog {
  action: string;
  prevHash: string;
  hash: string;
}

function validateAuditTrailChain(logs: AuditLog[]): boolean {
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1];
    const curr = logs[i];
    if (curr.prevHash !== prev.hash) {
      return false;
    }
  }
  return true;
}

export async function run() {
  console.log('Running test-unit-audit-trail...');

  const validChain: AuditLog[] = [
    { action: 'shift_open', prevHash: '0000000000000000', hash: 'hash-1' },
    { action: 'order_completed', prevHash: 'hash-1', hash: 'hash-2' },
    { action: 'shift_close', prevHash: 'hash-2', hash: 'hash-3' }
  ];

  const invalidChain: AuditLog[] = [
    { action: 'shift_open', prevHash: '0000000000000000', hash: 'hash-1' },
    { action: 'order_completed', prevHash: 'hash-tampered', hash: 'hash-2' }, // broken prevHash link
    { action: 'shift_close', prevHash: 'hash-2', hash: 'hash-3' }
  ];

  // 1. Valid chain check
  assert.strictEqual(validateAuditTrailChain(validChain), true, 'Valid audit chain should pass validation');

  // 2. Invalid chain check
  assert.strictEqual(validateAuditTrailChain(invalidChain), false, 'Broken audit chain must fail validation');

  console.log('✅ test-unit-audit-trail passed.');
}
