import { io as clientIo } from 'socket.io-client';
import { broadcastEvent } from './ws-client.ts';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

async function main() {
  console.log('--- Starting WebSocket & Redis Pub/Sub Verification Test ---');

  const TEST_PORT = 3006;
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  console.log(`Starting mock WebSocket Server on port ${TEST_PORT}...`);
  const httpServer = createServer();
  const ioServer = new Server(httpServer, {
    cors: { origin: '*' },
  });

  const subRedis = new Redis(REDIS_URL);
  subRedis.subscribe('pos-events');
  subRedis.on('message', (channel, message) => {
    if (channel === 'pos-events') {
      const { name, payload } = JSON.parse(message);
      ioServer.emit(name, payload);
    }
  });

  ioServer.on('connection', (socket) => {
    socket.on('ping', (data) => {
      socket.emit('pong', data);
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(TEST_PORT, resolve));
  console.log('Mock WebSocket Server is ready.');

  try {
    const receivedEventsClient1: unknown[] = [];
    const receivedEventsClient2: unknown[] = [];

    const client1 = clientIo(`http://localhost:${TEST_PORT}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    const client2 = clientIo(`http://localhost:${TEST_PORT}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    client1.on('order:created', (data) => {
      receivedEventsClient1.push(data);
    });
    client1.on('order:updated', (data) => {
      receivedEventsClient1.push(data);
    });

    client2.on('order:created', (data) => {
      receivedEventsClient2.push(data);
    });
    client2.on('order:updated', (data) => {
      receivedEventsClient2.push(data);
    });

    await new Promise<void>((resolve) => {
      let count = 0;
      const check = () => {
        count++;
        if (count === 2) resolve();
      };
      client1.on('connect', check);
      client2.on('connect', check);
    });
    console.log('✅ Both clients connected successfully.');

    const pingPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Ping timeout')), 3000);
      client1.emit('ping', 'hello');
      client1.on('pong', (data) => {
        if (data === 'hello') {
          clearTimeout(timer);
          resolve();
        } else {
          reject(new Error('Invalid pong data'));
        }
      });
    });
    await pingPromise;
    console.log('✅ Ping/Pong verified successfully.');

    const testPayload = { orderId: 'ord_123', locationId: 'default', status: 'preparing' };
    await broadcastEvent('order:created', testPayload);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (
      receivedEventsClient1.length >= 1 &&
      receivedEventsClient2.length >= 1 &&
      (receivedEventsClient1[0] as { orderId?: string }).orderId === testPayload.orderId
    ) {
      console.log('✅ Success: order:created broadcast received by all connected clients!');
    } else {
      console.error('❌ ERROR: Broadcast event failed.', {
        client1: receivedEventsClient1,
        client2: receivedEventsClient2,
      });
      process.exit(1);
    }

    client1.disconnect();
    client2.disconnect();
    await subRedis.quit();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));

    console.log('--- WebSocket & Redis Pub/Sub Test Completed Successfully ---');
  } catch (err) {
    console.error('Unexpected error during WebSocket test:', err);
    process.exitCode = 1;
  } finally {
    const { queue } = await import('./queue/index.ts');
    await queue.closeAll().catch(() => {});
  }
}

main();
