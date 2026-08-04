import { NextResponse } from 'next/server';
import { giftCardRepository } from '@/repositories/giftcard.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, amount } = body;

    if (!code || amount === undefined || amount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid required fields: code and amount are required' }, { status: 400 });
    }

    const updatedCard = await giftCardRepository.redeemCard(code, amount);

    return NextResponse.json({
      success: true,
      remainingBalance: updatedCard.balance,
      card: updatedCard,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error redeeming gift card:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
