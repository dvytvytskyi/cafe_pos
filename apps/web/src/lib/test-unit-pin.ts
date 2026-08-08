import assert from 'assert';
import { createHash } from 'crypto';
import { normalizePinInput } from './auth-validation.ts';
import { hashPin } from '../repositories/user.repository.ts';

export async function run() {
  console.log('Running test-unit-pin...');

  const hashPinLocal = (pin: string): string => createHash('sha256').update(pin).digest('hex');

  const hash1 = hashPinLocal('7788');
  const hash2 = hashPinLocal('7788');
  const hashDifferent = hashPinLocal('1234');

  assert.strictEqual(hash1, hash2, 'Consistent PIN input must yield identical hash outputs');
  assert.notStrictEqual(hash1, hashDifferent, 'Different PIN inputs must yield distinct hashes');
  assert.strictEqual(hash1.length, 64, 'PIN hash must be a valid SHA-256 64-character string');

  // T35.1 — letters ignored, 4 digits required
  assert.strictEqual(normalizePinInput('12ab34'), '1234');
  assert.strictEqual(normalizePinInput('7788'), '7788');
  assert.throws(() => normalizePinInput('abc'), /4 digits/);
  assert.throws(() => normalizePinInput('12345'), /4 digits/);

  // T35.2 — repository hash matches local SHA-256
  assert.strictEqual(hashPin('7788'), hashPinLocal('7788'));

  console.log('✅ T35.1 PIN 4 digits, letters ignored');
  console.log('✅ T35.2 PIN hashed before compare');
  console.log('✅ test-unit-pin passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
