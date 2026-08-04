import { GET as auditGET, POST as auditPOST } from '../app/api/audit/route';
import { prisma } from './db';

async function main() {
  console.log('--- Starting POS Audit Trail Ledger Integration Test ---');

  try {
    // 0. Clean up past test logs
    console.log('Cleaning up past audit logs from DB...');
    await prisma.auditLog.deleteMany({});

    // 1. Log event 1 (shift_open)
    console.log('Logging Event 1: shift_open...');
    const req1 = new Request('http://localhost/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shift_open', details: { manager: 'John Doe', float: 100 } })
    });

    const res1 = await auditPOST(req1);
    const log1 = await res1.json();

    console.log('Log 1 Response:', log1);
    if (res1.status !== 201 || log1.prevHash !== '0000000000000000' || !log1.hash) {
      console.error('❌ ERROR: First log entry (genesis) has invalid hashes.');
      process.exit(1);
    }
    console.log('✅ Success: Genesis log entry created successfully.');

    // 2. Log event 2 (cash_adjustment)
    console.log('Logging Event 2: cash_adjustment...');
    const req2 = new Request('http://localhost/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cash_adjustment', details: { type: 'out', amount: 20 } })
    });

    const res2 = await auditPOST(req2);
    const log2 = await res2.json();

    console.log('Log 2 Response:', log2);
    if (res2.status !== 201 || log2.prevHash !== log1.hash || !log2.hash) {
      console.error('❌ ERROR: Cryptochaining links between Log 1 and Log 2 are broken.');
      process.exit(1);
    }
    console.log('✅ Success: Log 2 linked to Log 1 hash.');

    // 3. Log event 3 (shift_close)
    console.log('Logging Event 3: shift_close...');
    const req3 = new Request('http://localhost/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shift_close', details: { actualCash: 115 } })
    });

    const res3 = await auditPOST(req3);
    const log3 = await res3.json();

    console.log('Log 3 Response:', log3);
    if (res3.status !== 201 || log3.prevHash !== log2.hash || !log3.hash) {
      console.error('❌ ERROR: Cryptochaining links between Log 2 and Log 3 are broken.');
      process.exit(1);
    }
    console.log('✅ Success: Log 3 linked to Log 2 hash.');

    // 4. Fetch all logs via GET /api/audit
    console.log('Fetching audit logs via GET /api/audit...');
    const getRes = await auditGET();
    const logsList = await getRes.json();

    console.log('Logs retrieved from DB:', logsList.length);
    if (getRes.status !== 200 || logsList.length !== 3) {
      console.error(`❌ ERROR: GET audit list returned invalid number of logs: ${logsList.length}`);
      process.exit(1);
    }

    // Double-check complete chain validation
    console.log('Validating full cryptochain integrity...');
    for (let i = 1; i < logsList.length; i++) {
      const prev = logsList[i - 1];
      const curr = logsList[i];
      if (curr.prevHash !== prev.hash) {
        console.error(`❌ ERROR: Broken cryptographic link at index ${i}`);
        process.exit(1);
      }
    }
    console.log('✅ Success: Cryptographic audit log chain verified. Ledger integrity is secure!');

    // 5. Cleanup
    console.log('Cleaning up test audit logs...');
    await prisma.auditLog.deleteMany({});

    console.log('--- POS Audit Trail Ledger Integration Test Passed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Audit Trail integration test:', error);
    try {
      await prisma.auditLog.deleteMany({}).catch(() => {});
    } catch (e) {}
    process.exit(1);
  }
}

main();
