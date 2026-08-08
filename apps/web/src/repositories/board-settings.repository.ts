import { prisma } from '../lib/db.ts';
import type { BoardStage } from '../lib/board-validation.ts';
import {
  BoardValidationError,
  assertValidBoardStages,
} from '../lib/board-validation.ts';
import {
  DEFAULT_ORDER_STAGES,
  DEFAULT_TASK_STAGES,
} from '../lib/board-settings.ts';
import type { BoardType } from '../lib/board-settings.ts';

const DEFAULTS: Record<BoardType, BoardStage[]> = {
  orders: DEFAULT_ORDER_STAGES,
  tasks: DEFAULT_TASK_STAGES,
};

export class BoardSettingsRepository {
  private normalizeStages(stages: unknown): BoardStage[] {
    if (!Array.isArray(stages)) return [];
    return stages
      .filter((s) => s && typeof s === 'object')
      .map((s) => ({
        id: String((s as BoardStage).id),
        label: String((s as BoardStage).label),
        color: String((s as BoardStage).color || 'bg-gray-400'),
      }));
  }

  async get(type: BoardType, locationId = 'default'): Promise<BoardStage[]> {
    await this.ensureDefaults(type, locationId);

    const row = await prisma.boardSettings.findUnique({
      where: { type_locationId: { type, locationId } },
    });

    if (!row) {
      return [...DEFAULTS[type]];
    }

    return this.normalizeStages(row.stages);
  }

  async save(
    type: BoardType,
    stages: BoardStage[],
    locationId = 'default'
  ): Promise<BoardStage[]> {
    assertValidBoardStages(stages);

    const row = await prisma.boardSettings.upsert({
      where: { type_locationId: { type, locationId } },
      update: { stages },
      create: { type, locationId, stages },
    });

    return this.normalizeStages(row.stages);
  }

  async ensureDefaults(type: BoardType, locationId = 'default'): Promise<void> {
    const existing = await prisma.boardSettings.findUnique({
      where: { type_locationId: { type, locationId } },
    });
    if (existing) return;

    await prisma.boardSettings.create({
      data: {
        type,
        locationId,
        stages: DEFAULTS[type],
      },
    });
  }
}

export { BoardValidationError };
export const boardSettingsRepository = new BoardSettingsRepository();
