export interface InventoryTransfer {
  id: string;
  itemId: string;
  type: 'check_in' | 'check_out' | 'sale';
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface MerchItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  minStockLevel: number;
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
  };
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
  sourceLocationId?: string;
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

export const LOCATION_LABELS: Record<string, string> = {
  main: 'Main WH',
  gothic: 'Gótico',
  eixample: 'Eixample',
  sagrada: 'Sagrada',
};

export function locationIdFromLabel(label: string): string {
  const entry = Object.entries(LOCATION_LABELS).find(([, v]) => v === label);
  return entry?.[0] ?? label.toLowerCase().replace(/\s+/g, '_');
}

export function locationLabelFromId(id: string): string {
  return LOCATION_LABELS[id] ?? id;
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
