import assert from 'assert';
import {
  validateModifierQty,
  validateModifierPrice,
  ModifierValidationError,
} from './modifier-validation.ts';

export async function run() {
  console.log('--- Module 15 Modifiers Unit Tests ---');

  assert.deepStrictEqual(validateModifierQty(0, 1), { minQty: 0, maxQty: 1 });
  assert.deepStrictEqual(validateModifierQty('2', '5'), { minQty: 2, maxQty: 5 });
  assert.throws(() => validateModifierQty(3, 1), ModifierValidationError);
  console.log('✅ T15.1 maxQty >= minQty validation');

  assert.strictEqual(validateModifierPrice('0.80'), 0.8);
  assert.strictEqual(validateModifierPrice(0), 0);
  assert.throws(() => validateModifierPrice('-1'), ModifierValidationError);
  assert.throws(() => validateModifierPrice('abc'), ModifierValidationError);
  console.log('✅ T15.2 modifier price >= 0');

  console.log('✅ Module 15 unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
