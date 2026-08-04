import { redisClient } from './cache';

/**
 * Broadcasts an event to all connected WebSocket clients across all server instances.
 * This utilizes Redis Pub/Sub to forward events to the standalone WebSocket gateway.
 * 
 * @param eventName Name of the socket event to broadcast (e.g. 'order_created', 'table_updated')
 * @param payload Object containing the event data
 */
export async function broadcastEvent(eventName: string, payload: any): Promise<void> {
  try {
    const message = JSON.stringify({ name: eventName, payload });
    // Publish to Redis channel (the WebSocket gateway listens to this channel)
    await redisClient.publish('pos-events', message);
    console.log(`Successfully published event [${eventName}] to Redis pub/sub.`);
  } catch (error) {
    console.error(`Failed to publish event [${eventName}] to Redis pub/sub:`, error);
  }
}
