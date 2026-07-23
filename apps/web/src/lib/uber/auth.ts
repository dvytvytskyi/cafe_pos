export async function getUberAccessToken() {
  const clientId = process.env.UBER_CLIENT_ID;
  const clientSecret = process.env.UBER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Uber credentials in environment variables.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.order'
  });

  const res = await fetch('https://login.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Uber Auth Error:', errorBody);
    throw new Error('Failed to authenticate with Uber API');
  }

  const data = await res.json();
  return data.access_token;
}
