import assert from 'assert';
import {
  validateDishPrice,
  validateAllergenIds,
  validateVariantPrices,
  validateDishName,
  MenuValidationError,
} from './menu-validation.ts';

export async function run() {
  console.log('--- Module 14 DishModal Unit Tests ---');

  // T14.1 — price positive decimal; abc rejected
  assert.strictEqual(validateDishPrice('4.50'), 4.5);
  assert.strictEqual(validateDishPrice(3), 3);
  assert.throws(() => validateDishPrice('abc'), MenuValidationError);
  assert.throws(() => validateDishPrice('-1'), MenuValidationError);
  assert.throws(() => validateDishPrice('0'), MenuValidationError);
  console.log('✅ T14.1 price validation');

  // T14.2 — allergen IDs valid
  assert.deepStrictEqual(validateAllergenIds(['gluten', 'Dairy']), ['Gluten', 'Dairy']);
  assert.throws(() => validateAllergenIds(['Peanuts']), MenuValidationError);
  assert.throws(() => validateAllergenIds('Gluten'), MenuValidationError);
  console.log('✅ T14.2 allergen validation');

  // T14.3 — variant grid non-zero prices
  assert.strictEqual(
    validateVariantPrices([
      { price: '3.00', isActive: true },
      { price: '4.50', isActive: true },
    ]),
    3
  );
  assert.throws(
    () => validateVariantPrices([{ price: '0.00', isActive: true }]),
    MenuValidationError
  );
  assert.throws(
    () => validateVariantPrices([{ price: 'abc', isActive: true }]),
    MenuValidationError
  );
  console.log('✅ T14.3 variant price validation');

  assert.throws(() => validateDishName('   '), MenuValidationError);
  assert.strictEqual(validateDishName('  Latte  '), 'Latte');

  console.log('✅ Module 14 unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
