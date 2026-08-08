/**
 * Module 32 — order history validation unit tests
 */
import assert from 'assert';
import {
  resolveDefaultDateRange,
  parseOrderHistoryFilters,
  OrderHistoryValidationError,
} from './order-history-validation.ts';

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function main() {
  console.log('--- Module 32 Order History Unit Tests ---');

  console.log('✅ T32.1 default date range = today when missing');
  const { startDate, endDate } = resolveDefaultDateRange(null, null);
  const today = new Date();
  assert.ok(sameDay(startDate, today));
  assert.ok(sameDay(endDate, today));
  assert.ok(startDate.getHours() === 0);
  assert.ok(endDate.getHours() === 23);

  console.log('✅ T32.2 invalid date format rejected');
  assert.throws(
    () => parseOrderHistoryFilters(new URLSearchParams('startDate=not-a-date')),
    OrderHistoryValidationError
  );

  console.log('✅ parse filters with pagination');
  const f = parseOrderHistoryFilters(new URLSearchParams('page=2&limit=10&source=glovo'));
  assert.strictEqual(f.page, 2);
  assert.strictEqual(f.limit, 10);
  assert.strictEqual(f.source, 'glovo');

  console.log('✅ invalid source rejected');
  assert.throws(
    () => parseOrderHistoryFilters(new URLSearchParams('source=delivery')),
    OrderHistoryValidationError
  );

  console.log('--- Module 32 Unit Tests Passed ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
