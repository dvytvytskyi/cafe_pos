import { prisma } from '../lib/db.ts';
import { cache } from '../lib/cache/index.ts';
import {
  DEFAULT_POS_SETTINGS,
  POS_SETTINGS_CACHE_KEY,
  POS_SETTINGS_DB_KEY,
  type PosSettings,
} from '../lib/pos-settings.ts';
import {
  mergePosSettings,
  normalizePosSettings,
  validatePosSettingsPatch,
} from '../lib/pos-settings-validation.ts';

export class PosSettingsRepository {
  async get(): Promise<PosSettings> {
    const cached = await cache.get<PosSettings>(POS_SETTINGS_CACHE_KEY);
    if (cached) return cached;

    const row = await prisma.systemSetting.findUnique({
      where: { key: POS_SETTINGS_DB_KEY },
    });

    const settings = normalizePosSettings(row?.value ?? DEFAULT_POS_SETTINGS);
    await cache.set(POS_SETTINGS_CACHE_KEY, settings);
    return settings;
  }

  async save(patch: Record<string, unknown>): Promise<PosSettings> {
    const validatedPatch = validatePosSettingsPatch(patch);
    const current = await this.getFromDb();
    const merged = mergePosSettings(current, validatedPatch);

    await prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: POS_SETTINGS_DB_KEY },
        update: { value: merged },
        create: { key: POS_SETTINGS_DB_KEY, value: merged },
      });
    });

    await cache.delete(POS_SETTINGS_CACHE_KEY);
    return merged;
  }

  private async getFromDb(): Promise<PosSettings> {
    const row = await prisma.systemSetting.findUnique({
      where: { key: POS_SETTINGS_DB_KEY },
    });
    return normalizePosSettings(row?.value ?? DEFAULT_POS_SETTINGS);
  }
}

export const posSettingsRepository = new PosSettingsRepository();
