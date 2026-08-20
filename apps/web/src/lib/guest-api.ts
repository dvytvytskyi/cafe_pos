import { NextResponse } from 'next/server';
import { GuestValidationError } from '@/lib/guest-validation';
import { GuestRateLimitError } from '@/lib/guest-rate-limit';

const GUEST_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3003',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3003',
  'https://app.corgicafe.es',
  ...(process.env.GUEST_APP_ORIGINS ? process.env.GUEST_APP_ORIGINS.split(',') : []),
];

export function withGuestCors(response: NextResponse, req?: Request): NextResponse {
  const origin = req?.headers.get('origin');
  if (origin && GUEST_ORIGINS.some((o) => o.trim() === origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Cookie, Authorization');
  }
  return response;
}

export function guestJson(data: unknown, init?: ResponseInit, req?: Request) {
  return withGuestCors(NextResponse.json(data, init), req);
}

export function handleGuestError(error: unknown, req?: Request) {
  if (error instanceof GuestRateLimitError) {
    return guestJson({ error: error.message }, { status: 429 }, req);
  }
  if (error instanceof GuestValidationError) {
    return guestJson({ error: error.message }, { status: 400 }, req);
  }
  const status = (error as Error & { status?: number })?.status;
  if (status === 401) {
    return guestJson({ error: 'Unauthorized' }, { status: 401 }, req);
  }
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  console.error('[Guest API]', error);
  return guestJson({ error: message }, { status: 500 }, req);
}

export function guestOptions(req: Request) {
  return withGuestCors(new NextResponse(null, { status: 204 }), req);
}
