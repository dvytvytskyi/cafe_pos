import assert from 'assert';
import { hasPermission, type RolePermissions } from './auth.ts';

export async function run() {
  console.log('Running test-unit-staff-auth...');

  const waiterPermissions: RolePermissions = {
    orders: ['create', 'view'],
    settings: ['view']
  };

  const managerPermissions: RolePermissions = {
    orders: ['create', 'view', 'edit', 'delete'],
    settings: ['view', 'edit']
  };

  // 1. Waiter view check
  assert.strictEqual(hasPermission(waiterPermissions, 'orders', 'view'), true, 'Waiter must be able to view orders');

  // 2. Waiter delete check
  assert.strictEqual(hasPermission(waiterPermissions, 'orders', 'delete'), false, 'Waiter must not be able to delete orders');

  // 3. Manager delete check
  assert.strictEqual(hasPermission(managerPermissions, 'orders', 'delete'), true, 'Manager must be able to delete orders');

  console.log('✅ test-unit-staff-auth passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
