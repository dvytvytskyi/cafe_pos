/**
 * IndexedDB v3 for POS offline-first: snapshots, outbox, session cache.
 * Coexists with legacy v2 stores (orders, tasks) used by task offline-sync.
 */

export const POS_OFFLINE_DB_NAME = 'corgi_pos_offline';
export const POS_OFFLINE_DB_VERSION = 3;

export const STORES = {
  ACTIVE_ORDERS: 'active_orders',
  OUTBOX: 'outbox',
  TABLE_LAYOUTS: 'table_layouts',
  MENU_SNAPSHOT: 'menu_snapshot',
  STAFF_SESSION: 'staff_session',
  SYNC_META: 'sync_meta',
  // legacy v2
  LEGACY_ORDERS: 'orders',
  LEGACY_TASKS: 'tasks',
} as const;

export type OutboxMutationType =
  | 'order_create'
  | 'order_update'
  | 'order_status'
  | 'order_pay'
  | 'table_status';

export interface OutboxEntry {
  id: string;
  type: OutboxMutationType;
  locationId: string;
  orderId?: string;
  tableId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

export interface ActiveOrderRecord {
  id: string;
  locationId: string;
  data: Record<string, unknown>;
  syncPending: boolean;
  updatedAt: string;
}

export interface TableLayoutRecord {
  locationId: string;
  rooms: unknown[];
  updatedAt: string;
}

export interface MenuSnapshotRecord {
  key: string;
  categories: unknown[];
  updatedAt: string;
}

export interface StaffSessionRecord {
  userId: string;
  name: string;
  roleId: string;
  roleName: string;
  locationIds: string[];
  permissions: Record<string, string[]>;
  cachedAt: string;
}

export interface SyncMetaRecord {
  key: string;
  lastBootstrapAt?: string;
  lastFlushAt?: string;
  pendingCount?: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

export function openPosOfflineDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(POS_OFFLINE_DB_NAME, POS_OFFLINE_DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.ACTIVE_ORDERS)) {
          db.createObjectStore(STORES.ACTIVE_ORDERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
          const outbox = db.createObjectStore(STORES.OUTBOX, { keyPath: 'id' });
          outbox.createIndex('by_created', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.TABLE_LAYOUTS)) {
          db.createObjectStore(STORES.TABLE_LAYOUTS, { keyPath: 'locationId' });
        }
        if (!db.objectStoreNames.contains(STORES.MENU_SNAPSHOT)) {
          db.createObjectStore(STORES.MENU_SNAPSHOT, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.STAFF_SESSION)) {
          db.createObjectStore(STORES.STAFF_SESSION, { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
          db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
        }
        // legacy v2 stores
        if (!db.objectStoreNames.contains(STORES.LEGACY_ORDERS)) {
          db.createObjectStore(STORES.LEGACY_ORDERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.LEGACY_TASKS)) {
          db.createObjectStore(STORES.LEGACY_TASKS, { keyPath: 'id' });
        }
      };
    });
  }
  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openPosOfflineDb();
  if (!db) throw new Error('IndexedDB unavailable');
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(fn(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error);
        } else {
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(tx.error);
        }
      })
      .catch(reject);
  });
}

export async function putActiveOrder(record: ActiveOrderRecord): Promise<void> {
  await withStore(STORES.ACTIVE_ORDERS, 'readwrite', (store) => store.put(record));
}

export async function getActiveOrdersByLocation(locationId: string): Promise<ActiveOrderRecord[]> {
  const db = await openPosOfflineDb();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ACTIVE_ORDERS, 'readonly');
    const store = tx.objectStore(STORES.ACTIVE_ORDERS);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = (request.result as ActiveOrderRecord[]).filter((r) => r.locationId === locationId);
      resolve(all);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getActiveOrder(id: string): Promise<ActiveOrderRecord | undefined> {
  return withStore(STORES.ACTIVE_ORDERS, 'readonly', (store) => store.get(id));
}

export async function deleteActiveOrder(id: string): Promise<void> {
  await withStore(STORES.ACTIVE_ORDERS, 'readwrite', (store) => store.delete(id));
}

export async function enqueueOutbox(entry: OutboxEntry): Promise<void> {
  await withStore(STORES.OUTBOX, 'readwrite', (store) => store.put(entry));
}

export async function getOutboxEntries(): Promise<OutboxEntry[]> {
  const db = await openPosOfflineDb();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX, 'readonly');
    const store = tx.objectStore(STORES.OUTBOX);
    const index = store.index('by_created');
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result as OutboxEntry[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeOutboxEntry(id: string): Promise<void> {
  await withStore(STORES.OUTBOX, 'readwrite', (store) => store.delete(id));
}

export async function putTableLayout(record: TableLayoutRecord): Promise<void> {
  await withStore(STORES.TABLE_LAYOUTS, 'readwrite', (store) => store.put(record));
}

export async function getTableLayout(locationId: string): Promise<TableLayoutRecord | undefined> {
  return withStore(STORES.TABLE_LAYOUTS, 'readonly', (store) => store.get(locationId));
}

export async function putMenuSnapshot(record: MenuSnapshotRecord): Promise<void> {
  await withStore(STORES.MENU_SNAPSHOT, 'readwrite', (store) => store.put(record));
}

export async function getMenuSnapshot(key: string): Promise<MenuSnapshotRecord | undefined> {
  return withStore(STORES.MENU_SNAPSHOT, 'readonly', (store) => store.get(key));
}

export async function putStaffSession(record: StaffSessionRecord): Promise<void> {
  await withStore(STORES.STAFF_SESSION, 'readwrite', (store) => store.put(record));
}

export async function getStaffSession(userId?: string): Promise<StaffSessionRecord | undefined> {
  const db = await openPosOfflineDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STAFF_SESSION, 'readonly');
    const store = tx.objectStore(STORES.STAFF_SESSION);
    if (userId) {
      const req = store.get(userId);
      req.onsuccess = () => resolve(req.result as StaffSessionRecord | undefined);
      req.onerror = () => reject(req.error);
    } else {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as StaffSessionRecord[];
        resolve(items.sort((a, b) => b.cachedAt.localeCompare(a.cachedAt))[0]);
      };
      req.onerror = () => reject(req.error);
    }
  });
}

export async function putSyncMeta(record: SyncMetaRecord): Promise<void> {
  await withStore(STORES.SYNC_META, 'readwrite', (store) => store.put(record));
}

export async function getSyncMeta(key: string): Promise<SyncMetaRecord | undefined> {
  return withStore(STORES.SYNC_META, 'readonly', (store) => store.get(key));
}
