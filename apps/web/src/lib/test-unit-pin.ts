import assert from 'assert';
import { createHash } from 'crypto';

export async function run() {
  console.log('Running test-unit-pin...');

  const hashPin = (pin: string): string => {
    return createHash('sha256').update(pin).digest('hex');
  };

  const hash1 = hashPin('7788');
  const hash2 = hashPin('7788');
  const hashDifferent = hashPin('1234');

  // 1. Consistency check
  assert.strictEqual(hash1, hash2, 'Consistent PIN input must yield identical hash outputs');

  // 2. Uniqueness check
  assert.notStrictEqual(hash1, hashDifferent, 'Different PIN inputs must yield distinct hashes');

  // 3. Length check
  assert.strictEqual(hash1.length, 64, 'PIN hash must be a valid SHA-256 64-character string');
  console.log('✅ test-unit-pin passed.');
}
