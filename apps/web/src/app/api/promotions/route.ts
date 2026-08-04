import { NextResponse } from 'next/server';
import { discountRepository } from '@/repositories/discount.repository';

export async function GET() {
  try {
    const promos = await discountRepository.getPromotions();
    return NextResponse.json(promos, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, discountPercent, activeDays, startHour, endHour, targetItems } = body;

    if (!name || discountPercent === undefined || !activeDays || startHour === undefined || endHour === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const createdPromo = await discountRepository.createPromotion({
      name,
      discountPercent,
      activeDays,
      startHour,
      endHour,
      targetItems,
    });

    return NextResponse.json(createdPromo, { status: 201 });

  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
