import { POST as glovoDispatchHandler } from '../app/api/webhooks/glovo/dispatch/route';
import { POST as uberEatsHandler } from '../app/api/webhooks/ubereats/route';
import { createHmac } from 'crypto';
import { queue, queueServiceInstance } from './queue';
import Redis from 'ioredis';
import { Worker } from 'bullmq';

async function main() {
  console.log('--- Starting Webhook Verification & Worker Tests ---');

  const glovoSecret = process.env.GLOVO_WEBHOOK_SIGNING_KEY || 'corgi_glovo_secret_key_123';
  const uberSecret = process.env.UBER_WEBHOOK_SIGNING_KEY || '01ebd1d7ed8a79053780b7acbfac917ddf9cf861fb6b76e692d86d9ebe9cafe4';

  const testPayload = {
    orderId: 'GLV-TEST-888',
    deliveryAddress: 'Carrer de Mallorca 234, Barcelona',
    items: [{ name: 'Corgi Bun', quantity: 2, price: 3.5 }],
  };
  const bodyString = JSON.stringify(testPayload);

  // 1. Test Glovo Webhook Signature Mismatch (should fail)
  console.log('Testing Glovo Webhook with INVALID signature...');
  const invalidRequest = new Request('http://localhost/api/webhooks/glovo/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-glovo-signature': 'invalid_signature_hash_value',
    },
    body: bodyString,
  });

  const response1 = await glovoDispatchHandler(invalidRequest);
  console.log(`Glovo Response (Invalid Signature): Status = ${response1.status}`);
  if (response1.status === 401) {
    console.log('✅ Success: Webhook correctly rejected invalid signature.');
  } else {
    console.error('❌ ERROR: Webhook accepted invalid signature!', response1.status);
    process.exit(1);
  }

  // 2. Test Glovo Webhook Valid Signature (should succeed and queue job)
  console.log('Testing Glovo Webhook with VALID signature...');
  const validSignature = createHmac('sha256', glovoSecret)
    .update(bodyString)
    .digest('hex');

  const validRequest = new Request('http://localhost/api/webhooks/glovo/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-glovo-signature': validSignature,
    },
    body: bodyString,
  });

  // Intercept job in BullMQ
  const receivedGlovoJobs: any[] = [];
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
  const worker = new Worker('glovo-order_dispatched', async (job) => {
    console.log('BullMQ Worker processed Glovo webhook job:', job.data);
    receivedGlovoJobs.push(job.data);
  }, { connection });

  const response2 = await glovoDispatchHandler(validRequest);
  console.log(`Glovo Response (Valid Signature): Status = ${response2.status}`);
  if (response2.status === 200) {
    console.log('✅ Success: Webhook accepted valid signature and returned 200 OK.');
  } else {
    console.error('❌ ERROR: Webhook failed to accept valid signature!', response2.status);
    process.exit(1);
  }

  // Wait for worker to intercept the queued job
  await new Promise((resolve) => setTimeout(resolve, 2000));
  if (receivedGlovoJobs.length === 1 && receivedGlovoJobs[0].orderId === 'GLV-TEST-888') {
    console.log('✅ Success: Glovo dispatch job was successfully queued and processed by BullMQ worker!');
  } else {
    console.error('❌ ERROR: Job not found in BullMQ queue or has wrong data.', receivedGlovoJobs);
    process.exit(1);
  }

  // 3. Test Uber Eats Webhook
  console.log('Testing Uber Eats Webhook with VALID signature...');
  const uberPayload = {
    event_type: 'orders.notification',
    meta: { resource_id: 'UBER-TEST-999' },
  };
  const uberBodyString = JSON.stringify(uberPayload);
  const uberSignature = createHmac('sha256', uberSecret)
    .update(uberBodyString)
    .digest('hex');

  const uberRequest = new Request('http://localhost/api/webhooks/ubereats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-uber-signature': uberSignature,
    },
    body: uberBodyString,
  });

  const receivedUberJobs: any[] = [];
  const uberWorker = new Worker('ubereats-order_received', async (job) => {
    console.log('BullMQ Worker processed Uber Eats webhook job:', job.data);
    receivedUberJobs.push(job.data);
  }, { connection });

  const uberResponse = await uberEatsHandler(uberRequest);
  console.log(`Uber Response: Status = ${uberResponse.status}`);
  if (uberResponse.status === 200) {
    console.log('✅ Success: Uber Eats webhook accepted valid signature and returned 200 OK.');
  } else {
    console.error('❌ ERROR: Uber Eats webhook failed!', uberResponse.status);
    process.exit(1);
  }

  // Wait for worker
  await new Promise((resolve) => setTimeout(resolve, 2000));
  if (receivedUberJobs.length === 1 && receivedUberJobs[0].orderId === 'UBER-TEST-999') {
    console.log('✅ Success: Uber Eats job was successfully queued and processed by BullMQ worker!');
  } else {
    console.error('❌ ERROR: Uber Eats job not found in BullMQ queue.', receivedUberJobs);
    process.exit(1);
  }

  // Clean up
  await worker.close();
  await uberWorker.close();
  await connection.quit();
  await queueServiceInstance.closeAll();

  console.log('--- Webhook & Worker Tests Completed Successfully ---');
  process.exit(0);
}

main();
