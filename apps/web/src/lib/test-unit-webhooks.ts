import assert from 'assert';
import { createHmac } from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const computed = createHmac('sha256', secret).update(payload).digest('hex');
  return computed === signature;
}

export async function run() {
  console.log('Running test-unit-webhooks...');

  const secret = 'webhook_secret_key';
  const payload = JSON.stringify({ orderId: 'glovo-12345', status: 'delivered' });
  const signature = createHmac('sha256', secret).update(payload).digest('hex');

  // 1. Success validation
  const isValid = verifySignature(payload, signature, secret);
  assert.strictEqual(isValid, true, 'Valid webhook signature must pass verification');

  // 2. Tampered payload check
  const isTamperedValid = verifySignature(payload + '[extra]', signature, secret);
  assert.strictEqual(isTamperedValid, false, 'Tampered webhook payload must fail verification');

  console.log('✅ test-unit-webhooks passed.');
}
