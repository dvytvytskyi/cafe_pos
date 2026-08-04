import { Order } from './types/domain';

const DB_NAME = 'corgi_pos_offline';
const DB_VERSION = 1;
const STORE_NAME = 'orders';

export function initOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event);
      reject(event);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveOrderOffline(order: Order): Promise<void> {
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(order);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export async function getOfflineOrders(): Promise<Order[]> {
  const db = await initOfflineDb();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

export async function clearOfflineOrder(id: string): Promise<void> {
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export async function syncOfflineData(locationId: string): Promise<{ syncedCount: number; errors: any[] }> {
  try {
    const orders = await getOfflineOrders();
    if (orders.length === 0) {
      return { syncedCount: 0, errors: [] };
    }

    // Filter orders by location if specified
    const targetOrders = orders.filter(o => o.locationId === locationId);
    if (targetOrders.length === 0) {
      return { syncedCount: 0, errors: [] };
    }

    const response = await fetch('/api/offline-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orders: targetOrders,
        clientTime: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync API failed: ${errorText}`);
    }

    const result = await response.json();
    
    // Clear successfully synced orders from IndexedDB
    if (result.syncedIds && Array.isArray(result.syncedIds)) {
      for (const id of result.syncedIds) {
        await clearOfflineOrder(id);
      }
      return { syncedCount: result.syncedIds.length, errors: result.errors || [] };
    }

    return { syncedCount: 0, errors: ['Invalid server response structure'] };
  } catch (error: any) {
    console.error('Failed to synchronize offline data:', error);
    return { syncedCount: 0, errors: [error.message || error] };
  }
}
