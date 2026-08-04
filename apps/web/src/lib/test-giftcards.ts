import { GET as gcGET, POST as gcPOST } from '../app/api/giftcards/route';
import { POST as redeemPOST } from '../app/api/giftcards/redeem/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting Gift Cards Integration Test ---');

  let testCode = '';

  try {
    // 0. Cleanup past tests
    console.log('Cleaning up past gift cards in DB...');
    await prisma.giftCard.deleteMany({ where: { code: { startsWith: 'CORGI-50-' } } });

    // 1. Create a Gift Card of €50.00
    console.log('Creating Gift Card: €50.00 balance...');
    const createReq = new Request('http://localhost/api/giftcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalance: 50.00 })
    });

    const createRes = await gcPOST(createReq);
    const createdCard = await createRes.json();

    console.log('Created Card:', createdCard);
    if (createRes.status !== 201 || !createdCard.code || createdCard.balance !== 50.00 || createdCard.status !== 'active') {
      console.error('❌ ERROR: Failed to create gift card.');
      process.exit(1);
    }
    console.log('✅ Success: Gift card created.');

    testCode = createdCard.code;

    // 2. Fetch details by code
    console.log(`Checking balance for code [${testCode}] via GET...`);
    const getReq = new Request(`http://localhost/api/giftcards?code=${testCode}`);
    const getRes = await gcGET(getReq);
    const fetchedCard = await getRes.json();

    console.log('Fetched Card Details:', fetchedCard);
    if (getRes.status !== 200 || fetchedCard.code !== testCode || fetchedCard.balance !== 50.00) {
      console.error('❌ ERROR: Failed to lookup gift card details.');
      process.exit(1);
    }
    console.log('✅ Success: Gift card lookup working.');

    // 3. Redeem €20.00
    console.log('Redeeming €20.00 from card...');
    const redeemReq1 = new Request('http://localhost/api/giftcards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode, amount: 20.00 })
    });

    const redeemRes1 = await redeemPOST(redeemReq1);
    const result1 = await redeemRes1.json();

    console.log('Redemption 1 Response:', result1);
    if (redeemRes1.status !== 200 || !result1.success || result1.remainingBalance !== 30.00) {
      console.error('❌ ERROR: Redemption 1 failed.');
      process.exit(1);
    }
    console.log('✅ Success: €20.00 redeemed, €30.00 remaining balance.');

    // 4. Redeem €30.00 (draining balance to 0)
    console.log('Redeeming €30.00 from card (draining balance)...');
    const redeemReq2 = new Request('http://localhost/api/giftcards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode, amount: 30.00 })
    });

    const redeemRes2 = await redeemPOST(redeemReq2);
    const result2 = await redeemRes2.json();

    console.log('Redemption 2 Response:', result2);
    if (redeemRes2.status !== 200 || !result2.success || result2.remainingBalance !== 0.00 || result2.card.status !== 'redeemed') {
      console.error('❌ ERROR: Redemption 2 failed.');
      process.exit(1);
    }
    console.log('✅ Success: €30.00 redeemed, card is marked as fully redeemed.');

    // 5. Attempt third redemption on drained card (should fail)
    console.log('Attempting to redeem €1.00 from already redeemed card...');
    const redeemReq3 = new Request('http://localhost/api/giftcards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: testCode, amount: 1.00 })
    });

    const redeemRes3 = await redeemPOST(redeemReq3);
    const result3 = await redeemRes3.json();

    console.log('Redemption 3 Response:', result3);
    if (result3.success) {
      console.error('❌ ERROR: Redeemed card was spent again.');
      process.exit(1);
    }
    console.log('✅ Success: Redemption blocked as expected with error:', result3.error);

    // 6. Cleanup
    console.log('Cleaning up test card from DB...');
    await prisma.giftCard.deleteMany({ where: { code: testCode } });

    console.log('--- Gift Cards Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Gift Cards integration test:', error);
    try {
      if (testCode) {
        await prisma.giftCard.deleteMany({ where: { code: testCode } }).catch(() => {});
      }
    } catch (e) {}
    process.exit(1);
  }
}

main();
