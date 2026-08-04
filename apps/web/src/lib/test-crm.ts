import { GET as custGET, POST as custPOST } from '../app/api/crm/customers/route';
import { POST as loyaltyPOST, GET as loyaltyGET } from '../app/api/crm/loyalty/route';
import { POST as txPOST } from '../app/api/crm/loyalty/transaction/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting CRM & Loyalty Programs Integration Test ---');

  const testCustomerName = 'Helen Kovalenko';

  try {
    // 0. Cleanup past test entries
    console.log('Cleaning up past CRM test entries...');
    await prisma.loyaltyTransaction.deleteMany({ where: { customer: { name: testCustomerName } } });
    await prisma.customer.deleteMany({ where: { name: testCustomerName } });

    // 1. Create Customer Profile
    console.log('Creating customer profile via POST /api/crm/customers...');
    const custReq = new Request('http://localhost/api/crm/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testCustomerName,
        phone: '+380998887766',
        email: 'helen@gmail.com',
        birthday: '1996-10-15',
        notes: 'Enjoys espresso and organic bakeries'
      })
    });

    const custRes = await custPOST(custReq);
    const createdCust = await custRes.json();

    console.log('Customer Response:', createdCust);
    if (custRes.status !== 201 || !createdCust.id || createdCust.tier !== 'Bronze' || createdCust.points !== 0) {
      console.error('❌ ERROR: Failed to create customer profile.');
      process.exit(1);
    }
    console.log('✅ Success: Customer profile created.');

    const customerId = createdCust.id;

    // 2. Fetch default loyalty config
    console.log('Fetching default loyalty config...');
    const configRes = await loyaltyGET();
    const config = await configRes.json();

    console.log('Loyalty Config:', config);
    if (configRes.status !== 200 || config.bronzeRate !== 0.05 || config.silverThreshold !== 75) {
      console.error('❌ ERROR: Loyalty config loaded incorrectly.');
      process.exit(1);
    }
    console.log('✅ Success: Loyalty configuration fetched.');

    // 3. Purchase 1: Earning points on €100 order total
    // Bronze cashback: €100 * 5% = €5.00 points.
    // LTV becomes €100, shifting tier to 'Silver' (since 100 >= 75)
    console.log('Processing Purchase 1: €100 amountPaid, earning points...');
    const txReq1 = new Request('http://localhost/api/crm/loyalty/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        amountPaid: 100.00,
        pointsSpent: 0.00,
        orderId: 'ord-crm-test-1'
      })
    });

    const txRes1 = await txPOST(txReq1);
    const updatedCust1 = await txRes1.json();

    console.log('Updated Customer 1:', updatedCust1);
    if (updatedCust1.ltv !== 100 || updatedCust1.points !== 5 || updatedCust1.tier !== 'Silver' || updatedCust1.visitCount !== 1) {
      console.error('❌ ERROR: Purchase 1 processing failed.');
      process.exit(1);
    }
    console.log('✅ Success: Purchase 1 processed, points earned and Silver tier unlocked.');

    // 4. Purchase 2: Spending €3.00 points and earning on €120.00 order
    // Current tier: 'Silver' -> 8% cashback on €120.00 = €9.60 points.
    // Points balance: €5.00 - €3.00 + €9.60 = €11.60 points.
    // LTV becomes €220, shifting tier to 'Gold' (since 220 >= 150)
    console.log('Processing Purchase 2: €120 amountPaid, spending €3 points, earning points...');
    const txReq2 = new Request('http://localhost/api/crm/loyalty/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        amountPaid: 120.00,
        pointsSpent: 3.00,
        orderId: 'ord-crm-test-2'
      })
    });

    const txRes2 = await txPOST(txReq2);
    const updatedCust2 = await txRes2.json();

    console.log('Updated Customer 2:', updatedCust2);
    if (updatedCust2.ltv !== 220 || updatedCust2.points !== 11.6 || updatedCust2.tier !== 'Gold' || updatedCust2.visitCount !== 2) {
      console.error('❌ ERROR: Purchase 2 processing failed.');
      process.exit(1);
    }
    console.log('✅ Success: Purchase 2 processed, points spent/earned and Gold tier unlocked.');

    // 5. Verify DB transactions
    const dbTransactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId }
    });

    console.log('Transactions logged in DB:', dbTransactions.length);
    if (dbTransactions.length !== 3) {
      console.error('❌ ERROR: Expected 3 transactions logged (1 spend, 2 earns), found:', dbTransactions.length);
      process.exit(1);
    }
    console.log('✅ Success: Points ledger matches all transactional steps.');

    // 6. Fetch Customers List via GET /api/crm/customers
    console.log('Fetching customers list via GET /api/crm/customers...');
    const listRes = await custGET();
    const list = await listRes.json();

    const found = list.find((c: any) => c.id === customerId);
    if (listRes.status !== 200 || !found || found.tier !== 'Gold') {
      console.error('❌ ERROR: Customers list fetched incorrectly.');
      process.exit(1);
    }
    console.log('✅ Success: Customers list successfully fetched and verified.');

    // 7. Cleanup
    console.log('Cleaning up mock database entries...');
    await prisma.loyaltyTransaction.deleteMany({ where: { customerId } });
    await prisma.customer.delete({ where: { id: customerId } });

    console.log('--- CRM & Loyalty Programs Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during CRM integration test:', error);
    try {
      await prisma.loyaltyTransaction.deleteMany({ where: { customer: { name: testCustomerName } } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { name: testCustomerName } }).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
