import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from './notification-settings.ts';

export class NotificationSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationSettingsValidationError';
  }
}

const KEYS = new Set([
  'productivity',
  'newEvent',
  'newTeam',
  'mobilePush',
  'desktopPush',
  'email',
]);

export function validateNotificationSettingsPatch(
  body: Record<string, unknown>
): Partial<NotificationSettings> {
  const unknownKeys = Object.keys(body).filter((k) => !KEYS.has(k));
  if (unknownKeys.length > 0) {
    throw new NotificationSettingsValidationError(
      `Unknown notification settings keys: ${unknownKeys.join(', ')}`
    );
  }

  const patch: Partial<NotificationSettings> = {};
  for (const key of KEYS) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'boolean') {
        throw new NotificationSettingsValidationError(`${key} must be a boolean`);
      }
      patch[key as keyof NotificationSettings] = body[key] as boolean;
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new NotificationSettingsValidationError('No valid notification settings fields provided');
  }

  return patch;
}

export function mergeNotificationSettings(
  current: NotificationSettings,
  patch: Partial<NotificationSettings>
): NotificationSettings {
  return { ...current, ...patch };
}

export function normalizeNotificationSettings(raw: unknown): NotificationSettings {
  const base = { ...DEFAULT_NOTIFICATION_SETTINGS };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  for (const key of KEYS) {
    if (typeof obj[key] === 'boolean') {
      base[key as keyof NotificationSettings] = obj[key] as boolean;
    }
  }

  return base;
}
