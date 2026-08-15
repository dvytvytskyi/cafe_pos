import { NextResponse } from 'next/server';
import { notificationSettingsRepository } from '@/repositories/notification-settings.repository';
import { NotificationSettingsValidationError } from '@/lib/notification-settings-validation';

export async function GET() {
  try {
    const settings = await notificationSettingsRepository.get();
    return NextResponse.json(settings, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/settings/notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const settings = await notificationSettingsRepository.save(body);
    return NextResponse.json(settings, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof NotificationSettingsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/settings/notifications error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
