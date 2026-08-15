import assert from 'assert';
import {
  ALLOWED_ALLERGENS,
  EU_ALLERGENS,
  normalizeAllergenId,
  validateAllergenIds,
} from './allergens.ts';

export async function run() {
  console.log('--- EU Allergens Unit Tests ---');

  assert.strictEqual(EU_ALLERGENS.length, 14);
  assert.strictEqual(ALLOWED_ALLERGENS.length, 14);
  console.log('✅ 14 EU Annex II allergens defined');

  assert.strictEqual(normalizeAllergenId('dairy'), 'Milk');
  assert.strictEqual(normalizeAllergenId('SOY'), 'Soybeans');
  assert.strictEqual(normalizeAllergenId('shellfish'), 'Crustaceans');
  assert.strictEqual(normalizeAllergenId('sesame seeds'), 'Sesame');
  console.log('✅ legacy aliases normalize to canonical IDs');

  assert.deepStrictEqual(validateAllergenIds(['gluten', 'Milk', 'peanuts']), [
    'Gluten',
    'Milk',
    'Peanuts',
  ]);
  console.log('✅ validateAllergenIds accepts EU list');

  console.log('--- EU Allergens Unit Tests Passed ---');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
