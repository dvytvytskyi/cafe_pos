import { GET as presetsGET } from '../app/api/discounts/route';
import { GET as promosGET } from '../app/api/promotions/route';
import { POST as calcPOST } from '../app/api/promotions/calculate/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting Discounts & Promotions Integration Test ---');

  try {
    // 0. Cleanup past entries
    console.log('Cleaning up presets and promotions in DB...');
    await prisma.discountPreset.deleteMany({});
    await prisma.promotion.deleteMany({});

    // 1. Call GET discounts route to trigger default seeds
    console.log('Fetching discount presets (triggering seeds)...');
    const presetsRes = await presetsGET();
    const presets = await presetsRes.json();

    console.log('Presets loaded count:', presets.length);
    if (presetsRes.status !== 200 || presets.length === 0) {
      console.error('❌ ERROR: Failed to seed discount presets.');
      process.exit(1);
    }
    console.log('✅ Success: Discount presets seeded.');

    // 2. Call GET promotions route to trigger default seeds
    console.log('Fetching promotions rules (triggering seeds)...');
    const promosRes = await promosGET();
    const promos = await promosRes.json();

    console.log('Promotions loaded count:', promos.length);
    if (promosRes.status !== 200 || promos.length === 0) {
      console.error('❌ ERROR: Failed to seed promotions presets.');
      process.exit(1);
    }
    console.log('✅ Success: Promotions presets seeded.');

    // 3. Test calculation for Happy Hour Friday at 19:00 (7 PM)
    // Friday in August 2026: Aug 7, 2026 is a Friday (Day 5).
    // Test items:
    // - Espresso: €2.00 x 2 (target) -> subtotal €4.00 -> 20% discount = €0.80
    // - Orange Juice: €4.00 x 1 (target) -> subtotal €4.00 -> 20% discount = €0.80
    // - Croissant: €3.00 x 1 (NOT target) -> subtotal €3.00 -> 0% discount
    // Expected deduction: €1.60
    console.log('Evaluating Friday Happy Hour (7 PM) discount calculation...');
    const testDate = new Date('2026-08-07T19:00:00'); // Local Friday 7:00 PM
    const calcReq = new Request('http://localhost/api/promotions/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { name: 'Espresso', price: 2.00, quantity: 2 },
          { name: 'Orange Juice', price: 4.00, quantity: 1 },
          { name: 'Croissant', price: 3.00, quantity: 1 }
        ],
        date: testDate.toISOString()
      })
    });

    const calcRes = await calcPOST(calcReq);
    const result = await calcRes.json();

    console.log('Calculation Result:', result);
    if (calcRes.status !== 200 || !result || result.name !== 'Happy Hour Friday' || result.amountDeduction !== 1.60) {
      console.error('❌ ERROR: Evaluation of Friday Happy Hour promotion failed.', result);
      process.exit(1);
    }
    console.log('✅ Success: Happy Hour discount correctly evaluated (applied to drinks, skipped pastries).');

    // 4. Cleanup
    console.log('Cleaning up DB tables...');
    await prisma.discountPreset.deleteMany({});
    await prisma.promotion.deleteMany({});

    console.log('--- Discounts & Promotions Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Discounts/Promotions integration test:', error);
    try {
      await prisma.discountPreset.deleteMany({}).catch(() => {});
      await prisma.promotion.deleteMany({}).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
