import { NextResponse } from 'next/server';
import { shiftRepository } from '@/repositories/shift.repository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const activeOnly = searchParams.get('active') === 'true';

    if (!locationId) {
      return NextResponse.json({ error: 'Missing required query parameter: locationId' }, { status: 400 });
    }

    if (activeOnly) {
      const activeShift = await shiftRepository.findActiveShift(locationId);
      return NextResponse.json(activeShift || null, { status: 200 });
    }

    const shifts = await shiftRepository.findAll(locationId);
    return NextResponse.json(shifts, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching cash shifts:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId, userId, floatStart } = body;

    if (!locationId || !userId || floatStart === undefined) {
      return NextResponse.json({ error: 'Missing required fields: locationId, userId, and floatStart are required' }, { status: 400 });
    }

    const openShift = await shiftRepository.openShift(locationId, userId, floatStart);
    return NextResponse.json(openShift, { status: 200 });

  } catch (error: any) {
    console.error('Error opening cash shift:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
