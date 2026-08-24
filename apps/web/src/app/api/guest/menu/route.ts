import { guestMenuService } from '@/services/guest-menu.service';
import { parseGuestLocale, validateLocationId } from '@/lib/guest-validation';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = validateLocationId(searchParams.get('locationId'));
    const locale = parseGuestLocale(searchParams.get('locale'));
    const search = searchParams.get('q') || searchParams.get('search') || undefined;
    let menu = await guestMenuService.getMenu(locationId, locale, search || undefined);
    return guestJson(menu, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
