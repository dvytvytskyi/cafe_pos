import { NextResponse } from 'next/server';
import { giftCardRepository } from '@/repositories/giftcard.repository';
import { GiftCardValidationError, validateStatusPatch } from '@/lib/gift-card-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const status = validateStatusPatch(body.status);
    const updated = await giftCardRepository.setStatus(id, status);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof GiftCardValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/giftcards/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
