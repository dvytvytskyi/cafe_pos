import assert from 'assert';
import {
  assertLocationAccess,
  filterStaffByTeamTab,
  getAccessibleLocationIds,
  isGeneralTeamMember,
  isSuperAdmin,
  resolveScopedLocationId,
  resolveLocationIdsForAllQuery,
} from './location-scope.ts';
import type { SessionPayload } from './auth-constants.ts';

export async function run() {
  console.log('Running test-unit-location-scope...');

  const superSession: SessionPayload = {
    sub: '1',
    name: 'Admin',
    roleId: 'r1',
    roleName: 'Super Admin',
    permissions: {},
    locationIds: [],
  };

  const locSession: SessionPayload = {
    sub: '2',
    name: 'Manager',
    roleId: 'r2',
    roleName: 'Manager',
    permissions: { orders: ['view'] },
    locationIds: ['eixample', 'gothic'],
  };

  const generalSession: SessionPayload = {
    sub: '3',
    name: 'HQ',
    roleId: 'r3',
    roleName: 'Accountant',
    permissions: {},
    locationIds: [],
  };

  assert.strictEqual(isSuperAdmin('Super Admin', {}), true);
  assert.strictEqual(isSuperAdmin('Manager', { settings: ['*'] as never }), true);
  assert.strictEqual(isSuperAdmin('Manager', {}), false);

  assert.strictEqual(getAccessibleLocationIds(superSession), 'all');
  assert.strictEqual(getAccessibleLocationIds(generalSession), 'all');
  assert.deepStrictEqual(getAccessibleLocationIds(locSession), ['eixample', 'gothic']);

  assert.doesNotThrow(() => assertLocationAccess(superSession, 'all'));
  assert.throws(() => assertLocationAccess(locSession, 'all'));

  assert.strictEqual(resolveScopedLocationId(locSession, 'gracia', 'default'), 'eixample');
  assert.strictEqual(resolveScopedLocationId(superSession, 'gracia', 'default'), 'gracia');
  assert.strictEqual(resolveScopedLocationId(locSession, 'all', 'default'), 'all');
  assert.deepStrictEqual(resolveLocationIdsForAllQuery(locSession), ['eixample', 'gothic']);
  assert.strictEqual(resolveLocationIdsForAllQuery(generalSession), 'all');

  const staff = [
    { id: '1', locationIds: [] as string[] },
    { id: '2', locationIds: ['eixample'] },
    { id: '3', locationIds: ['gothic'] },
  ];
  assert.strictEqual(filterStaffByTeamTab(staff, 'general').length, 3);
  assert.strictEqual(filterStaffByTeamTab(staff, 'eixample').length, 1);
  assert.strictEqual(filterStaffByTeamTab(staff, 'gothic').length, 1);
  assert.strictEqual(isGeneralTeamMember([]), true);
  assert.strictEqual(isGeneralTeamMember(['eixample']), false);

  const seededTeam = [
    { id: 'anna', locationIds: ['loc-gotico', 'loc-sagrada'] },
    { id: 'denis', locationIds: ['loc-gotico'] },
    { id: 'marta', locationIds: ['loc-muntaner', 'loc-gracia'] },
    { id: 'pau', locationIds: ['loc-arc'] },
    { id: 'carla', locationIds: ['loc-gotico'] },
    { id: 'albert', locationIds: ['loc-gotico', 'loc-sagrada', 'loc-muntaner', 'loc-gracia', 'loc-arc'] },
  ];
  assert.strictEqual(filterStaffByTeamTab(seededTeam, 'general').length, seededTeam.length);
  assert.strictEqual(filterStaffByTeamTab(seededTeam, 'loc-gotico').length, 4);

  console.log('✅ test-unit-location-scope passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
