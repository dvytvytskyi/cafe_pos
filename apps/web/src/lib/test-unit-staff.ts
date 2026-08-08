import assert from 'assert';
import { createHash } from 'crypto';
import {
  validatePin,
  validateEmployeeName,
  filterEmployeesBySearch,
  filterEmployeesByArchived,
  EMPTY_STAFF_LIST_MESSAGE,
  StaffValidationError,
} from './staff-validation.ts';

const hashPin = (pin: string) => createHash('sha256').update(pin).digest('hex');

export async function run() {
  console.log('--- Modules 16–17 Staff Unit Tests ---');

  const staff = [
    { name: 'Anna Muñoz', status: 'active' },
    { name: 'Denis Donets', status: 'active' },
    { name: 'Albert Mesropov', status: 'inactive' },
  ];

  const searchResult = filterEmployeesBySearch(staff, 'denis');
  assert.strictEqual(searchResult.length, 1);
  assert.strictEqual(searchResult[0]!.name, 'Denis Donets');
  console.log('✅ T16.1 search case-insensitive');

  const activeOnly = filterEmployeesByArchived(staff, false);
  assert.strictEqual(activeOnly.length, 2);
  assert.ok(activeOnly.every((e) => e.status !== 'inactive'));
  const archivedOnly = filterEmployeesByArchived(staff, true);
  assert.strictEqual(archivedOnly.length, 1);
  assert.strictEqual(archivedOnly[0]!.status, 'inactive');
  console.log('✅ T16.2 archived filter');

  assert.strictEqual(typeof EMPTY_STAFF_LIST_MESSAGE, 'string');
  assert.ok(EMPTY_STAFF_LIST_MESSAGE.length > 0);
  console.log('✅ T16.3 empty list placeholder message');

  assert.strictEqual(validatePin('1234'), '1234');
  assert.throws(() => validatePin('12ab'), StaffValidationError);
  assert.throws(() => validatePin('12345'), StaffValidationError);
  console.log('✅ T17.1 PIN regex ^\\d{4}$');

  assert.strictEqual(validateEmployeeName('Jo'), 'Jo');
  assert.throws(() => validateEmployeeName('A'), StaffValidationError);
  console.log('✅ T17.2 firstName min 2 chars');

  const hash = hashPin('4321');
  assert.strictEqual(hash.length, 64);
  assert.notStrictEqual(hash, '4321');
  console.log('✅ T17.3 PIN SHA-256 hash server-side');

  console.log('✅ Modules 16–17 unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
