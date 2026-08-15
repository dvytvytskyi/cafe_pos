import { guestOrderService } from '@/services/guest-order.service';
import { requireGuestSessionAsync } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function POST(req: Request) {
  try {
    const session = await requireGuestSessionAsync(req);
    const body = await req.json();
    const order = await guestOrderService.createMerchPickupOrder(body, session.sub);
    return guestJson(order, { status: 201 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
