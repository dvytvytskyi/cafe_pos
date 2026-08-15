import { getLocationsCachedAsync, type LocationSummary } from './locations';
import { MAIN_WAREHOUSE_LOCATION_ID } from './inventory-constants';

export { MAIN_WAREHOUSE_LOCATION_ID };

export interface InventoryTransfer {
  id: string;
  itemId: string;
  type: 'check_in' | 'check_out' | 'sale';
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface InventoryLocationStockRow {
  id: string;
  locationId: string;
  quantity: number;
  location: { id: string; name: string };
}

export interface MerchItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  minStockLevel: number;
  category: 'merch' | 'kitchen' | 'bar';
  unit: string;
  locationStock: InventoryLocationStockRow[];
  transfers: InventoryTransfer[];
  createdAt: string;
  updatedAt: string;
}

export interface StockTransferRecord {
  id: string;
  itemId: string;
  sourceLocationId: string;
  targetLocationId: string;
  quantity: number;
  status: 'pending' | 'in_transit' | 'completed';
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    minStockLevel: number;
    category?: string;
    unit?: string;
  };
}

export function locationStocksToMap(item: MerchItem): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of item.locationStock ?? []) {
    map[row.locationId] = row.quantity;
  }
  return map;
}

export function sortInventoryLocations(locations: LocationSummary[]): LocationSummary[] {
  return [...locations].sort((a, b) => {
    if (a.id === MAIN_WAREHOUSE_LOCATION_ID) return -1;
    if (b.id === MAIN_WAREHOUSE_LOCATION_ID) return 1;
    return a.name.localeCompare(b.name, 'uk');
  });
}

export async function getInventoryLocationsAsync(): Promise<LocationSummary[]> {
  const locations = await getLocationsCachedAsync();
  return sortInventoryLocations(locations);
}

export function buildLocationLabelMap(locations: LocationSummary[]): Record<string, string> {
  return Object.fromEntries(locations.map((l) => [l.id, l.name]));
}

export function locationLabelFromId(id: string, labels: Record<string, string>): string {
  return labels[id] ?? id;
}

export async function getInventoryAsync(): Promise<MerchItem[]> {
  const res = await fetch('/api/inventory');
  if (!res.ok) {
    throw new Error('Failed to fetch merch inventory list from PostgreSQL');
  }
  return res.json();
}

export async function createInventoryItemAsync(data: {
  name: string;
  sku: string;
  price: number;
  initialStock?: number;
  minStockLevel?: number;
  category?: 'merch' | 'kitchen' | 'bar';
  unit?: string;
  locationStocks?: Record<string, number>;
}): Promise<MerchItem> {
  const res = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to create inventory item in PostgreSQL');
  }
  return res.json();
}

export async function updateInventoryItemAsync(
  id: string,
  data: {
    name: string;
    sku?: string;
    price: number;
    minStockLevel: number;
    category: 'merch' | 'kitchen' | 'bar';
    unit: string;
    locationStocks: Record<string, number>;
  }
): Promise<MerchItem> {
  const res = await fetch(`/api/inventory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to update inventory item');
  }
  return res.json();
}

export async function adjustStockAsync(
  itemId: string,
  type: 'check_in' | 'check_out',
  quantity: number,
  reason?: string
): Promise<MerchItem> {
  const res = await fetch('/api/inventory/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, type, quantity, reason }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to adjust stock levels for item [${itemId}]`);
  }
  return res.json();
}

export async function getStockTransfersAsync(): Promise<StockTransferRecord[]> {
  const res = await fetch('/api/inventory/transfers');
  if (!res.ok) {
    throw new Error('Failed to fetch stock transfers');
  }
  return res.json();
}

export async function createStockTransferAsync(data: {
  itemId: string;
  quantity: number;
  sourceLocationId: string;
  targetLocationId: string;
  createdByName?: string;
}): Promise<StockTransferRecord> {
  const res = await fetch('/api/inventory/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to create stock transfer');
  }
  return res.json();
}

export async function completeStockTransferAsync(id: string): Promise<StockTransferRecord> {
  const res = await fetch(`/api/inventory/transfers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to complete stock transfer');
  }
  return res.json();
}

export function inferCategoryFromSku(sku: string): 'merch' | 'kitchen' | 'bar' {
  const match = sku.match(/^INV-([A-Z]{3})-\d{4}$/);
  if (!match) return 'merch';
  const code = match[1]!;
  if (code.startsWith('KIT') || code.startsWith('KCH') || code.startsWith('FOO')) return 'kitchen';
  if (code.startsWith('BAR') || code.startsWith('BEV') || code.startsWith('CFB')) return 'bar';
  return 'merch';
}

export function stockStatusFromQuantity(
  quantity: number,
  minStockLevel: number
): 'healthy' | 'low' | 'out' {
  if (quantity <= 0) return 'out';
  if (quantity <= minStockLevel) return 'low';
  return 'healthy';
}
