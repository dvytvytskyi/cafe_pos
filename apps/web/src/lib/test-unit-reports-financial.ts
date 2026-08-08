/**
 * Module 33 — financial reports unit tests
 */
import assert from 'assert';
import {
  calculateFinancialMetrics,
  classifyAbcAnalysis,
  buildFinancialCsv,
  roundMoney,
} from './reports-financial.ts';

async function main() {
  console.log('--- Module 33 Reports Unit Tests ---');

  console.log('✅ T33.1 revenue, tax, avg ticket formulas');
  const metrics = calculateFinancialMetrics([
    { total: 110, status: 'completed', paid: true },
    { total: 55, status: 'completed', paid: true },
    { total: 20, status: 'cancelled', paid: false },
  ]);
  assert.strictEqual(metrics.grossRevenue, 165);
  assert.strictEqual(metrics.orderCount, 2);
  assert.strictEqual(metrics.avgTicket, 82.5);
  assert.strictEqual(metrics.voidCount, 1);
  assert.strictEqual(metrics.taxTotal, roundMoney(165 - 165 / 1.1));
  assert.strictEqual(metrics.netRevenue, roundMoney(165 - metrics.taxTotal));

  console.log('✅ T33.2 ABC class A 0-80% cumulative');
  const abc = classifyAbcAnalysis([
    { name: 'Latte', category: 'Coffee', revenue: 800, quantity: 100 },
    { name: 'Toast', category: 'Food', revenue: 150, quantity: 30 },
    { name: 'Tea', category: 'Tea', revenue: 50, quantity: 20 },
  ]);
  assert.strictEqual(abc[0]!.abcClass, 'A');
  assert.ok(abc[0]!.cumulativePercent <= 80);

  console.log('✅ T33.3 ABC class B 80-95%, C 95-100%');
  const abcWide = classifyAbcAnalysis([
    { name: 'A', category: 'X', revenue: 50, quantity: 1 },
    { name: 'B', category: 'X', revenue: 30, quantity: 1 },
    { name: 'C', category: 'X', revenue: 15, quantity: 1 },
    { name: 'D', category: 'X', revenue: 5, quantity: 1 },
  ]);
  assert.strictEqual(abcWide[0]!.abcClass, 'A');
  assert.ok(['B', 'C'].includes(abcWide[abcWide.length - 1]!.abcClass));

  console.log('✅ CSV export contains summary metrics');
  const csv = buildFinancialCsv({
    summary: metrics,
    revenueByDay: [{ date: '2026-08-08', gross: 165, orders: 2 }],
    dishes: abc,
  });
  assert.ok(csv.includes('Gross Revenue,165.00'));
  assert.ok(csv.includes('Latte (A)'));

  console.log('--- Module 33 Unit Tests Passed ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
