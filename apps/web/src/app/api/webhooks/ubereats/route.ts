import { NextResponse } from 'next/server';
import { queue } from '@/lib/queue';
import { createHmac } from 'crypto';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-uber-signature') || '';
    const secret = process.env.UBER_WEBHOOK_SIGNING_KEY || '01ebd1d7ed8a79053780b7acbfac917ddf9cf861fb6b76e692d86d9ebe9cafe4';

    // Verify HMAC-SHA256 signature
    const computedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (computedSignature !== signature) {
      console.warn('Unauthorized Uber Webhook attempt: signature mismatch');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    console.log('Received verified Uber Eats Webhook:', event.event_type);

    if (event.event_type === 'orders.notification') {
      const orderId = event.meta?.resource_id || event.resource_href?.split('/').pop();
      if (orderId) {
        // Publish to BullMQ for asynchronous background execution
        await queue.publish('ubereats:order_received', { orderId, event });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error handling Uber Eats webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
