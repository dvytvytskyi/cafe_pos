/**
 * Module 35 — Auth session integration (T35.3–T35.7)
 */
import { cache } from './cache/index.ts';
import { disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';
const CLIENT_IP = '127.0.0.1';

function hashPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

function extractSessionCookie(setCookie: string | null): string {
  if (!setCookie) throw new Error('Missing Set-Cookie header');
  return setCookie.split(';')[0]!;
}

async function main() {
  console.log('--- Module 35 Auth Session Integration Tests ---');

  await cache.delete(`auth:pin-fail:${CLIENT_IP}`);

  // T35.6 — no cookie → 401
  const noSession = await fetch(`${BASE}/api/auth/session`);
  if (noSession.status !== 401) {
    console.error('❌ T35.6 expected 401 without cookie, got', noSession.status);
    process.exit(1);
  }
  console.log('✅ T35.6 protected session route without cookie → 401');

  // T35.3 — valid PIN → JWT cookie 12h
  const goodLogin = await fetch(`${BASE}/api/auth/login-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': CLIENT_IP },
    body: JSON.stringify({ pin: '1234' }),
  });
  const goodBody = await goodLogin.json();
  const cookie = extractSessionCookie(goodLogin.headers.get('set-cookie'));
  if (goodLogin.status !== 200 || !goodBody.success || !cookie.startsWith('corgi_session=')) {
    console.error('❌ T35.3 login failed', goodLogin.status, goodBody, cookie);
    process.exit(1);
  }

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  const sessionBody = await sessionRes.json();
  if (sessionRes.status !== 200 || !sessionBody.authenticated) {
    console.error('❌ T35.3 session check failed', sessionRes.status, sessionBody);
    process.exit(1);
  }
  console.log('✅ T35.3 valid PIN → JWT cookie + session');

  // T35.1 via API — letters stripped
  await cache.delete(`auth:pin-fail:${CLIENT_IP}`);
  const normalizedLogin = await fetch(`${BASE}/api/auth/login-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': CLIENT_IP },
    body: JSON.stringify({ pin: '12ab34' }),
  });
  if (normalizedLogin.status !== 200) {
    console.error('❌ T35.1 letters ignored login failed', normalizedLogin.status);
    process.exit(1);
  }
  console.log('✅ T35.1 PIN letters ignored → 1234 accepted');

  // T35.4 — invalid PIN → 401
  await cache.delete(`auth:pin-fail:${CLIENT_IP}`);
  const badLogin = await fetch(`${BASE}/api/auth/login-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': CLIENT_IP },
    body: JSON.stringify({ pin: '0000' }),
  });
  if (badLogin.status !== 401) {
    console.error('❌ T35.4 expected 401, got', badLogin.status);
    process.exit(1);
  }
  console.log('✅ T35.4 invalid PIN → 401');

  // T35.5 — 5 failures → 429
  await cache.delete(`auth:pin-fail:${CLIENT_IP}`);
  for (let i = 0; i < 5; i++) {
    await fetch(`${BASE}/api/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': CLIENT_IP },
      body: JSON.stringify({ pin: '0000' }),
    });
  }
  const locked = await fetch(`${BASE}/api/auth/login-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': CLIENT_IP },
    body: JSON.stringify({ pin: '0000' }),
  });
  const lockedBody = await locked.json();
  if (locked.status !== 429 || lockedBody.code !== 'TOO_MANY_FAILED_ATTEMPTS') {
    console.error('❌ T35.5 expected 429 TOO_MANY_FAILED_ATTEMPTS, got', locked.status, lockedBody);
    process.exit(1);
  }
  console.log('✅ T35.5 rate limit after 5 failures → 429');

  await cache.delete(`auth:pin-fail:${CLIENT_IP}`);

  // T35.7 — waiter → 403 on admin staff POST
  const waiterLogin = await fetch(`${BASE}/api/auth/login-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': CLIENT_IP },
    body: JSON.stringify({ pin: '1234' }),
  });
  const waiterCookie = extractSessionCookie(waiterLogin.headers.get('set-cookie'));

  const forbidden = await fetch(`${BASE}/api/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: waiterCookie,
    },
    body: JSON.stringify({
      name: 'Blocked User',
      pin: '4455',
      roleId: 'role-default-waiter',
      locationIds: ['default'],
    }),
  });
  if (forbidden.status !== 403) {
    console.error('❌ T35.7 waiter POST staff expected 403, got', forbidden.status);
    process.exit(1);
  }
  console.log('✅ T35.7 waiter role → 403 on admin staff API');

  console.log('--- Module 35 Auth Session Integration Tests Passed ---');
  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
