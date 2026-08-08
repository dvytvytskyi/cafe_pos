/**
 * Module 25 — POS settings integration (T25.2 cache invalidate)
 */
import { cache } from './cache/index.ts';
import { POS_SETTINGS_CACHE_KEY, DEFAULT_POS_SETTINGS } from './pos-settings.ts';

const BASE = 'http://localhost:3000';

async function main() {
  console.log('--- Module 25 POS Settings Integration Tests ---');

  await fetch(`${BASE}/api/settings/pos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency: 'EUR', language: 'en' }),
  });

  const stale = { ...DEFAULT_POS_SETTINGS, currency: 'GBP' };
  await cache.set(POS_SETTINGS_CACHE_KEY, stale);

  const cachedBefore = await cache.get<{ currency: string }>(POS_SETTINGS_CACHE_KEY);
  if (cachedBefore?.currency !== 'GBP') {
    console.error('❌ stale cache not seeded');
    process.exit(1);
  }

  const putRes = await fetch(`${BASE}/api/settings/pos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency: 'USD' }),
  });
  const body = await putRes.json();
  if (putRes.status !== 200 || body.currency !== 'USD') {
    console.error('❌ PUT pos settings failed', putRes.status, body);
    process.exit(1);
  }
  console.log('✅ PUT /api/settings/pos → 200');

  const cachedAfterPut = await cache.get(POS_SETTINGS_CACHE_KEY);
  if (cachedAfterPut !== null) {
    console.error('❌ cache should be invalidated after PUT, got', cachedAfterPut);
    process.exit(1);
  }
  console.log('✅ T25.2 Redis cache invalidated on save');

  const getRes = await fetch(`${BASE}/api/settings/pos`);
  const fresh = await getRes.json();
  if (getRes.status !== 200 || fresh.currency !== 'USD') {
    console.error('❌ GET after save failed', getRes.status, fresh);
    process.exit(1);
  }
  console.log('✅ GET returns updated currency');

  const invalid = await fetch(`${BASE}/api/settings/pos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency: 'NOTREAL' }),
  });
  if (invalid.status !== 400) {
    console.error('❌ invalid currency expected 400, got', invalid.status);
    process.exit(1);
  }
  console.log('✅ invalid currency → 400');

  await fetch(`${BASE}/api/settings/pos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency: 'EUR' }),
  });

  console.log('--- Module 25 POS Settings Integration Tests Passed ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
