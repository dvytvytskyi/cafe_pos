import { prisma } from '../lib/db.ts';
import { formatDateParam, parseDateParam } from '../lib/task-dates.ts';
import {
  ChecklistValidationError,
  ShiftClosedError,
  ChecklistForbiddenError,
  assertEditableChecklistDate,
  buildCompletionFields,
  validateChecklistCreate,
  type ChecklistCompletionInput,
} from '../lib/checklist-validation.ts';
import { locationKeyToLocationId, type ChecklistShiftType, type LocationKey } from '../lib/checklist-locations.ts';
import { shiftRepository } from './shift.repository.ts';

export type ChecklistTemplateRecord = {
  id: string;
  taskKey: string;
  title: string;
  requiresPhoto: boolean;
  category: ChecklistShiftType;
  sortOrder: number;
  permissions: Record<string, boolean>;
};

export type DailyChecklistRecord = {
  id: string;
  shiftType: ChecklistShiftType;
  scheduledDate: string;
  locationKey: LocationKey;
  taskKey: string;
  completed: boolean;
  photoUrl: string | null;
  completedAt: string | null;
  completedById: string | null;
  cashShiftId: string | null;
};

const DEFAULT_TEMPLATES: Omit<ChecklistTemplateRecord, 'id'>[] = [
  { taskKey: 'o1', title: 'Turn on espresso machine and boiler', requiresPhoto: false, category: 'opening', sortOrder: 0, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'o2', title: 'Calibrate grinder for new espresso blend', requiresPhoto: true, category: 'opening', sortOrder: 1, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'o3', title: 'Count float in cash register', requiresPhoto: true, category: 'opening', sortOrder: 2, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'o4', title: 'Bake morning batch of croissants', requiresPhoto: false, category: 'opening', sortOrder: 3, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'o5', title: 'Set up pastry vitrine beautifully', requiresPhoto: true, category: 'opening', sortOrder: 4, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'o6', title: 'Check all fridge temperatures (Log 2-5°C)', requiresPhoto: false, category: 'opening', sortOrder: 5, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'c1', title: 'Run Z-Report and count final cash', requiresPhoto: true, category: 'closing', sortOrder: 0, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'c2', title: 'Deep clean espresso machine & backflush', requiresPhoto: true, category: 'closing', sortOrder: 1, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'c3', title: 'Soak steam wands in Rinza overnight', requiresPhoto: false, category: 'closing', sortOrder: 2, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'c4', title: 'Restock milk fridges for tomorrow', requiresPhoto: false, category: 'closing', sortOrder: 3, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'c5', title: 'Empty all trash bins and take out garbage', requiresPhoto: false, category: 'closing', sortOrder: 4, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: true } },
  { taskKey: 'c6', title: 'Lock back door and turn on security alarm', requiresPhoto: false, category: 'closing', sortOrder: 5, permissions: { gotico: true, sagrada: true, eixample: true, gracia: true, arc: true, main: false } },
];

export class ChecklistRepository {
  private mapTemplate(row: {
    id: string;
    taskKey: string;
    title: string;
    requiresPhoto: boolean;
    category: string;
    sortOrder: number;
    permissions: unknown;
  }): ChecklistTemplateRecord {
    return {
      id: row.id,
      taskKey: row.taskKey,
      title: row.title,
      requiresPhoto: row.requiresPhoto,
      category: row.category as ChecklistShiftType,
      sortOrder: row.sortOrder,
      permissions: (row.permissions as Record<string, boolean>) ?? {},
    };
  }

  private mapCompletion(row: {
    id: string;
    shiftType: string;
    scheduledDate: Date;
    locationKey: string;
    taskKey: string;
    completed: boolean;
    photoUrl: string | null;
    completedAt: Date | null;
    completedById: string | null;
    cashShiftId: string | null;
  }): DailyChecklistRecord {
    return {
      id: row.id,
      shiftType: row.shiftType as ChecklistShiftType,
      scheduledDate: row.scheduledDate.toISOString().slice(0, 10),
      locationKey: row.locationKey as LocationKey,
      taskKey: row.taskKey,
      completed: row.completed,
      photoUrl: row.photoUrl,
      completedAt: row.completedAt?.toISOString() ?? null,
      completedById: row.completedById,
      cashShiftId: row.cashShiftId,
    };
  }

