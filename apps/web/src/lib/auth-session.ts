import { createHmac, timingSafeEqual } from 'crypto';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type RolePermissions,
  type SessionPayload,
  type SessionUser,
} from './auth-constants.ts';

function authSecret(): string {
  return process.env.AUTH_SECRET || 'corgi-dev-auth-secret-change-in-prod';
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function fromBase64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function signSessionToken(payload: Omit<SessionPayload, never>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + SESSION_TTL_SECONDS }));
  const sig = createHmac('sha256', authSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', authSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64url(body)) as SessionPayload & { exp?: number };
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  };
}

export function buildSessionCookie(token: string): string {
  const opts = sessionCookieOptions();
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=lax`;
}

export function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=') || null;
  }
  return null;
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

export function hasPermission(
  permissions: RolePermissions,
  resource: string,
  action: 'create' | 'view' | 'edit' | 'delete'
): boolean {
  return !!permissions[resource]?.includes(action);
}

export function requireAuth(req: Request): SessionPayload {
  const session = getSessionFromRequest(req);
  if (!session) {
    const err = new Error('Unauthorized');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return session;
}

export function requirePermission(
  req: Request,
  resource: string,
  action: 'create' | 'view' | 'edit' | 'delete'
): SessionPayload {
  const session = requireAuth(req);
  if (!hasPermission(session.permissions, resource, action)) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return session;
}

export function toSessionUser(user: {
  id: string;
  name: string;
  role: { id: string; name: string; permissions: unknown };
  locations: { id: string; name: string }[];
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: (user.role.permissions as RolePermissions) ?? {},
    },
    locations: user.locations.map((loc) => ({ id: loc.id, name: loc.name })),
  };
}

export function sessionPayloadFromUser(user: {
  id: string;
  name: string;
  role: { id: string; name: string; permissions: unknown };
  locations?: { id: string }[];
}): SessionPayload {
  return {
    sub: user.id,
    name: user.name,
    roleId: user.role.id,
    roleName: user.role.name,
    permissions: (user.role.permissions as RolePermissions) ?? {},
    locationIds: (user.locations ?? []).map((loc) => loc.id),
  };
}

export { SESSION_COOKIE };
