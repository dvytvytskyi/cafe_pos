import { NextResponse } from 'next/server';
import { discountRepository } from '@/repositories/discount.repository';

type RouteContext = { params: Promise<{ id: string }> };

function mapPreset(preset: { id: string; name: string; value: number; colorTag?: string | null }) {
  return {
    id: preset.id,
    name: preset.name,
    value: preset.value,
    color: preset.colorTag ?? 'bg-gray-100 text-gray-700',
  };
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { name, value, color } = body;

    if (name === undefined && value === undefined && color === undefined) {
      return NextResponse.json({ error: 'Provide name, value, and/or color to update' }, { status: 400 });
    }

    const updated = await discountRepository.updateDiscountPreset(id, {
      name,
      value,
      colorTag: color,
    });
    return NextResponse.json(mapPreset(updated), { status: 200 });
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
