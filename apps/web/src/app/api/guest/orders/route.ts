import { guestOrderService } from '@/services/guest-order.service';
import { requireGuestSessionAsync, getGuestSessionFromRequest } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';
import { assertGuestRateLimit, guestRateLimitKey } from '@/lib/guest-rate-limit';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const session = await requireGuestSessionAsync(req);
    const orders = await guestOrderService.listOrders(session.sub);
    return guestJson({ orders }, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}

export async function POST(req: Request) {
  try {
    await assertGuestRateLimit(guestRateLimitKey(req, 'create-order'), 20, 3600);
    const session = await getGuestSessionFromRequest(req);
    const body = await req.json();
    const order = await guestOrderService.createFoodOrder(body, session?.sub);
    return guestJson(order, { status: 201 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
