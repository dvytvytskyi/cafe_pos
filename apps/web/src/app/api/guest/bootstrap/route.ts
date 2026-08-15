import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  GUEST_SUPPORTED_LOCALES,
  DEFAULT_GUEST_LOCALE,
} from '@/lib/guest-constants';
import {
  parseGuestLocale,
  validateLocationId,
  validateTableParam,
  normalizeTableId,
} from '@/lib/guest-validation';
import { guestJson, handleGuestError, guestOptions } from '@/lib/guest-api';

export async function OPTIONS(req: Request) {
  return guestOptions(req);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = validateLocationId(searchParams.get('locationId'));
    const tableParam = validateTableParam(searchParams.get('table'));
    const locale = parseGuestLocale(searchParams.get('locale'));

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    const locationName = location?.name ?? 'Corgi Cafe';

    let tableId: string | undefined;
    let tableNumber: string | undefined;
    if (tableParam) {
      const normalized = normalizeTableId(tableParam);
      const table = await prisma.table.findFirst({
        where: {
          locationId,
          OR: [{ id: normalized }, { id: tableParam }, { number: tableParam.replace(/^[Tt]/, '') }],
        },
      });
      if (table) {
        tableId = table.id;
        tableNumber = table.number;
      }
    }

    return guestJson(
      {
        locationId,
        locationName,
        tableId,
        tableNumber,
        locale,
        supportedLocales: GUEST_SUPPORTED_LOCALES,
        features: { menu: true, merch: true, loyalty: true, orders: true },
        branding: { name: 'Corgi Cafe', themeColor: '#87B031' },
      },
      { status: 200 },
      req
    );
  } catch (error) {
    return handleGuestError(error, req);
  }
}
