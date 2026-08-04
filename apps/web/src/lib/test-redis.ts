import { cache } from './cache';

async function main() {
  console.log('--- Starting Redis Cache Verification Test ---');

  try {
    const testKey = 'test:pos:config';
    const testVal = { restaurantName: 'Corgi Cafe', activeTablesCount: 15 };

    // 1. Test Set & Get
    console.log(`Writing test object to cache key: ${testKey}...`);
    await cache.set(testKey, testVal);

    console.log(`Reading back cache key: ${testKey}...`);
    const readVal = await cache.get<typeof testVal>(testKey);
    console.log('Retrieved value:', readVal);

    if (readVal && readVal.restaurantName === testVal.restaurantName && readVal.activeTablesCount === testVal.activeTablesCount) {
      console.log('✅ Success: Write and read match successfully!');
    } else {
      console.error('❌ ERROR: Retrieved value does not match written value!');
      process.exit(1);
    }

    // 2. Test TTL expiration
    const ttlKey = 'test:pos:ttl';
    console.log(`Writing TTL-limited key (expiration = 2 seconds): ${ttlKey}...`);
    await cache.set(ttlKey, 'temporary_session', 2);

    console.log('Verifying key is present immediately...');
    const immediateVal = await cache.get(ttlKey);
    if (immediateVal === 'temporary_session') {
      console.log('✅ Success: Key exists before expiration.');
    } else {
      console.error('❌ ERROR: Key is missing immediately after writing!');
      process.exit(1);
    }

    console.log('Waiting 3 seconds for key to expire...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('Verifying key is gone after expiration...');
    const expiredVal = await cache.get(ttlKey);
    if (expiredVal === null) {
      console.log('✅ Success: Key successfully expired and was deleted by Redis!');
    } else {
      console.error('❌ ERROR: Key still exists after expiration time!', expiredVal);
      process.exit(1);
    }

    // 3. Test Prefix Clearing
    const prefix1 = 'test:clear:one';
    const prefix2 = 'test:clear:two';
    const otherKey = 'test:keep:three';

    console.log('Writing keys for prefix clear test...');
    await cache.set(prefix1, 'val1');
    await cache.set(prefix2, 'val2');
    await cache.set(otherKey, 'val3');

    console.log('Clearing cache matching prefix "test:clear:"...');
    await cache.clear('test:clear:');

    const check1 = await cache.get(prefix1);
    const check2 = await cache.get(prefix2);
    const check3 = await cache.get(otherKey);

    if (check1 === null && check2 === null && check3 === 'val3') {
      console.log('✅ Success: Prefix clearing worked correctly (only matching keys deleted)!');
    } else {
      console.error('❌ ERROR: Prefix clear deleted wrong keys or failed to clear matched keys!', { check1, check2, check3 });
      process.exit(1);
    }

    // Clean up
    await cache.delete(testKey);
    await cache.delete(otherKey);

    console.log('--- Redis Cache Test Completed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Unexpected error during Redis cache test:', error);
    process.exit(1);
  }
}

main();
