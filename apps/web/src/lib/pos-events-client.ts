'use client';

import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3005';

let socket: Socket | null = null;

export function subscribeToPosEvents(
  handlers: {
    onOrderCreated?: (payload: unknown) => void;
    onOrderUpdated?: (payload: unknown) => void;
  }
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (!socket) {
    socket = io(WS_URL, { transports: ['websocket'], autoConnect: true });
  }

  const onCreated = (payload: unknown) => handlers.onOrderCreated?.(payload);
  const onUpdated = (payload: unknown) => handlers.onOrderUpdated?.(payload);

  socket.on('order:created', onCreated);
  socket.on('order:updated', onUpdated);

  return () => {
    socket?.off('order:created', onCreated);
    socket?.off('order:updated', onUpdated);
  };
}
