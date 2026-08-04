import { io as clientIo } from 'socket.io-client';
import { shutdownWSServer } from './ws-server';
import { broadcastEvent } from './ws-client';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

async function main() {
  console.log('--- Starting WebSocket & Redis Pub/Sub Verification Test ---');

  const TEST_PORT = 3006;
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  // 1. Spin up the Socket.io Gateway Server on TEST_PORT
  console.log(`Starting mock WebSocket Server on port ${TEST_PORT}...`);
  const httpServer = createServer();
  const ioServer = new Server(httpServer, {
    cors: { origin: '*' }
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
    const receivedEventsClient1: any[] = [];
    const receivedEventsClient2: any[] = [];

    // 2. Connect Client 1
    console.log('Connecting Client 1 to WebSocket server...');
    const client1 = clientIo(`http://localhost:${TEST_PORT}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    // 3. Connect Client 2
    console.log('Connecting Client 2 to WebSocket server...');
    const client2 = clientIo(`http://localhost:${TEST_PORT}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    // Set up event listeners
    client1.on('order_update', (data) => {
      console.log('Client 1 received order_update:', data);
      receivedEventsClient1.push(data);
    });

    client2.on('order_update', (data) => {
      console.log('Client 2 received order_update:', data);
      receivedEventsClient2.push(data);
    });

    // Wait for clients to connect
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

    // 4. Test Client 1 Ping/Pong
    console.log('Testing Client 1 Ping/Pong...');
    const pingPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Ping timeout')), 3000);
      client1.emit('ping', 'hello');
      client1.on('pong', (data) => {
        if (data === 'hello') {
          console.log('✅ Ping/Pong verified successfully.');
          clearTimeout(timer);
          resolve();
        } else {
          reject(new Error('Invalid pong data'));
        }
      });
    });
    await pingPromise;

    // 5. Test Redis Pub/Sub Broadcast
    console.log('Triggering Redis Pub/Sub Broadcast via broadcastEvent()...');
    const testPayload = { orderId: 'ord_123', status: 'ready_for_pickup' };
    
    // Broadcast event
    await broadcastEvent('order_update', testPayload);

    console.log('Waiting for clients to receive broadcasted message...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify both clients received the broadcasted event
    if (
      receivedEventsClient1.length === 1 &&
      receivedEventsClient1[0].orderId === testPayload.orderId &&
      receivedEventsClient2.length === 1 &&
      receivedEventsClient2[0].orderId === testPayload.orderId
    ) {
      console.log('✅ Success: Broadcast event received by all connected clients!');
    } else {
      console.error('❌ ERROR: Broadcast event failed. Clients did not receive payload.', {
        client1: receivedEventsClient1,
        client2: receivedEventsClient2
      });
      process.exit(1);
    }

    // 6. Graceful Disconnect & Shutdown
    console.log('Disconnecting clients...');
    client1.disconnect();
    client2.disconnect();

    console.log('Shutting down server connections...');
    await subRedis.quit();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    
    console.log('--- WebSocket & Redis Pub/Sub Test Completed Successfully ---');
    process.exit(0);

  } catch (err) {
    console.error('Unexpected error during WebSocket test:', err);
    process.exit(1);
  }
}

main();
