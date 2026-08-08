import { cache } from './cache/index.ts';
import { MAX_PIN_FAILURES, PIN_LOCKOUT_SECONDS } from './auth-constants.ts';

function pinFailKey(clientKey: string): string {
  return `auth:pin-fail:${clientKey}`;
}

export function getClientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip')?.trim() || '127.0.0.1';
}

export async function checkPinRateLimit(clientKey: string): Promise<void> {
  const count = await cache.get<number>(pinFailKey(clientKey));
  if (count !== null && count >= MAX_PIN_FAILURES) {
    const err = new Error('TOO_MANY_FAILED_ATTEMPTS');
    (err as Error & { code: string; retryAfter: number }).code = 'TOO_MANY_FAILED_ATTEMPTS';
    (err as Error & { retryAfter: number }).retryAfter = PIN_LOCKOUT_SECONDS;
    throw err;
  }
}

export async function recordPinFailure(clientKey: string): Promise<number> {
  const key = pinFailKey(clientKey);
  const current = (await cache.get<number>(key)) ?? 0;
  const next = current + 1;
  await cache.set(key, next, PIN_LOCKOUT_SECONDS);
  return next;
}

export async function clearPinFailures(clientKey: string): Promise<void> {
  await cache.delete(pinFailKey(clientKey));
}
