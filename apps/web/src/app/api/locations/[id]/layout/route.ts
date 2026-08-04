import { NextResponse } from 'next/server';
import { tableRepository } from '@/repositories/table.repository';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rooms = await tableRepository.getRoomLayouts(id);
    return NextResponse.json(rooms, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching room layouts for location [${req.url}]:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { rooms } = body;

    if (!rooms || !Array.isArray(rooms)) {
      return NextResponse.json({ error: 'Missing required field: rooms array is required.' }, { status: 400 });
    }

    await tableRepository.saveRoomLayouts(id, rooms);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`Error saving room layouts:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
