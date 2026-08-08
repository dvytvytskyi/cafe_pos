/**
 * Module 27 — tax validation + calculation unit tests
 */
import assert from 'assert';
import {
  validateTaxRatePercent,
  validateTaxRatePatch,
  TaxValidationError,
} from './tax-validation.ts';
import {
  calculateReceiptTaxes,
  isAlcoholItemName,
  roundMoney,
  splitGrossByVat,
} from './tax-calc.ts';

function run() {
  console.log('--- Module 27 Taxes Unit Tests ---');
  let failed = 0;

  const check = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`✅ ${name}`);
    } catch (e) {
      failed++;
      console.error(`❌ ${name}`, e);
    }
  };

  check('T27.1 tax percent 0-100%', () => {
    assert.strictEqual(validateTaxRatePercent(0), 0);
    assert.strictEqual(validateTaxRatePercent(100), 100);
    assert.strictEqual(validateTaxRatePercent(21.5), 21.5);
    assert.throws(() => validateTaxRatePercent(-1), TaxValidationError);
    assert.throws(() => validateTaxRatePercent(101), TaxValidationError);
  });

  check('T27.2 validate tax rate patch', () => {
    const p = validateTaxRatePatch({ slug: 'alcohol', ratePercent: 22 });
    assert.strictEqual(p.slug, 'alcohol');
    assert.strictEqual(p.ratePercent, 22);
  });

  check('T27.3 tax calc rounding', () => {
    assert.strictEqual(roundMoney(10.555), 10.56);
    const { net, tax } = splitGrossByVat(11, 10);
    assert.strictEqual(net, 10);
    assert.strictEqual(tax, 1);
  });

  check('T27.4 alcohol item detection', () => {
    assert.strictEqual(isAlcoholItemName('Craft Beer'), true);
    assert.strictEqual(isAlcoholItemName('Caesar Salad'), false);
  });

  check('T27.5 calculate receipt taxes food vs alcohol', () => {
    const at21 = calculateReceiptTaxes(
      [
        { name: 'Latte', price: 10, quantity: 1 },
        { name: 'Red Wine', price: 12, quantity: 1 },
      ],
      { food: 10, alcohol: 21 }
    );
    assert.strictEqual(at21.totalGross, 22);

    const at22 = calculateReceiptTaxes(
      [{ name: 'Craft Beer', price: 12.2, quantity: 1 }],
      { food: 10, alcohol: 22 }
    );
    assert.ok(at22.alcoholTax > 0);
    assert.strictEqual(at22.totalGross, 12.2);
    assert.ok(at22.alcoholTax > at21.alcoholTax || at22.alcoholTax >= 2.19);
  });

  if (failed) process.exit(1);
  console.log('--- Module 27 Unit Tests Passed ---');
}

run();
