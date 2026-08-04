import { NextResponse } from 'next/server';
import { crmRepository } from '@/repositories/crm.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, amountPaid, pointsSpent, orderId } = body;

    if (!customerId || amountPaid === undefined || pointsSpent === undefined) {
      return NextResponse.json({ error: 'Missing required fields: customerId, amountPaid, and pointsSpent are required' }, { status: 400 });
    }

    const updatedCustomer = await crmRepository.applyLoyaltyTransaction(
      customerId,
      amountPaid,
      pointsSpent,
      orderId
    );

    return NextResponse.json(updatedCustomer, { status: 200 });

  } catch (error: any) {
    console.error('Error applying loyalty points transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
