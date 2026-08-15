import type { RolePermissions, SessionPayload } from './auth-constants';

export type LocationAccess = string[] | 'all';

export function isSuperAdmin(roleName: string, permissions: RolePermissions): boolean {
  if (roleName === 'Super Admin') return true;
  const settings = permissions.settings ?? [];
  if ((settings as string[]).includes('*')) return true;
  const loc = permissions.locations ?? [];
  if ((loc as string[]).includes('*')) return true;
  return false;
}

export function getAccessibleLocationIds(session: SessionPayload): LocationAccess {
  if (isSuperAdmin(session.roleName, session.permissions)) return 'all';
  const ids = session.locationIds ?? [];
  // General team (HQ / regional): empty assignment = all locations
  if (ids.length === 0) return 'all';
  return ids;
}

export function assertLocationAccess(session: SessionPayload, locationId: string): void {
  if (locationId === 'all') {
    if (!isSuperAdmin(session.roleName, session.permissions)) {
      const err = new Error('Forbidden: cannot access all locations');
      (err as Error & { status: number }).status = 403;
      throw err;
    }
    return;
  }
  const access = getAccessibleLocationIds(session);
  if (access === 'all') return;
  if (!access.includes(locationId)) {
    const err = new Error('Forbidden: location not in scope');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

export function resolveScopedLocationId(
  session: SessionPayload | null,
  requestedLocationId: string | null | undefined,
  fallback = 'default'
): string {
  if (!session) return requestedLocationId || fallback;
  const access = getAccessibleLocationIds(session);
  const requested = requestedLocationId || fallback;
  if (requested === 'all') {
    if (access === 'all') return 'all';
    if (access.length === 1) return access[0]!;
    if (access.length > 1) return 'all';
    return fallback;
  }
  if (access === 'all') return requested;
  if (access.length === 0) return fallback;
  if (access.includes(requested)) return requested;
  return access[0]!;
}

/** Location ids to query when client requests `all` (orders, etc.). */
export function resolveLocationIdsForAllQuery(
  session: SessionPayload | null,
  fallback = 'default'
): string[] | 'all' {
  if (!session) return 'all';
  const access = getAccessibleLocationIds(session);
  if (access === 'all') return 'all';
  if (access.length === 0) return [fallback];
  return access;
}

export function filterByLocationScope<T>(
  items: T[],
  getLocationId: (item: T) => string | string[] | undefined,
  access: LocationAccess
): T[] {
  if (access === 'all') return items;
  return items.filter((item) => {
    const loc = getLocationId(item);
    if (!loc) return false;
    if (Array.isArray(loc)) {
      if (loc.length === 0) return true; // general team
      return loc.some((id) => access.includes(id));
    }
    return access.includes(loc);
  });
}

/** General team: no location assignments (HQ, regional, etc.). */
export function isGeneralTeamMember(locationIds: string[] | undefined): boolean {
  return !locationIds || locationIds.length === 0;
}

export function filterStaffByTeamTab<T extends { locationIds?: string[] }>(
  employees: T[],
  tab: 'general' | string,
  access: LocationAccess
): T[] {
  if (tab === 'general') {
    return employees.filter((e) => isGeneralTeamMember(e.locationIds));
  }
  return employees.filter(
    (e) => !isGeneralTeamMember(e.locationIds) && e.locationIds?.includes(tab)
  );
}

export function assertStaffLocationAssignment(
  session: SessionPayload,
  locationIds: string[] | undefined
): void {
  if (isSuperAdmin(session.roleName, session.permissions)) return;
  const access = getAccessibleLocationIds(session);
  if (access === 'all') return;
  const ids = locationIds ?? [];
  if (ids.length === 0) return; // general team — allowed for super admin only in strict mode
  for (const id of ids) {
    if (!access.includes(id)) {
      const err = new Error('Forbidden: cannot assign location outside your scope');
      (err as Error & { status: number }).status = 403;
      throw err;
    }
  }
}
