import { guestAuthService } from '@/services/guest-auth.service';
import { buildGuestSessionCookie } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = await guestAuthService.verifyOtpAndLogin(body.phone, body.code);
    const response = guestJson({ ok: true, token }, { status: 200 }, req);
    response.headers.set('Set-Cookie', buildGuestSessionCookie(token));
    return response;
  } catch (error) {
    return handleGuestError(error, req);
  }
}
