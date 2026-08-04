export interface InventoryTransfer {
  id: string;
  itemId: string;
  type: 'check_in' | 'check_out' | 'sale';
  quantity: number;
  reason?: string;
  createdAt: string; // ISO string
}

export interface MerchItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  transfers: InventoryTransfer[];
  createdAt: string;
  updatedAt: string;
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
}): Promise<MerchItem> {
  const res = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to create inventory item in PostgreSQL');
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
    throw new Error(`Failed to adjust stock levels for item [${itemId}] in PostgreSQL`);
  }
  return res.json();
}
