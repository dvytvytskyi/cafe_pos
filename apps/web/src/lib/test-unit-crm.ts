import assert from 'assert';
import {
  normalizePhone,
  phonesMatch,
  sortCustomers,
  validatePaginationParams,
  filterCustomersBySearch,
  validatePhoneE164,
  validateEmail,
  validatePointsAdjustment,
  buildCustomerQrCode,
  parseCustomerQrCode,
  capPointsDelta,
  CrmValidationError,
  InsufficientPointsError,
  EMPTY_CRM_LIST_MESSAGE,
  MAX_POINTS_ADJUSTMENT,
} from './crm-validation.ts';

export async function run() {
  console.log('--- Modules 20–23 CRM Unit Tests ---');

  assert.strictEqual(normalizePhone('099 888 7766'), '+380998887766');
  assert.strictEqual(normalizePhone('+380998887766'), '+380998887766');
  assert.strictEqual(normalizePhone('380998887766'), '+380998887766');
  assert.ok(phonesMatch('0998887766', '+380998887766'));
  assert.ok(!phonesMatch('+34612345678', '+380998887766'));
  console.log('✅ T20.1 phone normalize + suffix match');

  const customers = [
    { name: 'Anna', points: 10, lastVisitDate: '2026-07-01' },
    { name: 'Bob', points: 50, lastVisitDate: '2026-07-10' },
    { name: 'Carol', points: 25, lastVisitDate: '2026-06-15' },
  ];

  const byPoints = sortCustomers(customers, 'bonusPoints', 'desc');
  assert.deepStrictEqual(byPoints.map((c) => c.name), ['Bob', 'Carol', 'Anna']);

  const byVisit = sortCustomers(customers, 'lastVisit', 'asc');
  assert.deepStrictEqual(byVisit.map((c) => c.name), ['Carol', 'Anna', 'Bob']);
  console.log('✅ T20.2 sort by bonusPoints / lastVisit');

  assert.throws(() => validatePaginationParams(0, 20), CrmValidationError);
  assert.throws(() => validatePaginationParams(1, 101), CrmValidationError);
  assert.deepStrictEqual(validatePaginationParams(2, 50), { page: 2, limit: 50 });
  console.log('✅ T20.3 pagination validation');

  const searchable = [
    { name: 'Oleksandr Kovalenko', phone: '+380998887766', email: 'a@test.com' },
    { name: 'Maria Garcia', phone: '+34622987654', email: 'b@test.com' },
  ];
  assert.strictEqual(filterCustomersBySearch(searchable, '0998887766').length, 1);
  assert.strictEqual(filterCustomersBySearch(searchable, 'maria').length, 1);
  assert.strictEqual(typeof EMPTY_CRM_LIST_MESSAGE, 'string');
  console.log('✅ T20.6 search filter helper');

  assert.strictEqual(validatePhoneE164('+34612345678'), '+34612345678');
  assert.throws(() => validatePhoneE164('1234'), CrmValidationError);
  assert.throws(() => validatePhoneE164('+0123456789'), CrmValidationError);
  console.log('✅ T21.1 phone E.164 regex');

  assert.strictEqual(validateEmail('john.doe@example.com'), 'john.doe@example.com');
  assert.throws(() => validateEmail('not-an-email'), CrmValidationError);
  assert.throws(() => validateEmail('missing@tld'), CrmValidationError);
  console.log('✅ T21.2 email RFC regex');

  assert.throws(() => validatePointsAdjustment(-30, 20), InsufficientPointsError);
  assert.strictEqual(validatePointsAdjustment(-15, 20), -15);
  assert.strictEqual(validatePointsAdjustment(15000, 0), MAX_POINTS_ADJUSTMENT);
  assert.strictEqual(capPointsDelta(-15000), -MAX_POINTS_ADJUSTMENT);
  console.log('✅ T22.1 insufficient points blocked');
  console.log('✅ T22.2 max 10000 points per adjustment capped');

  const customerId = '424dd947-f0a5-42ed-8b87-19a89ee5ac87';
  const token = buildCustomerQrCode(customerId);
  assert.strictEqual(token, `crm_client:${customerId}`);
  assert.strictEqual(parseCustomerQrCode(token), customerId);
  assert.throws(() => parseCustomerQrCode('crm_client:not-a-uuid'), CrmValidationError);
  assert.throws(() => parseCustomerQrCode('bad:token'), CrmValidationError);
  console.log('✅ T23.1 QR token format crm_client:id');

  console.log('✅ Modules 20–23 CRM unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
