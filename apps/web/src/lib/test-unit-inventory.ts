import assert from 'assert';

interface InventoryItem {
  id: string;
  quantity: number;
}

function processStockDeduction(item: InventoryItem, quantityToDeduct: number) {
  if (quantityToDeduct <= 0) throw new Error('Quantity must be greater than zero');
  if (item.quantity < quantityToDeduct) {
    throw new Error(`Insufficient stock. Available: ${item.quantity}, requested: ${quantityToDeduct}`);
  }
  item.quantity -= quantityToDeduct;
}

export async function run() {
  console.log('Running test-unit-inventory...');

  const item: InventoryItem = { id: 'inv-item-1', quantity: 5 };

  // 1. Success deduction
  processStockDeduction(item, 2);
  assert.strictEqual(item.quantity, 3, 'Inventory stock deduction calculated incorrectly');

  // 2. Insufficient stock checkout check
  assert.throws(
    () => processStockDeduction(item, 4),
    /Insufficient stock/,
    'Deducting more stock than available must throw an error'
  );

  // Stock must remain unchanged after failed deduction
  assert.strictEqual(item.quantity, 3, 'Failed stock deductions must not modify quantity levels');

  console.log('✅ test-unit-inventory passed.');
}
