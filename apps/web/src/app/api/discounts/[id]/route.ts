import { NextResponse } from 'next/server';
import { discountRepository } from '@/repositories/discount.repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { name, value } = body;

    if (name === undefined && value === undefined) {
      return NextResponse.json({ error: 'Provide name and/or value to update' }, { status: 400 });
    }

    const updated = await discountRepository.updateDiscountPreset(id, { name, value });
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating discount preset:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await discountRepository.deleteDiscountPreset(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting discount preset:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
