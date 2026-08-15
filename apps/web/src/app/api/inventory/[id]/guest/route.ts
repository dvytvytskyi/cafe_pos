import { NextResponse } from 'next/server';
import { inventoryRepository } from '@/repositories/inventory.repository';
import { InventoryValidationError } from '@/lib/inventory-validation';

type RouteParams = { params: Promise<{ id: string }> };

/** Staff/admin: toggle guest shop visibility and guest-facing copy for merch items */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await inventoryRepository.patchGuestMerchSettings(id, {
      guestVisible: typeof body.guestVisible === 'boolean' ? body.guestVisible : undefined,
      guestImageUrl: body.guestImageUrl,
      guestDescription: body.guestDescription,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
