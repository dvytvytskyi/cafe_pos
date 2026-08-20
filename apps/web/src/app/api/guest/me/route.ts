import { guestAuthService } from '@/services/guest-auth.service';
import { requireGuestSessionAsync } from '@/lib/guest-session';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const session = await requireGuestSessionAsync(req);
    const profile = await guestAuthService.getProfile(session.sub);
    return guestJson(profile, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireGuestSessionAsync(req);
    const body = await req.json();
    const updated = await guestAuthService.updateProfile(session.sub, {
      name: typeof body.name === 'string' ? body.name : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      allergyNotes: typeof body.allergyNotes === 'string' ? body.allergyNotes : undefined,
    });
    return guestJson(updated, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
