import assert from 'assert';

interface GiftCard {
  code: string;
  balance: number;
  expiryDate: string;
  status: 'active' | 'redeemed' | 'expired';
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
  console.log('Running test-unit-giftcards...');

  // 1. Success redemption
  const card1: GiftCard = { code: 'GC-1', balance: 50.00, expiryDate: '2027-08-01', status: 'active' };
  const res1 = tryRedeem(card1, 20.00);
  assert.strictEqual(res1.success, true, 'Valid redemption must return success');
  assert.strictEqual(card1.balance, 30.00, 'Balance must drop to 30');
  assert.strictEqual(card1.status, 'active', 'Card must remain active');

  // 2. Full redemption draining balance
  const res2 = tryRedeem(card1, 30.00);
  assert.strictEqual(res2.success, true, 'Valid redemption draining balance must succeed');
  assert.strictEqual(card1.balance, 0.00, 'Balance must be zero');
  assert.strictEqual(card1.status, 'redeemed', 'Fully drained card status must update to redeemed');

  // 3. Redeeming from inactive card
  const res3 = tryRedeem(card1, 5.00);
  assert.strictEqual(res3.success, false, 'Redeem from redeemed card must be blocked');

  // 4. Expiration check
  const expiredCard: GiftCard = { code: 'GC-2', balance: 100.00, expiryDate: '2026-08-01', status: 'active' };
  const res4 = tryRedeem(expiredCard, 10.00, new Date('2026-08-05'));
  assert.strictEqual(res4.success, false, 'Redemption on expired card must be blocked');
  assert.strictEqual(expiredCard.status, 'expired', 'Card status must update to expired');

  console.log('✅ test-unit-giftcards passed.');
}
