import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from './db';
import {
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_TTL_SECONDS,
  type GuestSessionPayload,
} from './guest-constants';

function authSecret(): string {
  return process.env.GUEST_AUTH_SECRET || process.env.AUTH_SECRET || 'corgi-dev-guest-secret';
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function fromBase64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateGuestSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function signGuestJwt(payload: Omit<GuestSessionPayload, 'exp' | 'iat'>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(
    JSON.stringify({ ...payload, iat: now, exp: now + GUEST_SESSION_TTL_SECONDS })
  );
  const sig = createHmac('sha256', authSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyGuestJwt(token: string): GuestSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', authSecret()).update(`${header}.${body}`).digest('base64url');
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64url(body)) as GuestSessionPayload;
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function guestSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: GUEST_SESSION_TTL_SECONDS,
    path: '/',
  };
}

export function buildGuestSessionCookie(token: string): string {
  const opts = guestSessionCookieOptions();
  const parts = [
    `${GUEST_SESSION_COOKIE}=${token}`,
    'HttpOnly',
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearGuestSessionCookie(): string {
  return `${GUEST_SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=lax`;
}

export function getGuestTokenFromRequest(req: Request): string | null {
  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // 2. Fallback to cookie
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === GUEST_SESSION_COOKIE) return rest.join('=') || null;
  }
  return null;
}

export async function getGuestSessionFromRequest(req: Request): Promise<GuestSessionPayload | null> {
  const token = getGuestTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyGuestJwt(token);
  if (!payload) return null;

  const tokenHash = hashGuestToken(token);
  const session = await prisma.guestSession.findUnique({
    where: { tokenHash },
    include: { customer: { select: { id: true, phone: true, name: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.customerId !== payload.sub) return null;
  return payload;
}

export function requireGuestSession(req: Request): GuestSessionPayload {
  throw new Error('Use requireGuestSessionAsync for DB-backed validation');
}

export async function requireGuestSessionAsync(req: Request): Promise<GuestSessionPayload> {
  const session = await getGuestSessionFromRequest(req);
  if (!session) {
    const err = new Error('Unauthorized');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return session;
}

export { GUEST_SESSION_COOKIE };
