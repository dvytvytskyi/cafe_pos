import { NextResponse } from 'next/server';
import { waiterSalesService } from '@/services/waiter-sales.service';
import { getSessionFromRequest } from '@/lib/auth';
import { resolveScopedLocationId } from '@/lib/location-scope';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = getSessionFromRequest(req);
    const locationId = session
      ? resolveScopedLocationId(session, searchParams.get('locationId') || 'default', 'default')
      : searchParams.get('locationId') || 'default';

    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    const staffId = searchParams.get('staffId') || undefined;
    const startDate = start ? new Date(start) : new Date(new Date().setHours(0, 0, 0, 0));
    const endDate = end ? new Date(end) : new Date();

    const data = await waiterSalesService.getReport({
      locationId,
      startDate,
      endDate,
      staffId,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Report failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
