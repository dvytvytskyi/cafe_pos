/**
 * Module 28 — gift card validation unit tests
 */
import assert from 'assert';
import {
  formatGiftCardCode,
  GiftCardValidationError,
  isValidGiftCardCode,
  validateBatchCount,
  validateExpiryDate,
  validateInitialBalance,
} from './gift-card-validation.ts';

interface GiftCard {
  code: string;
  balance: number;
  expiryDate: string;
  status: 'active' | 'redeemed' | 'expired' | 'disabled';
}

function tryRedeem(card: GiftCard, amount: number, simulatedNow: Date = new Date()): { success: boolean; error?: string } {
  if (card.status !== 'active') {
    return { success: false, error: `Card status is ${card.status}` };
  }
  if (new Date(card.expiryDate).getTime() < simulatedNow.getTime()) {
    card.status = 'expired';
    return { success: false, error: 'Gift Card has expired' };
  }
  if (card.balance < amount) {
    return { success: false, error: 'Insufficient balance' };
  }

  card.balance = parseFloat((card.balance - amount).toFixed(2));
  if (card.balance === 0) {
    card.status = 'redeemed';
  }
  return { success: true };
}

export async function run() {
  console.log('--- Module 28 Gift Cards Unit Tests ---');
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

  check('T28.1 code alphanumeric no O/0/I/1', () => {
    for (let i = 0; i < 20; i++) {
      const code = formatGiftCardCode();
      assert.match(code, /^CORGI-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      assert.strictEqual(isValidGiftCardCode(code), true);
      assert.strictEqual(isValidGiftCardCode('CORGI-50-1234'), false);
      assert.strictEqual(isValidGiftCardCode('CORGI-OABC-2345'), false);
    }
  });

  check('T28.2 expiresAt in future validation', () => {
    const future = new Date(Date.now() + 86400000);
    validateExpiryDate(future);
    assert.throws(
      () => validateExpiryDate(new Date(Date.now() - 1000)),
      GiftCardValidationError
    );
  });

  check('validate initial balance', () => {
    assert.strictEqual(validateInitialBalance(50), 50);
    assert.throws(() => validateInitialBalance(0), GiftCardValidationError);
  });

  check('validate batch count', () => {
    assert.strictEqual(validateBatchCount(5), 5);
    assert.throws(() => validateBatchCount(0), GiftCardValidationError);
  });

  check('redemption success + drain + block inactive', () => {
    const card1: GiftCard = { code: 'CORGI-ABCD-EFGH', balance: 50, expiryDate: '2027-08-01', status: 'active' };
    assert.strictEqual(tryRedeem(card1, 20).success, true);
    assert.strictEqual(card1.balance, 30);
    assert.strictEqual(tryRedeem(card1, 30).success, true);
    assert.strictEqual(card1.status, 'redeemed');
    assert.strictEqual(tryRedeem(card1, 5).success, false);
  });

  check('expiration blocks redeem', () => {
    const expiredCard: GiftCard = { code: 'CORGI-WXYZ-2345', balance: 100, expiryDate: '2026-08-01', status: 'active' };
    assert.strictEqual(tryRedeem(expiredCard, 10, new Date('2026-08-05')).success, false);
    assert.strictEqual(expiredCard.status, 'expired');
  });

  if (failed) process.exit(1);
  console.log('--- Module 28 Unit Tests Passed ---');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
