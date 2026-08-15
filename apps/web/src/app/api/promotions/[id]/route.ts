import { NextResponse } from 'next/server';
import { discountRepository } from '@/repositories/discount.repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { name, discountPercent, activeDays, startHour, endHour, targetItems } = body;

    if (
      name === undefined &&
      discountPercent === undefined &&
      activeDays === undefined &&
      startHour === undefined &&
      endHour === undefined &&
      targetItems === undefined
    ) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await discountRepository.updatePromotion(id, {
      name,
      discountPercent,
      activeDays,
      startHour,
      endHour,
      targetItems,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating promotion:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await discountRepository.deletePromotion(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
