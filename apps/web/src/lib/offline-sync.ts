import { Order } from './types/domain';
import { TaskRecord } from './task-mapper';

const DB_NAME = 'corgi_pos_offline';
const DB_VERSION = 2;
const ORDER_STORE = 'orders';
const TASK_STORE = 'tasks';

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
      if (!db.objectStoreNames.contains(ORDER_STORE)) {
        db.createObjectStore(ORDER_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TASK_STORE)) {
        db.createObjectStore(TASK_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveOrderOffline(order: Order): Promise<void> {
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDER_STORE], 'readwrite');
    const store = transaction.objectStore(ORDER_STORE);
    const request = store.put(order);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export async function getOfflineOrders(): Promise<Order[]> {
  const db = await initOfflineDb();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDER_STORE], 'readonly');
    const store = transaction.objectStore(ORDER_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

export async function clearOfflineOrder(id: string): Promise<void> {
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDER_STORE], 'readwrite');
    const store = transaction.objectStore(ORDER_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export async function saveTaskOffline(task: TaskRecord): Promise<void> {
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASK_STORE], 'readwrite');
    const store = transaction.objectStore(TASK_STORE);
    const request = store.put(task);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export async function getOfflineTasks(): Promise<TaskRecord[]> {
  const db = await initOfflineDb();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASK_STORE], 'readonly');
    const store = transaction.objectStore(TASK_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

export async function clearOfflineTask(id: string): Promise<void> {
  const db = await initOfflineDb();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASK_STORE], 'readwrite');
    const store = transaction.objectStore(TASK_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

export async function syncOfflineData(locationId: string): Promise<{ syncedCount: number; errors: any[] }> {
  try {
    const orders = await getOfflineOrders();
    const tasks = await getOfflineTasks();

    if (orders.length === 0 && tasks.length === 0) {
      return { syncedCount: 0, errors: [] };
    }

    const targetOrders = orders.filter(o => o.locationId === locationId);

    const response = await fetch('/api/offline-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orders: targetOrders,
        tasks,
        clientTime: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync API failed: ${errorText}`);
    }

    const result = await response.json();

    let syncedCount = 0;
    if (result.syncedIds && Array.isArray(result.syncedIds)) {
      for (const id of result.syncedIds) {
        await clearOfflineOrder(id);
        syncedCount++;
      }
    }
    if (result.syncedTaskIds && Array.isArray(result.syncedTaskIds)) {
      for (const id of result.syncedTaskIds) {
        await clearOfflineTask(id);
        syncedCount++;
      }
      return { syncedCount, errors: result.errors || [] };
    }

    if (syncedCount > 0) {
      return { syncedCount, errors: result.errors || [] };
    }

    return { syncedCount: 0, errors: ['Invalid server response structure'] };
  } catch (error: any) {
    console.error('Failed to synchronize offline data:', error);
    return { syncedCount: 0, errors: [error.message || error] };
  }
}
