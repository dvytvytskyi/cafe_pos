import { NextResponse } from 'next/server';
import { shiftRepository } from '@/repositories/shift.repository';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { actualCash } = body;

    if (actualCash === undefined) {
      return NextResponse.json({ error: 'Missing required field: actualCash' }, { status: 400 });
    }

    const closedShift = await shiftRepository.closeShift(id, actualCash);
    return NextResponse.json(closedShift, { status: 200 });

  } catch (error: any) {
    console.error(`Error closing shift [${req.url}]:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
