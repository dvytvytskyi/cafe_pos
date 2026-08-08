import { NextResponse } from 'next/server';
import { posSettingsRepository } from '@/repositories/pos-settings.repository';
import { PosSettingsValidationError } from '@/lib/pos-settings-validation';

export async function GET() {
  try {
    const settings = await posSettingsRepository.get();
    return NextResponse.json(settings, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/settings/pos error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const settings = await posSettingsRepository.save(body);
    return NextResponse.json(settings, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof PosSettingsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/settings/pos error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
