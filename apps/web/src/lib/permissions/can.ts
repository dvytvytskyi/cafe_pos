import { PERMISSIONS_CATALOG, ALL_CAPABILITY_KEYS } from './catalog';

export interface UserPermissionOverrides {
  add?: string[];
  remove?: string[];
}

/**
 * Computes effective grants from base role grants and individual user overrides:
 * effective = (roleGrants \ overrides.remove) ∪ overrides.add
 */
export function computeEffectiveGrants(
  roleGrants: string[] = [],
  overrides?: UserPermissionOverrides | null
): string[] {
  const add = new Set(overrides?.add ?? []);
  const remove = new Set(overrides?.remove ?? []);

  const result = new Set<string>();

  // If role grants include wildcard '*' or admin, expand to all
  if (roleGrants.includes('*') || roleGrants.includes('admin') || roleGrants.includes('all')) {
    ALL_CAPABILITY_KEYS.forEach((k) => result.add(k));
    result.add('*');
  } else {
    roleGrants.forEach((g) => {
      if (typeof g !== 'string') return;
      if (g.endsWith('.*')) {
        const prefix = g.slice(0, -2);
        ALL_CAPABILITY_KEYS.filter((k) => k.startsWith(prefix + '.')).forEach((k) =>
          result.add(k)
        );
      } else if (!g.includes('.')) {
        // Module level grant like 'orders' or 'crm'
        ALL_CAPABILITY_KEYS.filter((k) => k.startsWith(g + '.')).forEach((k) =>
          result.add(k)
        );
        result.add(g);
      } else {
        result.add(g);
      }
    });
  }

  // Remove overrides
  remove.forEach((r) => result.delete(r));

  // Add overrides
  add.forEach((a) => result.add(a));

  return Array.from(result);
}

/**
 * Checks if user's effective grants satisfy a required capability key.
 * Supports exact match, wildcard '*', module.*, and implied capabilities.
 */
export function hasCapability(
  effectiveGrants: string[] = [],
  targetCapability: string
): boolean {
  if (!effectiveGrants || effectiveGrants.length === 0) {
    return false;
  }

  // Wildcard super admin
  if (effectiveGrants.includes('*')) {
    return true;
  }

  // Direct match
  if (effectiveGrants.includes(targetCapability)) {
    return true;
  }

  // Module wildcard (e.g. user has 'orders.*', checking 'orders.refund')
  const modulePrefix = targetCapability.split('.')[0];
  if (effectiveGrants.includes(`${modulePrefix}.*`)) {
    return true;
  }

  // Check if any held capability implies the target capability
  for (const grant of effectiveGrants) {
    for (const group of PERMISSIONS_CATALOG) {
      const capDef = group.capabilities.find((c) => c.key === grant);
      if (capDef?.implies?.includes(targetCapability)) {
        return true;
      }
    }
  }

  return false;
}
