import { NextResponse } from 'next/server';
import { discountRepository } from '@/repositories/discount.repository';

function mapPreset(preset: { id: string; name: string; value: number; colorTag?: string | null }) {
  return {
    id: preset.id,
    name: preset.name,
    value: preset.value,
    color: preset.colorTag ?? 'bg-gray-100 text-gray-700',
  };
}

export async function GET() {
  try {
    const presets = await discountRepository.getDiscountPresets();
    return NextResponse.json(presets.map(mapPreset), { status: 200 });
  } catch (error: any) {
    console.error('Error fetching discount presets:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, value } = body;

    if (!name || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields: name and value are required' }, { status: 400 });
    }

    const createdPreset = await discountRepository.createDiscountPreset({ name, value });
    return NextResponse.json(mapPreset(createdPreset), { status: 201 });

  } catch (error: any) {
    console.error('Error creating discount preset:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
