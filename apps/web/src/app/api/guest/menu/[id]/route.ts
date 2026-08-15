import { guestMenuService } from '@/services/guest-menu.service';
import { parseGuestLocale, validateLocationId } from '@/lib/guest-validation';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const locationId = validateLocationId(searchParams.get('locationId'));
    const locale = parseGuestLocale(searchParams.get('locale'));
    const item = await guestMenuService.getMenuItem(id, locationId, locale);
    if (!item) return guestJson({ error: 'Not found' }, { status: 404 }, req);
    return guestJson(item, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
