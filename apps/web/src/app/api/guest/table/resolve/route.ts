import { guestOrderService } from '@/services/guest-order.service';
import { validateLocationId, validateTableParam } from '@/lib/guest-validation';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = validateLocationId(searchParams.get('locationId'));
    const tableParam = validateTableParam(searchParams.get('table'));
    if (!tableParam) {
      return guestJson({ error: 'table query parameter is required' }, { status: 400 }, req);
    }
    const table = await guestOrderService.resolveTable(locationId, tableParam);
    return guestJson(table, { status: 200 }, req);
  } catch (error) {
    return handleGuestError(error, req);
  }
}
