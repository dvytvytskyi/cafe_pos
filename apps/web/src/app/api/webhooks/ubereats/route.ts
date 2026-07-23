import { NextResponse } from 'next/server';
import { getUberOrderDetails } from '@/lib/uber/orders';

export async function POST(req: Request) {
  try {
    const event = await req.json();
    console.log('Received Uber Eats Webhook:', event);

    // According to Uber Eats API docs, the event contains an event_type and resource_href
    if (event.event_type === 'orders.notification') {
      // The event typically has meta details, and the order_id can be extracted.
      // E.g. event.meta.resource_id or event.resource_href
      const orderId = event.meta?.resource_id || event.resource_href?.split('/').pop();
      
      if (orderId) {
        console.log(`Fetching details for Uber Eats order: ${orderId}`);
        // Fetch the full order details from Uber
        const orderDetails = await getUberOrderDetails(orderId);
        
        console.log('Full Order Details:', JSON.stringify(orderDetails, null, 2));
        
        // TODO: Save to database or push to UI via WebSockets/SSE
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
