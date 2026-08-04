import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  console.log('--- Starting Database Immutability Trigger Test ---');

  try {
    // 1. Create Location
    console.log('Creating mock location...');
    const location = await prisma.location.create({
      data: {
        name: 'Test Cafe Eixample',
        address: 'Calle Valencia 123, Barcelona',
      },
    });

    const randomSuffix = Math.floor(Math.random() * 1000000);

    // 2. Create Order
    console.log('Creating mock order...');
    const order = await prisma.order.create({
      data: {
        orderNumber: 'TEST-ORD-' + randomSuffix,
        source: 'dine_in',
        locationId: location.id,
        status: 'completed',
        total: 15.40,
        paid: true,
        amountPaid: 15.40,
      },
    });

    // 3. Create Fiscal Record
    console.log('Creating mock fiscal record...');
    const fiscalRecord = await prisma.fiscalRecord.create({
      data: {
        orderId: order.id,
        invoiceNumber: 'TEST-INV-' + randomSuffix,
        invoiceType: 'simplificada',
        taxBase: 14.00,
        taxRate: 0.10,
        taxAmount: 1.40,
        total: 15.40,
        prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2',
        qrCodeUrl: 'https://test.aeat.es/qr',
      },
    });

    console.log(`Successfully created FiscalRecord ID: ${fiscalRecord.id}`);

    // 4. Attempt UPDATE (should fail)
    console.log('Attempting to UPDATE FiscalRecord (should be blocked by trigger)...');
    try {
      await prisma.fiscalRecord.update({
        where: { id: fiscalRecord.id },
        data: { total: 20.00 },
      });
      console.error('❌ ERROR: UPDATE succeeded! The trigger did not block the update.');
      process.exit(1);
    } catch (err: any) {
      console.log('✅ Success: UPDATE was blocked by database triggers!');
      console.log(`   Error message: ${err.message}`);
    }

    // 5. Attempt DELETE (should fail)
    console.log('Attempting to DELETE FiscalRecord (should be blocked by trigger)...');
    try {
      await prisma.fiscalRecord.delete({
        where: { id: fiscalRecord.id },
      });
      console.error('❌ ERROR: DELETE succeeded! The trigger did not block the delete.');
      process.exit(1);
    } catch (err: any) {
      console.log('✅ Success: DELETE was blocked by database triggers!');
      console.log(`   Error message: ${err.message}`);
    }

    // 6. Verification of Cascade Delete Block (should fail)
    console.log('Attempting to DELETE parent Order (should be blocked due to FiscalRecord immutability)...');
    try {
      await prisma.order.delete({ where: { id: order.id } });
      console.error('❌ ERROR: Parent Order DELETE succeeded! The trigger did not protect cascading delete.');
      process.exit(1);
    } catch (err: any) {
      console.log('✅ Success: Parent Order DELETE was blocked due to protected FiscalRecord!');
      console.log(`   Error message: ${err.message.split('\n')[0]}`);
    }

    console.log('--- Trigger Test Completed Successfully (All Immutability Checks Passed) ---');

  } catch (error) {
    console.error('Unexpected error during test execution:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
