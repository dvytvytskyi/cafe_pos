import { queue, queueServiceInstance } from './queue';

async function main() {
  console.log('--- Starting BullMQ Queue Verification Test ---');

  try {
    const testTopic = 'test:queue:jobs';
    const processedJobs: any[] = [];
    let resolveTest: () => void;
    const testFinished = new Promise<void>((resolve) => {
      resolveTest = resolve;
    });

    // 1. Subscribe to the queue
    console.log(`Subscribing worker to topic [${testTopic}]...`);
    queue.subscribe(testTopic, async (payload: any) => {
      console.log(`Processing job with payload:`, payload);
      processedJobs.push(payload);

      // Trigger test completion once all 3 jobs are processed
      if (processedJobs.length === 3) {
        resolveTest();
      }
    });

    // 2. Publish 3 jobs in sequence (to test FIFO ordering)
    console.log('Publishing 3 test jobs to verify FIFO ordering...');
    await queue.publish(testTopic, { order: 1, message: 'First Job' });
    await queue.publish(testTopic, { order: 2, message: 'Second Job' });
    await queue.publish(testTopic, { order: 3, message: 'Third Job' });

    console.log('Waiting for jobs to be processed...');
    
    // Timeout safeguard after 8 seconds
    const timeout = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: Jobs were not processed in time.')), 8000);
    });

    await Promise.race([testFinished, timeout]);

    console.log('Processed jobs list:', processedJobs);

    // 3. Verify FIFO ordering
    if (
      processedJobs[0].order === 1 &&
      processedJobs[1].order === 2 &&
      processedJobs[2].order === 3
    ) {
      console.log('✅ Success: FIFO ordering verified (jobs processed sequentially: 1 -> 2 -> 3)!');
    } else {
      console.error('❌ ERROR: FIFO ordering failed or jobs processed out of order!');
      process.exit(1);
    }

    // 4. Test failure retries
    console.log('--- Starting BullMQ Retry Test ---');
    const retryTopic = 'test:queue:retry';
    let attemptsCount = 0;
    let resolveRetryTest: () => void;
    const retryFinished = new Promise<void>((resolve) => {
      resolveRetryTest = resolve;
    });

    queue.subscribe(retryTopic, async (payload: any) => {
      attemptsCount++;
      console.log(`Processing retry job. Attempt count: ${attemptsCount}`);
      
      if (attemptsCount < 3) {
        console.log('Failing attempt to trigger BullMQ retry backoff...');
        throw new Error('Simulated processing failure');
      } else {
        console.log('Succeeding on the 3rd attempt!');
        resolveRetryTest();
      }
    });

    console.log('Publishing job that fails twice and succeeds on the 3rd attempt...');
    await queue.publish(retryTopic, { action: 'retry_test' });

    // Safeguard timeout (BullMQ exponential backoff delay is 2s, so 2s + 4s = 6s. 12s timeout is safe)
    const retryTimeout = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: Retry job did not finish.')), 12000);
    });

    await Promise.race([retryFinished, retryTimeout]);

    if (attemptsCount === 3) {
      console.log('✅ Success: BullMQ retried failed jobs exactly 3 times and completed successfully!');
    } else {
      console.error(`❌ ERROR: Job failed to retry correctly. Total attempts: ${attemptsCount}`);
      process.exit(1);
    }

    // Clean up connections
    console.log('Closing all queue and worker connections...');
    await queueServiceInstance.closeAll();

    console.log('--- BullMQ Test Completed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during BullMQ test:', error);
    process.exit(1);
  }
}

main();
