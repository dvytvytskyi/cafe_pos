export const PROFILE_USER_STORAGE_KEY = 'corgi_profile_user_id';
export const DEFAULT_PROFILE_USER_ID = 'staff-001';

/** In-memory user id from /api/auth/session — never persisted to localStorage. */
let cachedUserId: string | null = null;

export function getCurrentUserId(): string {
  return cachedUserId || DEFAULT_PROFILE_USER_ID;
}

export function setCurrentUserId(userId: string): void {
  cachedUserId = userId;
}

export function clearCurrentUserId(): void {
  cachedUserId = null;
}

export function resolveProfileUserId(req: Request): string | null {
  const header = req.headers.get('x-user-id')?.trim();
  if (header) return header;
  const url = new URL(req.url);
  return url.searchParams.get('userId')?.trim() || null;
}
