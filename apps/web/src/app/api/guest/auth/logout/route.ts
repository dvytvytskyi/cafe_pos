import { guestAuthService } from '@/services/guest-auth.service';
import { buildClearGuestSessionCookie } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function POST(req: Request) {
  try {
    await guestAuthService.logout(req);
    const response = guestJson({ ok: true }, { status: 200 }, req);
    response.headers.set('Set-Cookie', buildClearGuestSessionCookie());
    return response;
  } catch (error) {
    return handleGuestError(error, req);
  }
}
