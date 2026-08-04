import { NextResponse } from 'next/server';
import { shiftRepository } from '@/repositories/shift.repository';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { type, amount, reason } = body;

    if (!type || amount === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields: type, amount, and reason are required' }, { status: 400 });
    }

    if (type !== 'in' && type !== 'out') {
      return NextResponse.json({ error: 'Invalid adjustment type. Must be "in" or "out"' }, { status: 400 });
    }

    const updatedShift = await shiftRepository.addAdjustment(id, type, amount, reason);
    return NextResponse.json(updatedShift, { status: 200 });

  } catch (error: any) {
    console.error(`Error adding shift adjustment:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
