import { guestAuthService } from '@/services/guest-auth.service';
import { requireGuestSessionAsync } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const session = await requireGuestSessionAsync(req);
    const loyalty = await guestAuthService.getLoyalty(session.sub);
    return guestJson({ qrCode: loyalty.qrCode, customerId: session.sub }, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