  async ensureDefaultTemplates(): Promise<void> {
    const count = await prisma.checklistTemplate.count();
    if (count > 0) return;

    for (const template of DEFAULT_TEMPLATES) {
      await prisma.checklistTemplate.create({
        data: {
          taskKey: template.taskKey,
          title: template.title,
          requiresPhoto: template.requiresPhoto,
          category: template.category,
          sortOrder: template.sortOrder,
          permissions: template.permissions,
        },
      });
    }
  }

  async getTemplates(category?: ChecklistShiftType): Promise<ChecklistTemplateRecord[]> {
    await this.ensureDefaultTemplates();
    const rows = await prisma.checklistTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    return rows.map((r) => this.mapTemplate(r));
  }

  async getCompletions(date: string, shiftType: ChecklistShiftType): Promise<DailyChecklistRecord[]> {
    const rows = await prisma.dailyChecklist.findMany({
      where: {
        scheduledDate: parseDateParam(date),
        shiftType,
      },
    });
    return rows.map((r) => this.mapCompletion(r));
  }

  /** T10.2 — require open cash shift for today's edits */
  async assertShiftOpenForToday(locationKey: LocationKey, date: string): Promise<string | null> {
    assertEditableChecklistDate(date);
    const today = formatDateParam(new Date());
    if (date !== today) {
      return null;
    }
    const locationId = locationKeyToLocationId(locationKey);
    const active = await shiftRepository.findActiveShift(locationId);
    if (!active) {
      throw new ShiftClosedError();
    }
    return active.id;
  }

  async upsertCompletion(input: ChecklistCompletionInput): Promise<DailyChecklistRecord> {
    validateChecklistCreate(input);
    assertEditableChecklistDate(input.date);

    let cashShiftId: string | null = null;
    if (input.completed) {
      cashShiftId = await this.assertShiftOpenForToday(input.locationKey as LocationKey, input.date);
    } else {
      // uncheck also requires open shift for today
      cashShiftId = await this.assertShiftOpenForToday(input.locationKey as LocationKey, input.date);
    }

    const completionFields = buildCompletionFields(input.completed, input.userId);

    const row = await prisma.dailyChecklist.upsert({
      where: {
        shiftType_scheduledDate_locationKey_taskKey: {
          shiftType: input.shiftType,
          scheduledDate: parseDateParam(input.date),
          locationKey: input.locationKey,
          taskKey: input.taskKey,
        },
      },
      update: {
        completed: input.completed,
        photoUrl: input.photoUrl ?? null,
        completedAt: completionFields.completedAt,
        completedById: completionFields.completedById,
        cashShiftId,
      },
      create: {
        shiftType: input.shiftType,
        scheduledDate: parseDateParam(input.date),
        locationKey: input.locationKey,
        taskKey: input.taskKey,
        completed: input.completed,
        photoUrl: input.photoUrl ?? null,
        completedAt: completionFields.completedAt,
        completedById: completionFields.completedById,
        cashShiftId,
      },
    });

    return this.mapCompletion(row);
  }

  async patchCompletion(
    id: string,
    data: { completed?: boolean; photoUrl?: string | null; userId?: string | null }
  ): Promise<DailyChecklistRecord> {
    const existing = await prisma.dailyChecklist.findUnique({ where: { id } });
    if (!existing) {
      throw new ChecklistValidationError('Checklist item not found');
    }

    const date = existing.scheduledDate.toISOString().slice(0, 10);
    assertEditableChecklistDate(date);

    const completed = data.completed ?? existing.completed;
    const cashShiftId = await this.assertShiftOpenForToday(
      existing.locationKey as LocationKey,
      date
    );

    const completionFields = buildCompletionFields(completed, data.userId ?? existing.completedById);

    const row = await prisma.dailyChecklist.update({
      where: { id },
      data: {
        completed,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl,
        completedAt: completionFields.completedAt,
        completedById: completionFields.completedById,
        cashShiftId: completed ? cashShiftId : null,
      },
    });

    return this.mapCompletion(row);
  }
}

export {
  ChecklistValidationError,
  ShiftClosedError,
  ChecklistForbiddenError,
};
export const checklistRepository = new ChecklistRepository();
