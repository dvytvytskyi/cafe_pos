export const SESSION_COOKIE = 'corgi_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const MAX_PIN_FAILURES = 5;
export const PIN_LOCKOUT_SECONDS = 900;

export type RolePermissions = Record<string, ('create' | 'view' | 'edit' | 'delete')[]>;

export type SessionPayload = {
  sub: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: RolePermissions;
};

export type SessionUser = {
  id: string;
  name: string;
  role: { id: string; name: string; permissions: RolePermissions };
  locations: { id: string; name: string }[];
};
