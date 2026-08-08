import { getCurrentUserId } from './current-user.ts';

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarInitials: string | null;
  role: { id: string; name: string };
  locations: { id: string; name: string }[];
  hasPassword: boolean;
};

export class ProfileApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ProfileApiError';
    this.status = status;
    this.code = code;
  }
}

function profileUrl(path = '', userId?: string): string {
  const id = userId ?? getCurrentUserId();
  const params = new URLSearchParams({ userId: id });
  return `/api/profile${path}?${params.toString()}`;
}

async function parseProfileResponse(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ProfileApiError(body.error ?? 'Profile request failed', res.status, body.error);
  }
  return body;
}

export async function getProfileAsync(userId?: string): Promise<Profile> {
  const res = await fetch(profileUrl('', userId));
  return parseProfileResponse(res);
}

export async function updateProfileAsync(
  data: { name: string; email: string; phone?: string | null },
  userId?: string
): Promise<Profile> {
  const res = await fetch(profileUrl('', userId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseProfileResponse(res);
}

export async function changeProfilePasswordAsync(
  oldPassword: string,
  newPassword: string,
  userId?: string
): Promise<void> {
  const res = await fetch(profileUrl('/password', userId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  await parseProfileResponse(res);
}

export const PROFILE_UPDATED_EVENT = 'corgi-profile-updated';

export function notifyProfileUpdated(profile: Profile): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: profile }));
}
