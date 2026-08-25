/**
 * Default capability grants per role (master templates).
 * Hierarchy: Super Admin (all) > Manager > floor/kitchen roles.
 * Stored in Role.permissions as string[] or ['*'] for Super Admin only.
 */

import { ALL_CAPABILITY_KEYS } from './catalog';

export const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

/** Only Super Admin — never assign to Manager or below */
export const SUPER_ADMIN_ONLY_GRANTS: string[] = [
  'settings.audit',
  'settings.backups',
  'settings.taxes',
  'staff.permissions',
  'history.fiscal',
];

export type RolePresetDef = {
  id: string;
  name: string;
  permissions: string[];
};

/** Display order in matrix — Super Admin last (supreme column) */
export const ROLE_MATRIX_ORDER: string[] = [
  'Barista',
  'Chef',
  'Kitchen',
  'Waiter',
  'Manager',
  SUPER_ADMIN_ROLE_NAME,
];

export function sortRolesForMatrix<T extends { name: string }>(roles: T[]): T[] {
  return [...roles].sort((a, b) => {
    const ia = ROLE_MATRIX_ORDER.indexOf(a.name);
    const ib = ROLE_MATRIX_ORDER.indexOf(b.name);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function isSuperAdminRole(roleName: string, grants?: string[] | null): boolean {
  if (roleName === SUPER_ADMIN_ROLE_NAME) return true;
  return grants?.includes('*') ?? false;
}

export function isSuperAdminOnlyCapability(key: string): boolean {
  return SUPER_ADMIN_ONLY_GRANTS.includes(key);
}

/** Non–Super Admin roles cannot be granted super-admin-only capabilities */
export function canRoleHoldCapability(roleName: string, capabilityKey: string): boolean {
  if (isSuperAdminOnlyCapability(capabilityKey)) {
    return isSuperAdminRole(roleName);
  }
  return true;
}

/** Waiter — floor service, tables, payments, guest lookup */
const WAITER_GRANTS: string[] = [
  'orders.view',
  'orders.tables',
  'orders.create',
  'orders.pay',
  'orders.split',
  'crm.view',
  'shift.view',
  'history.view',
  'history.reprint',
  'kitchen_bar.view',
  'operations.checklists',
  'staff.time_tracking',
  'settings.profile',
  'info.view',
];

/** Barista — counter + bar station */
const BARISTA_GRANTS: string[] = [
  'orders.view',
  'orders.create',
  'orders.pay',
  'crm.view',
  'kitchen_bar.view',
  'kitchen_bar.bump',
  'operations.checklists',
  'staff.time_tracking',
  'settings.profile',
  'info.view',
];

/** Kitchen — KDS bump, checklists */
const KITCHEN_GRANTS: string[] = [
  'orders.view',
  'kitchen_bar.view',
  'kitchen_bar.bump',
  'operations.checklists',
  'staff.time_tracking',
  'info.view',
];

/** Chef — kitchen lead */
const CHEF_GRANTS: string[] = [
  'kitchen_bar.view',
  'kitchen_bar.bump',
  'kitchen_bar.analytics',
  'menu.view',
  'inventory.view',
  'operations.checklists',
  'operations.templates',
  'staff.time_tracking',
  'info.view',
];

/**
 * Manager — store operations lead.
 * Strict subset of Super Admin: no fiscal, backups, audit, role matrix, tax config.
 */
const MANAGER_GRANTS: string[] = [
  'orders.view',
  'orders.tables',
  'orders.create',
  'orders.pay',
  'orders.split',
  'orders.refund',
  'orders.discounts',
  'crm.view',
  'crm.edit',
  'crm.points_adjust',
  'crm.activity',
  'crm.program',
  'shift.view',
  'shift.open_close',
  'shift.cash_in_out',
  'shift.history',
  'history.view',
  'history.reprint',
  'history.refund',
  'reports.financial',
  'reports.dishes',
  'reports.waiters',
  'reports.export',
  'kitchen_bar.view',
  'kitchen_bar.analytics',
  'menu.view',
  'menu.edit',
  'menu.categories',
  'menu.modifiers',
  'menu.archive',
  'inventory.view',
  'inventory.adjust',
  'inventory.transfers',
  'operations.checklists',
  'operations.templates',
  'operations.tasks',
  'operations.reviews',
  'staff.view',
  'staff.edit',
  'staff.schedule',
  'staff.time_tracking',
  'settings.profile',
  'settings.general',
  'settings.tables',
  'settings.printers',
  'settings.promotions',
  'info.view',
];

export const ROLE_PRESET_DEFS: RolePresetDef[] = [
  { id: 'role-default-waiter', name: 'Waiter', permissions: WAITER_GRANTS },
  { id: 'role-barista', name: 'Barista', permissions: BARISTA_GRANTS },
  { id: 'role-kitchen', name: 'Kitchen', permissions: KITCHEN_GRANTS },
  { id: 'role-chef', name: 'Chef', permissions: CHEF_GRANTS },
  { id: 'role-manager', name: 'Manager', permissions: MANAGER_GRANTS },
  { id: 'role-super-admin', name: SUPER_ADMIN_ROLE_NAME, permissions: ['*'] },
];

export const ROLE_PRESETS_BY_NAME: Record<string, string[]> = Object.fromEntries(
  ROLE_PRESET_DEFS.map((r) => [r.name, r.permissions])
);

export function getDefaultGrantsForRoleName(name: string): string[] {
  return ROLE_PRESETS_BY_NAME[name] ?? [];
}

/** Validate presets: Manager never exceeds Super Admin-only boundary */
export function validateRolePresets(): void {
  for (const def of ROLE_PRESET_DEFS) {
    if (def.name === SUPER_ADMIN_ROLE_NAME) {
      if (!def.permissions.includes('*')) {
        throw new Error('Super Admin must have ["*"] grants');
      }
      continue;
    }
    for (const key of def.permissions) {
      if (isSuperAdminOnlyCapability(key)) {
        throw new Error(`${def.name} illegally includes super-admin-only: ${key}`);
      }
    }
    if (def.name === 'Manager') {
      const managerSet = new Set(def.permissions);
      for (const only of SUPER_ADMIN_ONLY_GRANTS) {
        if (managerSet.has(only)) {
          throw new Error(`Manager illegally includes super-admin-only: ${only}`);
        }
      }
      if (def.permissions.length >= ALL_CAPABILITY_KEYS.length) {
        throw new Error('Manager cannot have all capabilities — use Super Admin');
      }
    }
  }
}

// Fail fast on import in dev
validateRolePresets();
