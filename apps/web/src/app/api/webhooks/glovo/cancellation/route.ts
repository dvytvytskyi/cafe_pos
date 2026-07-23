import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const event = await req.json();
    console.log('Received Glovo Order Cancellation:', event);

    // TODO: Update order status to CANCELLED in DB
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Glovo Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
