export type NotificationSettings = {
  productivity: boolean;
  newEvent: boolean;
  newTeam: boolean;
  mobilePush: boolean;
  desktopPush: boolean;
  email: boolean;
};

export const NOTIFICATION_SETTINGS_DB_KEY = 'notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  productivity: true,
  newEvent: true,
  newTeam: true,
  mobilePush: true,
  desktopPush: true,
  email: false,
};

export class NotificationSettingsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'NotificationSettingsApiError';
    this.status = status;
  }
}

export async function getNotificationSettingsAsync(): Promise<NotificationSettings> {
  const res = await fetch('/api/settings/notifications');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new NotificationSettingsApiError(body.error ?? 'Failed to load notification settings', res.status);
  }
  return res.json();
}

export async function saveNotificationSettingsAsync(
  patch: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const res = await fetch('/api/settings/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new NotificationSettingsApiError(body.error ?? 'Failed to save notification settings', res.status);
  }
  return body;
}
