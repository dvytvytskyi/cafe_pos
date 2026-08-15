import assert from 'assert';
import {
  formatPriceInputLive,
  formatPriceInputBlur,
  formatPriceDisplay,
  parsePriceInput,
  insertPriceDecimalSeparator,
  isPriceDecimalKey,
} from './format-price.ts';

export async function run() {
  console.log('--- format-price unit tests ---');

  assert.strictEqual(formatPriceInputLive(''), '');
  assert.strictEqual(formatPriceInputLive('21'), '21');
  assert.strictEqual(formatPriceInputLive('2,1'), '2,1');
  assert.strictEqual(formatPriceInputLive('2,10'), '2,10');
  assert.strictEqual(formatPriceInputLive('2.10'), '2,10');
  assert.strictEqual(formatPriceInputLive('12341.'), '12341,');
  assert.strictEqual(formatPriceInputLive('12341,'), '12341,');
  assert.strictEqual(formatPriceInputBlur('21'), '21,00');
  assert.strictEqual(formatPriceInputBlur('2,1'), '2,10');
  assert.strictEqual(formatPriceInputBlur('2,10'), '2,10');
  assert.strictEqual(formatPriceInputBlur(''), '');
  assert.strictEqual(isPriceDecimalKey(',', 'Comma'), true);
  assert.strictEqual(isPriceDecimalKey('.', 'Period'), true);
  assert.strictEqual(isPriceDecimalKey('б', 'Comma'), true);
  assert.deepStrictEqual(insertPriceDecimalSeparator('12341', 5, 5), { value: '12341,', cursor: 6 });
  assert.deepStrictEqual(insertPriceDecimalSeparator('2,1', 1, 1), { value: '2,1', cursor: 2 });
  assert.strictEqual(parsePriceInput('2,10'), 2.1);
  assert.strictEqual(parsePriceInput('1.232,50'), 1232.5);
  assert.strictEqual(formatPriceDisplay(123), '123,00');

  console.log('✅ format-price tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
