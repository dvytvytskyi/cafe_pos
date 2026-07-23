import * as fs from 'fs';

// simple script to parse .env since dotenv is missing
const env = fs.readFileSync('.env', 'utf-8');
const clientId = env.split('\n').find(l => l.startsWith('UBER_CLIENT_ID='))?.split('=')[1].trim();
const clientSecret = env.split('\n').find(l => l.startsWith('UBER_CLIENT_SECRET='))?.split('=')[1].trim();

async function testAuth() {
  console.log('Client ID:', clientId);
  const params = new URLSearchParams({
    client_id: clientId || '',
    client_secret: clientSecret || '',
    grant_type: 'client_credentials',
    scope: 'eats.order'
  });

  const res = await fetch('https://login.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    console.error('Failed to authenticate:', await res.text());
  } else {
    const data = await res.json();
    console.log('✅ SUCCESS! Got token:', data.access_token.substring(0, 15) + '...');
  }
}

testAuth();
