import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';

/**
 * Global Queue Interface
 * Abstracts background job processing (BullMQ, Redis, RabbitMQ, etc.)
 */
export interface IQueueService {
  publish(topic: string, payload: any): Promise<void>;
  publishRepeatable(topic: string, payload: any, cronExpression: string): Promise<void>;
  subscribe(topic: string, handler: (payload: any) => Promise<void>): void;
}

// Configuration for Redis connection (required by BullMQ)
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
  });
};

// BullMQ Implementation
export class BullQueueService implements IQueueService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private connection = getRedisConnection();

  private getQueue(topic: string): Queue {
    const queueName = topic.replace(/:/g, '-');
    let queue = this.queues.get(queueName);
    if (!queue) {
      const queueOptions: QueueOptions = {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 5, // Retry failed jobs up to 5 times
          backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s, 16s...
          },
          removeOnComplete: true, // Auto clean completed jobs
          removeOnFail: false,   // Keep failed jobs for debugging
        },
      };
      queue = new Queue(queueName, queueOptions);
      this.queues.set(queueName, queue);
    }
    return queue;
  }

  async publish(topic: string, payload: any): Promise<void> {
    try {
      const queue = this.getQueue(topic);
      const sanitizedTopic = topic.replace(/:/g, '-');
      // Generate a unique job name based on the topic and timestamp
      const jobName = `${sanitizedTopic}-job-${Date.now()}`;
      await queue.add(jobName, payload);
    } catch (error) {
      console.error(`Error publishing job to BullMQ queue [${topic}]:`, error);
    }
  }

  async publishRepeatable(topic: string, payload: any, cronExpression: string): Promise<void> {
    try {
      const queue = this.getQueue(topic);
      const sanitizedTopic = topic.replace(/:/g, '-');
      const jobName = `${sanitizedTopic}-repeatable`;
      await queue.add(jobName, payload, { repeat: { cron: cronExpression } });
    } catch (error) {
      console.error(`Error publishing repeatable job to BullMQ queue [${topic}]:`, error);
    }
  }

  subscribe(topic: string, handler: (payload: any) => Promise<void>): void {
    try {
      const queueName = topic.replace(/:/g, '-');
      if (this.workers.has(queueName)) {
        console.warn(`Already subscribed to topic [${topic}]. Subscribing again will replace the previous worker.`);
        this.workers.get(queueName)?.close();
      }

      const workerOptions: WorkerOptions = {
        connection: getRedisConnection(), // Dedicated connection for worker blocking operations
        concurrency: 1, // Strict FIFO processing
      };

      const worker = new Worker(
        queueName,
        async (job) => {
          await handler(job.data);
        },
        workerOptions
      );

      worker.on('failed', (job, err) => {
        console.error(`Job [${job?.id}] in queue [${topic}] failed:`, err.message);
      });

      this.workers.set(queueName, worker);
    } catch (error) {
      console.error(`Error subscribing to BullMQ queue [${topic}]:`, error);
    }
  }

  // Gracefully close all connections (for tests and shutdown hooks)
  async closeAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    await this.connection.quit();
  }
}

// Global queue instance
export const queue = new BullQueueService();
export const queueServiceInstance = queue;
export { Queue, Worker };
