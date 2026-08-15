import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/profile-password';
import { requirePermission } from '@/lib/auth';

function authErrorResponse(authErr: unknown) {
  const status = (authErr as Error & { status?: number }).status ?? 401;
  return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Unauthorized' }, { status });
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    try {
      requirePermission(req, 'staff', 'edit');
    } catch (authErr: unknown) {
      return authErrorResponse(authErr);
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashPassword(tempPassword) },
    });

    const origin = new URL(req.url).origin;
    const resetLink = `${origin}/login?reset=${id}`;

    return NextResponse.json(
      {
        tempPassword,
        resetLink,
        message: 'Temporary password generated. Share securely with the team member.',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/staff/[id]/reset-password error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
