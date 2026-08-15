import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { filterByLocationScope, getAccessibleLocationIds } from '@/lib/location-scope';

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, address: true },
    });

    if (!session) {
      return NextResponse.json(locations, { status: 200 });
    }

    const access = getAccessibleLocationIds(session);
    const scoped = filterByLocationScope(
      locations,
      (loc) => loc.id,
      access
    );

    return NextResponse.json(scoped, { status: 200 });
  } catch (error) {
    console.error('GET /api/locations error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
