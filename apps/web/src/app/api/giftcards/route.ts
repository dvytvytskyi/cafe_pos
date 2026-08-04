import { NextResponse } from 'next/server';
import { giftCardRepository } from '@/repositories/giftcard.repository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (code) {
      const card = await giftCardRepository.findCardByCode(code);
      if (!card) {
        return NextResponse.json({ error: 'Gift Card not found' }, { status: 404 });
      }
      return NextResponse.json(card, { status: 200 });
    }

    const cards = await giftCardRepository.getGiftCards();
    return NextResponse.json(cards, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching gift cards:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { initialBalance, customerId } = body;

    if (initialBalance === undefined || initialBalance <= 0) {
      return NextResponse.json({ error: 'Missing or invalid required field: initialBalance' }, { status: 400 });
    }

    const createdCard = await giftCardRepository.createGiftCard(initialBalance, customerId);
    return NextResponse.json(createdCard, { status: 201 });

  } catch (error: any) {
    console.error('Error creating gift card:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
