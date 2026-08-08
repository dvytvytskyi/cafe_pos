import assert from 'assert';
import {
  validateSku,
  validateStockQuantity,
  InventoryValidationError,
  SKU_REGEX,
} from './inventory-validation.ts';

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

  // T34.1 stockQty > 0 for adjust
  assert.throws(
    () => validateStockQuantity(0),
    (err: unknown) => err instanceof InventoryValidationError,
    'Zero quantity must fail validation'
  );
  assert.throws(
    () => validateStockQuantity(-3),
    (err: unknown) => err instanceof InventoryValidationError,
    'Negative quantity must fail validation'
  );
  assert.strictEqual(validateStockQuantity(5), 5);
  console.log('✅ T34.1 stockQty > 0 for adjust');

  // T34.2 SKU regex
  assert(SKU_REGEX.test('INV-MER-0001'));
  assert(SKU_REGEX.test('INV-BAR-9999'));
  assert.throws(
    () => validateSku('CRG-TEE'),
    (err: unknown) => err instanceof InventoryValidationError,
    'Legacy SKU must fail'
  );
  assert.strictEqual(validateSku('inv-mer-0001'), 'INV-MER-0001');
  console.log('✅ T34.2 SKU regex ^INV-[A-Z]{3}-\\d{4}$');

  const item: InventoryItem = { id: 'inv-item-1', quantity: 5 };

  processStockDeduction(item, 2);
  assert.strictEqual(item.quantity, 3, 'Inventory stock deduction calculated incorrectly');

  assert.throws(
    () => processStockDeduction(item, 4),
    /Insufficient stock/,
    'Deducting more stock than available must throw an error'
  );

  assert.strictEqual(item.quantity, 3, 'Failed stock deductions must not modify quantity levels');

  console.log('✅ test-unit-inventory passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
