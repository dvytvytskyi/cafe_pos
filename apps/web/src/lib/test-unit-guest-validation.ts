import assert from 'node:assert/strict';
import {
  parseGuestLocale,
  normalizeTableId,
  validateGuestOrderLines,
  validateTipInput,
  validatePointsToSpend,
  validateModifierSelections,
  GuestValidationError,
} from './guest-validation.ts';

export async function run() {
  console.log('Running test-unit-guest-validation...');

  assert.equal(parseGuestLocale('es'), 'es');
  assert.equal(parseGuestLocale('invalid'), 'en');
  assert.equal(normalizeTableId('12'), 't12');
  assert.equal(normalizeTableId('uuid-abc'), 'uuid-abc');

  const lines = validateGuestOrderLines([
    {
      itemType: 'food',
      name: 'Latte',
      quantity: 2,
      unitPrice: 4,
      modifiers: [{ groupId: 'g1', groupName: 'Milk', optionId: 'o1', optionName: 'Oat', price: 0.5 }],
    },
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].modifiers?.[0].optionName, 'Oat');

  assert.throws(() => validateGuestOrderLines([]), GuestValidationError);
  assert.throws(() => validatePointsToSpend(-1), GuestValidationError);
  assert.throws(() => validatePointsToSpend(50, 10), GuestValidationError);
  assert.equal(validatePointsToSpend(5, 10), 5);

  const tip = validateTipInput('percent', 10);
  assert.equal(tip.tipType, 'percent');
  assert.equal(tip.tipValue, 10);
  assert.deepEqual(validateTipInput(undefined, undefined), {});

  assert.throws(
    () => validateModifierSelections([{ optionName: '', price: 0 }]),
    GuestValidationError
  );

  console.log('✅ test-unit-guest-validation passed.');
}
