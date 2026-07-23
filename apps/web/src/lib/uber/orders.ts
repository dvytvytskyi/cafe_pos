import { getUberAccessToken } from './auth';

export async function getUberOrderDetails(orderId: string) {
  const token = await getUberAccessToken();

  const res = await fetch(`https://api.uber.com/v1/eats/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Failed to fetch order details:', errorBody);
    throw new Error('Failed to fetch order details');
  }

  const data = await res.json();
  return data;
}
