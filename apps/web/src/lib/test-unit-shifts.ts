import assert from 'assert';

interface ShiftReconciliation {
  floatStart: number;
  salesCash: number;
  cashIn: number;
  cashOut: number;
}

function calculateExpectedCash(reconcile: ShiftReconciliation): number {
  return parseFloat((reconcile.floatStart + reconcile.salesCash + reconcile.cashIn - reconcile.cashOut).toFixed(2));
}

function getDiscrepancy(expected: number, actual: number): number {
  return parseFloat((actual - expected).toFixed(2));
}

export async function run() {
  console.log('Running test-unit-shifts...');

  const shiftData: ShiftReconciliation = {
    floatStart: 100.00,
    salesCash: 45.50,
    cashIn: 10.00,
    cashOut: 15.00
  };

  // Expected cash: 100 + 45.50 + 10 - 15 = 140.50
  const expected = calculateExpectedCash(shiftData);
  assert.strictEqual(expected, 140.50, 'Shift expected balance calculation incorrect');

  // 1. Overage check (more cash actual than expected)
  const overage = getDiscrepancy(expected, 145.50);
  assert.strictEqual(overage, 5.00, 'Shift reconciliation overage discrepancy calculation incorrect');

  // 2. Shortage check (less cash actual than expected)
  const shortage = getDiscrepancy(expected, 130.50);
  assert.strictEqual(shortage, -10.00, 'Shift reconciliation shortage discrepancy calculation incorrect');

  console.log('✅ test-unit-shifts passed.');
}
