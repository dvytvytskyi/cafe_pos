import { NextResponse } from 'next/server';
import {
  boardSettingsRepository,
  BoardValidationError,
} from '@/repositories/board-settings.repository';
import type { BoardType } from '@/lib/board-settings';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';

const VALID_TYPES: BoardType[] = ['orders', 'tasks'];

function parseType(raw: string | null): BoardType | null {
  if (raw === 'orders' || raw === 'tasks') return raw;
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = parseType(searchParams.get('type'));
    const locationId = searchParams.get('locationId') ?? DEFAULT_LOCATION_ID;

    if (!type) {
      return NextResponse.json(
        { error: 'Invalid or missing type. Expected orders or tasks.' },
        { status: 400 }
      );
    }

    const stages = await boardSettingsRepository.get(type, locationId);
    return NextResponse.json({ type, locationId, stages }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching board settings:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = parseType(searchParams.get('type'));
    const locationId = searchParams.get('locationId') ?? DEFAULT_LOCATION_ID;

    if (!type) {
      return NextResponse.json(
        { error: 'Invalid or missing type. Expected orders or tasks.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { stages } = body;

    if (!Array.isArray(stages)) {
      return NextResponse.json({ error: 'stages array is required' }, { status: 400 });
    }

    const saved = await boardSettingsRepository.save(type, stages, locationId);
    return NextResponse.json({ type, locationId, stages: saved }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof BoardValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving board settings:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
