import { CapacitorBridge } from './capacitor-bridge';
import { mapApiOrderToUi } from './mappers/order.mapper';
import type { Order } from './orders';
import type { Room } from './tables';
import {
  getOutboxEntries,
  putSyncMeta,
  removeOutboxEntry,
  type OutboxEntry,
} from './pos-offline-db';
import { offlineReplaceOrdersSnapshot } from './orders-offline';
import { offlineReplaceLayoutSnapshot } from './tables-offline';
import { putMenuSnapshot } from './pos-offline-db';

let listenerCleanup: (() => void) | null = null;
let activeLocationId: string | null = null;
let flushing = false;

export function getActiveOfflineLocationId(): string | null {
  return activeLocationId;
}

export async function bootstrapPosOffline(locationId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  activeLocationId = locationId;

  try {
    const ordersRes = await fetch(
      `/api/orders?locationId=${encodeURIComponent(locationId)}&status=active&fresh=1`
    );
    if (ordersRes.ok) {
      const data = await ordersRes.json();
      const orders = (data as Parameters<typeof mapApiOrderToUi>[0][]).map(
        (o) => mapApiOrderToUi(o) as Order
      );
      await offlineReplaceOrdersSnapshot(locationId, orders);
    }

    const layoutRes = await fetch(`/api/locations/${locationId}/layout`);
    if (layoutRes.ok) {
      const rooms = (await layoutRes.json()) as Room[];
      await offlineReplaceLayoutSnapshot(locationId, rooms);
    }

    const menuRes = await fetch('/api/menu/categories?includeArchived=false');
    if (menuRes.ok) {
      const categories = await menuRes.json();
      await putMenuSnapshot({
        key: 'active',
        categories,
        updatedAt: new Date().toISOString(),
      });
    }

    await putSyncMeta({
      key: `bootstrap:${locationId}`,
      lastBootstrapAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[pos-offline-sync] bootstrap failed (may be offline):', err);
  }
}

async function flushSingleEntry(entry: OutboxEntry): Promise<boolean> {
  try {
    switch (entry.type) {
      case 'order_create': {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.payload),
        });
        return res.ok;
      }
      case 'order_update': {
        const res = await fetch(`/api/orders/${entry.orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.payload),
        });
        return res.ok;
      }
      case 'order_status': {
        const res = await fetch(`/api/orders/${entry.orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: entry.payload.status }),
        });
        return res.ok;
      }
      case 'order_pay': {
        const res = await fetch(`/api/orders/${entry.orderId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.payload),
        });
        return res.ok;
      }
      case 'table_status': {
        const res = await fetch(`/api/tables/${entry.tableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: entry.payload.status }),
        });
        return res.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export async function flushOutbox(): Promise<{ flushed: number; failed: number }> {
  if (flushing || typeof window === 'undefined') return { flushed: 0, failed: 0 };
  flushing = true;
  let flushed = 0;
  let failed = 0;
  try {
    const entries = await getOutboxEntries();
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const entry of sorted) {
      const ok = await flushSingleEntry(entry);
      if (ok) {
        await removeOutboxEntry(entry.id);
        flushed++;
      } else {
        failed++;
      }
    }
    await putSyncMeta({
      key: 'flush',
      lastFlushAt: new Date().toISOString(),
      pendingCount: failed,
    });
    if (activeLocationId && flushed > 0) {
      await bootstrapPosOffline(activeLocationId);
    }
  } finally {
    flushing = false;
  }
  return { flushed, failed };
}

export async function startPosOfflineSync(locationId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  activeLocationId = locationId;

  await bootstrapPosOffline(locationId);

  if (listenerCleanup) {
    listenerCleanup();
    listenerCleanup = null;
  }

  const handle = await CapacitorBridge.startNetworkListener((connected) => {
    if (connected) {
      flushOutbox().catch(console.error);
    }
  });
  listenerCleanup = handle.remove;

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    await flushOutbox();
  }
}

export async function getPendingOutboxCount(): Promise<number> {
  const entries = await getOutboxEntries();
  return entries.length;
}

export function stopPosOfflineSync(): void {
  listenerCleanup?.();
  listenerCleanup = null;
}
