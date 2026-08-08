/**
 * CRM & Loyalty integration regression (T20.7)
 */
import { prisma } from './db.ts';

const BASE = 'http://localhost:3000';
const TEST_CUSTOMER_NAME = 'Helen Kovalenko';

async function main() {
  console.log('--- Starting CRM & Loyalty Programs Integration Test ---');

  try {
    console.log('Cleaning up past CRM test entries...');
    await prisma.loyaltyTransaction.deleteMany({ where: { customer: { name: TEST_CUSTOMER_NAME } } });
    await prisma.customer.deleteMany({ where: { name: TEST_CUSTOMER_NAME } });

    console.log('Creating customer profile via POST /api/crm/customers...');
    const custRes = await fetch(`${BASE}/api/crm/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: TEST_CUSTOMER_NAME,
        phone: '+380998887766',
        email: 'helen@gmail.com',
        birthday: '1996-10-15',
        notes: 'Enjoys espresso and organic bakeries',
      }),
    });
    const createdCust = await custRes.json();

    console.log('Customer Response:', createdCust);
    if (custRes.status !== 201 || !createdCust.id || createdCust.tier !== 'Bronze' || createdCust.points !== 0) {
      console.error('❌ ERROR: Failed to create customer profile.');
      process.exit(1);
    }
    console.log('✅ Success: Customer profile created.');

    const customerId = createdCust.id;

    console.log('Fetching default loyalty config...');
    const configRes = await fetch(`${BASE}/api/crm/loyalty`);
    const config = await configRes.json();

    console.log('Loyalty Config:', config);
    if (configRes.status !== 200 || config.bronzeRate !== 0.05 || config.silverThreshold !== 75) {
      console.error('❌ ERROR: Loyalty config loaded incorrectly.');
      process.exit(1);
    }
    console.log('✅ Success: Loyalty configuration fetched.');

    console.log('Processing Purchase 1: €100 amountPaid, earning points...');
    const txRes1 = await fetch(`${BASE}/api/crm/loyalty/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        amountPaid: 100.0,
        pointsSpent: 0.0,
        orderId: 'ord-crm-test-1',
      }),
    });
    const updatedCust1 = await txRes1.json();

    console.log('Updated Customer 1:', updatedCust1);
    if (updatedCust1.ltv !== 100 || updatedCust1.points !== 5 || updatedCust1.tier !== 'Silver' || updatedCust1.visitCount !== 1) {
      console.error('❌ ERROR: Purchase 1 processing failed.');
      process.exit(1);
    }
    console.log('✅ Success: Purchase 1 processed, points earned and Silver tier unlocked.');

    console.log('Processing Purchase 2: €120 amountPaid, spending €3 points, earning points...');
    const txRes2 = await fetch(`${BASE}/api/crm/loyalty/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        amountPaid: 120.0,
        pointsSpent: 3.0,
        orderId: 'ord-crm-test-2',
      }),
    });
    const updatedCust2 = await txRes2.json();

    console.log('Updated Customer 2:', updatedCust2);
    if (updatedCust2.ltv !== 220 || updatedCust2.points !== 11.6 || updatedCust2.tier !== 'Gold' || updatedCust2.visitCount !== 2) {
      console.error('❌ ERROR: Purchase 2 processing failed.');
      process.exit(1);
    }
    console.log('✅ Success: Purchase 2 processed, points spent/earned and Gold tier unlocked.');

    const dbTransactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId },
    });

    console.log('Transactions logged in DB:', dbTransactions.length);
    if (dbTransactions.length !== 3) {
      console.error('❌ ERROR: Expected 3 transactions logged (1 spend, 2 earns), found:', dbTransactions.length);
      process.exit(1);
    }
    console.log('✅ Success: Points ledger matches all transactional steps.');

    console.log('Fetching customers list via GET /api/crm/customers...');
    const listRes = await fetch(`${BASE}/api/crm/customers`);
    const list = await listRes.json();

    const found = list.find((c: { id: string }) => c.id === customerId);
    if (listRes.status !== 200 || !found || found.tier !== 'Gold') {
      console.error('❌ ERROR: Customers list fetched incorrectly.');
      process.exit(1);
    }
    console.log('✅ Success: Customers list successfully fetched and verified.');

    console.log('Cleaning up mock database entries...');
    await prisma.loyaltyTransaction.deleteMany({ where: { customerId } });
    await prisma.customer.delete({ where: { id: customerId } });

    console.log('--- CRM & Loyalty Programs Integration Test Passed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during CRM integration test:', error);
    try {
      await prisma.loyaltyTransaction.deleteMany({ where: { customer: { name: TEST_CUSTOMER_NAME } } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { name: TEST_CUSTOMER_NAME } }).catch(() => {});
    } catch {
      // ignore cleanup errors
    }
    process.exit(1);
  }
}

main();
