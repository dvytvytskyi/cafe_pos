import { prisma } from '../lib/db.ts';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_DB_KEY,
  type NotificationSettings,
} from '../lib/notification-settings.ts';
import {
  mergeNotificationSettings,
  normalizeNotificationSettings,
  validateNotificationSettingsPatch,
} from '../lib/notification-settings-validation.ts';

export class NotificationSettingsRepository {
  async get(): Promise<NotificationSettings> {
    const row = await prisma.systemSetting.findUnique({
      where: { key: NOTIFICATION_SETTINGS_DB_KEY },
    });
    return normalizeNotificationSettings(row?.value ?? DEFAULT_NOTIFICATION_SETTINGS);
  }

  async save(patch: Record<string, unknown>): Promise<NotificationSettings> {
    const validatedPatch = validateNotificationSettingsPatch(patch);
    const current = await this.get();
    const merged = mergeNotificationSettings(current, validatedPatch);

    await prisma.systemSetting.upsert({
      where: { key: NOTIFICATION_SETTINGS_DB_KEY },
      update: { value: merged },
      create: { key: NOTIFICATION_SETTINGS_DB_KEY, value: merged },
    });

    return merged;
  }
}

export const notificationSettingsRepository = new NotificationSettingsRepository();
