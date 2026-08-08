import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth-constants';

const PUBLIC_API_PREFIXES = [
  '/api/auth/login-pin',
  '/api/auth/logout',
  '/api/webhooks/',
];

const PROTECTED_ADMIN: { prefix: string; methods: string[] }[] = [
  { prefix: '/api/staff', methods: ['POST', 'PUT', 'DELETE'] },
  { prefix: '/api/settings/', methods: ['PUT', 'POST', 'DELETE'] },
  { prefix: '/api/audit', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  { prefix: '/api/backups', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

function requiresSession(pathname: string, method: string): boolean {
  if (pathname === '/api/auth/session') return method === 'GET';
  if (isPublicApi(pathname)) return false;
  return PROTECTED_ADMIN.some(
    (rule) => pathname.startsWith(rule.prefix) && rule.methods.includes(method)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (!requiresSession(pathname, request.method)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
