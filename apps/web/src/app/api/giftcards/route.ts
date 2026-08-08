import { NextResponse } from 'next/server';
import { giftCardRepository } from '@/repositories/giftcard.repository';
import {
  GiftCardValidationError,
  validateBatchCount,
  validateInitialBalance,
} from '@/lib/gift-card-validation';

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching gift cards:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const initialBalance = validateInitialBalance(body.initialBalance);
    const customerId = typeof body.customerId === 'string' ? body.customerId : undefined;

    if (body.count !== undefined && body.count !== null) {
      const count = validateBatchCount(body.count);
      const cards = await giftCardRepository.createGiftCardsBatch(count, initialBalance, customerId);
      return NextResponse.json(cards, { status: 201 });
    }

    const createdCard = await giftCardRepository.createGiftCard(initialBalance, customerId);
    return NextResponse.json(createdCard, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof GiftCardValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating gift card:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
