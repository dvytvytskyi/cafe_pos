import { NextResponse } from 'next/server';
import { tableRepository } from '@/repositories/table.repository';
import { LayoutValidationError } from '@/lib/tables-validation';
import { getSessionFromRequest } from '@/lib/auth';
import { assertLocationAccess } from '@/lib/location-scope';
import { apiErrorResponse } from '@/lib/api-route-errors';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionFromRequest(req);
    if (session) {
      assertLocationAccess(session, id);
    }
    const rooms = await tableRepository.getRoomLayouts(id);
    return NextResponse.json(rooms, { status: 200 });
  } catch (error: unknown) {
    return apiErrorResponse(error, { logLabel: `Error fetching room layouts for location [${req.url}]:` });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionFromRequest(req);
    if (session) {
      assertLocationAccess(session, id);
    }
    const body = await req.json();
    const { rooms } = body;

    if (!rooms || !Array.isArray(rooms)) {
      return NextResponse.json({ error: 'Missing required field: rooms array is required.' }, { status: 400 });
    }

    await tableRepository.saveRoomLayouts(id, rooms);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof LayoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error, { logLabel: 'Error saving room layouts:' });
  }
}
