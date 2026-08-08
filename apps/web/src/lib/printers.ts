import type { PrinterType } from './printer-validation.ts';

export type Printer = {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  type: PrinterType;
  locationId: string;
};

export class PrinterApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PrinterApiError';
    this.status = status;
  }
}

export async function getPrintersAsync(locationId = 'default'): Promise<Printer[]> {
  const res = await fetch(`/api/printers?locationId=${encodeURIComponent(locationId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PrinterApiError(body.error ?? 'Failed to load printers', res.status);
  }
  return res.json();
}

export async function createPrinterAsync(input: Omit<Printer, 'id'>): Promise<Printer> {
  const res = await fetch('/api/printers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new PrinterApiError(body.error ?? 'Failed to create printer', res.status);
  return body;
}

export async function updatePrinterAsync(id: string, patch: Partial<Omit<Printer, 'id'>>): Promise<Printer> {
  const res = await fetch(`/api/printers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new PrinterApiError(body.error ?? 'Failed to update printer', res.status);
  return body;
}

export async function deletePrinterAsync(id: string): Promise<void> {
  const res = await fetch(`/api/printers/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PrinterApiError(body.error ?? 'Failed to delete printer', res.status);
  }
}

export async function testPrintAsync(ipAddress: string, port?: number): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/printers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: ipAddress, port }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PrinterApiError(body.error ?? 'Test print failed', res.status);
  }
  return body;
}

/** Default receipt/kitchen printer IP from DB (replaces localStorage fallback). */
export async function getDefaultReceiptPrinterIpAsync(locationId = 'default'): Promise<string | null> {
  try {
    const printers = await getPrintersAsync(locationId);
    const preferred =
      printers.find((p) => p.type === 'receipt') ||
      printers.find((p) => p.type === 'kitchen') ||
      printers[0];
    return preferred?.ipAddress ?? null;
  } catch {
    return null;
  }
}
