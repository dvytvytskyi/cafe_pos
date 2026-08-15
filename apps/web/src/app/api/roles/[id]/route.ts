import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body.permissions === undefined) {
      return NextResponse.json({ error: 'permissions field is required' }, { status: 400 });
    }

    const role = await prisma.role.update({
      where: { id },
      data: { permissions: body.permissions },
      select: { id: true, name: true, permissions: true },
    });

    return NextResponse.json(role, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/roles/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
