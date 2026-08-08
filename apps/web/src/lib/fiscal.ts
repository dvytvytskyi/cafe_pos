export interface RefundItemPayload {
  itemIndex: number;
  quantity: number;
}

export interface RefundPayload {
  items: RefundItemPayload[];
  reason: string;
  method?: 'cash' | 'card';
}

export interface FiscalClientPayload {
  clientName?: string;
  clientNif?: string;
  clientAddress?: string;
}

export async function refundOrderAsync(orderId: string, payload: RefundPayload) {
  const res = await fetch(`/api/orders/${orderId}/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Refund failed');
  }
  return res.json();
}

export async function generateFiscalAsync(orderId: string, client?: FiscalClientPayload) {
  const res = await fetch(`/api/orders/${orderId}/fiscal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(client || {}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Fiscal generation failed');
  }
  return res.json();
}

export async function printOrderReceiptAsync(orderId: string, ip: string, type: 'receipt' | 'kitchen' = 'receipt') {
  const res = await fetch('/api/printers/receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, orderId, type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || 'Print failed');
  }
  return res.json();
}

/** @deprecated Use getDefaultReceiptPrinterIpAsync from @/lib/printers */
export function getPrinterIp(): string | null {
  if (typeof window === 'undefined') return null;
  return null;
}
