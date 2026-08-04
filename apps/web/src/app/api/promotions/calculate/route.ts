import { NextResponse } from 'next/server';
import { discountRepository } from '@/repositories/discount.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, date } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required field: items must be an array' }, { status: 400 });
    }

    const calculatedDiscount = await discountRepository.calculateServerHappyHour(items, date);

    return NextResponse.json(calculatedDiscount, { status: 200 });

  } catch (error: any) {
    console.error('Error calculating happy hour promotions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
