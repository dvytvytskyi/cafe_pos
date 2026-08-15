import { guestOrderService } from '@/services/guest-order.service';
import { getGuestSessionFromRequest } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getGuestSessionFromRequest(req);
    const order = await guestOrderService.getOrder(id, session?.sub);
    return guestJson(order, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
