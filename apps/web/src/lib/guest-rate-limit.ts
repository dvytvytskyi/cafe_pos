import { cache } from './cache';

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export class GuestRateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'GuestRateLimitError';
  }
}

function memoryIncrement(key: string, windowSeconds: number): number {
  const now = Date.now();
  const entry = memoryCounters.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/**
 * Sliding window rate limit using Redis when available, in-memory fallback otherwise.
 */
export async function assertGuestRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const redisKey = `guest_rl:${key}`;
  try {
    const current = await cache.get<number>(redisKey);
    const next = (current ?? 0) + 1;
    if (next > limit) {
      throw new GuestRateLimitError();
    }
    await cache.set(redisKey, next, windowSeconds);
    return;
  } catch (e) {
    if (e instanceof GuestRateLimitError) throw e;
  }

  const count = memoryIncrement(redisKey, windowSeconds);
  if (count > limit) {
    throw new GuestRateLimitError();
  }
}

export function guestRateLimitKey(req: Request, suffix: string): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown';
  return `${ip}:${suffix}`;
}
