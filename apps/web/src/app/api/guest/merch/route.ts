import { guestMerchService } from '@/services/guest-merch.service';
import { validateLocationId } from '@/lib/guest-validation';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = validateLocationId(searchParams.get('locationId'));
    const items = await guestMerchService.getCatalog(locationId);
    return guestJson({ items }, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
