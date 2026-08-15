import { guestAuthService } from '@/services/guest-auth.service';
import { requireGuestSessionAsync } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const session = await requireGuestSessionAsync(req);
    const transactions = await guestAuthService.getLoyaltyTransactions(session.sub);
    return guestJson(
      transactions.map((t) => ({
        id: t.id,
        type: t.type,
        points: t.points,
        orderId: t.orderId ?? undefined,
        createdAt: t.createdAt.toISOString(),
      })),
      { status: 200 },
      req
    );
  } catch (error) {
    return handleGuestError(error, req);
  }
}
