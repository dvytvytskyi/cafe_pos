import { NextResponse } from 'next/server';
import { queue } from '@/lib/queue';
import { createHmac } from 'crypto';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-glovo-signature') || '';
    const secret = process.env.GLOVO_WEBHOOK_SIGNING_KEY || 'corgi_glovo_secret_key_123';

    // Verify HMAC-SHA256 signature
    const computedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (computedSignature !== signature) {
      console.warn('Unauthorized Glovo Webhook attempt: signature mismatch');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    console.log('Received verified Glovo Order Dispatch:', event);

    // Publish to BullMQ for asynchronous background execution
    await queue.publish('glovo:order_dispatched', event);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Glovo Webhook Dispatch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
