import assert from 'assert';

interface SyncRecord {
  id: string;
  updatedAt: string; // ISO String timestamp
  value: string;
}

function resolveConflict(server: SyncRecord, client: SyncRecord): SyncRecord {
  const serverTime = new Date(server.updatedAt).getTime();
  const clientTime = new Date(client.updatedAt).getTime();

  // If client clock is skewed more than 5 minutes in the future relative to server, normalize it
  const maxAllowedTime = Date.now() + 5 * 60 * 1000;
  if (clientTime > maxAllowedTime) {
    client.updatedAt = new Date().toISOString();
  }

  // Last-Write-Wins
  const finalClientTime = new Date(client.updatedAt).getTime();
  if (finalClientTime > serverTime) {
    return client;
  }
  return server;
}

export async function run() {
  console.log('Running test-unit-offline-sync...');

  const baseTime = Date.now() - 10000; // 10 seconds ago

  const serverRecord: SyncRecord = {
    id: 'rec-1',
    updatedAt: new Date(baseTime).toISOString(),
    value: 'Server state'
  };

  // 1. Client wins (newer timestamp)
  const clientRecordWinner: SyncRecord = {
    id: 'rec-1',
    updatedAt: new Date(baseTime + 2000).toISOString(), // 2 seconds newer than server
    value: 'Client newer state'
  };
  const res1 = resolveConflict({ ...serverRecord }, { ...clientRecordWinner });
  assert.strictEqual(res1.value, 'Client newer state', 'Newer client record must win conflict resolution');

  // 2. Server wins (older client timestamp)
  const clientRecordLoser: SyncRecord = {
    id: 'rec-1',
    updatedAt: new Date(baseTime - 2000).toISOString(), // 2 seconds older than server
    value: 'Client older state'
  };
  const res2 = resolveConflict({ ...serverRecord }, { ...clientRecordLoser });
  assert.strictEqual(res2.value, 'Server state', 'Newer server record must win conflict resolution');

  // 3. Client clock skew normalization
  const skewedClientRecord: SyncRecord = {
    id: 'rec-1',
    updatedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes in the future
    value: 'Client skewed state'
  };
  const res3 = resolveConflict({ ...serverRecord }, { ...skewedClientRecord });
  assert.ok(
    new Date(res3.updatedAt).getTime() <= Date.now() + 1000,
    'Skewed future timestamps must be normalized to current server epoch'
  );

  console.log('✅ test-unit-offline-sync passed.');
}
