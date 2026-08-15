import { guestAuthService } from '@/services/guest-auth.service';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';
import { assertGuestRateLimit, guestRateLimitKey } from '@/lib/guest-rate-limit';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function POST(req: Request) {
  try {
    await assertGuestRateLimit(guestRateLimitKey(req, 'otp-request'), 5, 300);
    const body = await req.json();
    const result = await guestAuthService.requestOtp(body.phone);
    return guestJson(result, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
