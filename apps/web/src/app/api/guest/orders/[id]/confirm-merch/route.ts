import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-session';
import { guestMerchService } from '@/services/guest-merch.service';
import { guestJson, handleGuestError } from '@/lib/guest-api';

/** Staff endpoint: confirm merch pickup and deduct inventory */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = requireAuth(req);
    const { id } = await params;
    await guestMerchService.confirmMerchSale(id, session.sub);
    return NextResponse.json({ ok: true, orderId: id });
  } catch (error) {
    return handleGuestError(error, req);
  }
}
