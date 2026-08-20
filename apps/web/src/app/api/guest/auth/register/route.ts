import { guestAuthService } from '@/services/guest-auth.service';
import { buildGuestSessionCookie } from '@/lib/guest-session';
import { validateGuestRegisterInput } from '@/lib/guest-validation';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = validateGuestRegisterInput(body);
    const { token } = await guestAuthService.registerAfterOtp(body.phone, body.code, data);
    const response = guestJson({ ok: true, token }, { status: 200 }, req);
    response.headers.set('Set-Cookie', buildGuestSessionCookie(token));
    return response;
  } catch (error) {
    return handleGuestError(error, req);
  }
}
