import { NextResponse } from 'next/server';
import { calculateReceiptTaxes, taxRatesToMap as calcMapFromRows } from '@/lib/tax-calc';
import { taxRepository } from '@/repositories/tax.repository';
import { TaxValidationError } from '@/lib/tax-validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const locationId = typeof body.locationId === 'string' ? body.locationId : 'default';
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    const rows = await taxRepository.getCached(locationId);
    const rates = calcMapFromRows(rows);
    const breakdown = calculateReceiptTaxes(
      items.map((item: { name?: string; price?: number; quantity?: number; taxSlug?: string }) => ({
        name: String(item.name ?? ''),
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        taxSlug: item.taxSlug,
      })),
      rates
    );

    return NextResponse.json({ rates, breakdown }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TaxValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/taxes/calculate error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
