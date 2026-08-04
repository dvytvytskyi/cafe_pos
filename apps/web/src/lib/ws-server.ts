import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

const PORT = parseInt(process.env.WS_PORT || '3005', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('--- Starting Standalone Socket.io Server ---');

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Corgi POS WebSocket Gateway Running\n');
});

// Configure Socket.io with CORS enabled
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for development/mPOS clients
    methods: ['GET', 'POST'],
  },
});

// Redis Subscription client for event forwarding
const subRedis = new Redis(REDIS_URL);

subRedis.on('connect', () => {
  console.log('WebSocket Gateway connected to Redis Pub/Sub successfully.');
});

subRedis.on('error', (err) => {
  console.error('WebSocket Gateway Redis Connection Error:', err);
});

// Subscribe to global POS event channel
subRedis.subscribe('pos-events', (err) => {
  if (err) {
    console.error('Failed to subscribe to pos-events channel:', err);
  } else {
    console.log('Subscribed to Redis channel: pos-events');
  }
});

// Forward Redis Pub/Sub messages to active WebSocket clients
subRedis.on('message', (channel, message) => {
  if (channel === 'pos-events') {
    try {
      const { name, payload } = JSON.parse(message);
      console.log(`Forwarding event [${name}] to WebSocket clients with payload:`, payload);
      io.emit(name, payload);
    } catch (err) {
      console.error('Failed to parse Redis pub/sub message:', err);
    }
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: Socket ID = ${socket.id}`);

  // Echo/Ping test handler
  socket.on('ping', (data) => {
    socket.emit('pong', data);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: Socket ID = ${socket.id}, Reason = ${reason}`);
  });
});

// Graceful shutdown helper
export async function shutdownWSServer() {
  console.log('Shutting down WebSocket Gateway...');
  io.close();
  await subRedis.quit();
  return new Promise<void>((resolve) => {
    httpServer.close(() => {
      console.log('HTTP server closed.');
      resolve();
    });
  });
}

// Only start the server directly if executed as a standalone script
if (require.main === module) {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`WebSocket Server listening on http://0.0.0.0:${PORT}`);
  });
}
