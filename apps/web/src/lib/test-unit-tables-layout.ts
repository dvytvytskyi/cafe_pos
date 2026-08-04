import assert from 'assert';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function checkOverlap(r1: Rect, r2: Rect): boolean {
  return !(
    r1.x + r1.w <= r2.x ||
    r2.x + r2.w <= r1.x ||
    r1.y + r1.h <= r2.y ||
    r2.y + r2.h <= r1.y
  );
}

export async function run() {
  console.log('Running test-unit-tables-layout...');

  const table1: Rect = { x: 10, y: 10, w: 50, h: 50 };
  const table2Overlap: Rect = { x: 30, y: 30, w: 50, h: 50 };
  const table3Clear: Rect = { x: 100, y: 10, w: 50, h: 50 };

  // 1. Overlap case
  assert.strictEqual(checkOverlap(table1, table2Overlap), true, 'Table overlap should be detected');

  // 2. Clear case
  assert.strictEqual(checkOverlap(table1, table3Clear), false, 'Clear layout tables should not be flagged as overlapping');

  console.log('✅ test-unit-tables-layout passed.');
}
