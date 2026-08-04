import assert from 'assert';
import { createHash } from 'crypto';

export async function run() {
  console.log('Running test-unit-fiscal...');

  const computeHash = (dataStr: string, prevHash: string): string => {
    return createHash('sha256').update(dataStr + prevHash).digest('hex');
  };

  // 1. Genesis Hash Check
  const genesisPrev = '0000000000000000';
  const data1 = 'Invoice #1';
  const hash1 = computeHash(data1, genesisPrev);
  assert.strictEqual(hash1.length, 64, 'SHA-256 must yield 64 hex characters');

  // 2. Chaining integrity
  const data2 = 'Invoice #2';
  const hash2 = computeHash(data2, hash1);
  assert.notStrictEqual(hash1, hash2, 'Subsequent blocks must produce unique hashes');

  // 3. Tampering detection
  const alteredData1 = 'Invoice #1 [Altered Amount]';
  const alteredHash1 = computeHash(alteredData1, genesisPrev);
  const alteredHash2 = computeHash(data2, alteredHash1);

  assert.notStrictEqual(hash2, alteredHash2, 'Tampering with block 1 must invalidate block 2 hash');
  console.log('✅ test-unit-fiscal passed.');
}
