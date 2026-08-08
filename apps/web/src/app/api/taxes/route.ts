import { NextResponse } from 'next/server';
import { taxRepository } from '@/repositories/tax.repository';
import { TaxValidationError } from '@/lib/tax-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') ?? 'default';
    const rates = await taxRepository.getCached(locationId);
    return NextResponse.json(rates, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/taxes error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const locationId = typeof body.locationId === 'string' ? body.locationId : 'default';
    const rates = Array.isArray(body.rates) ? body.rates : [];
    if (rates.length === 0) {
      return NextResponse.json({ error: 'rates array is required' }, { status: 400 });
    }
    const saved = await taxRepository.saveRates(rates, locationId);
    return NextResponse.json(saved, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TaxValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/taxes error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
