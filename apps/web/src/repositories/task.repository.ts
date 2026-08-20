import { prisma } from '../lib/db.ts';
import { formatDateParam, parseDateParam, startOfDay } from '../lib/task-dates.ts';
import { mapDbTaskToRecord, mapUiTaskToPayload } from '../lib/task-mapper.ts';
import type { TaskRecord } from '../lib/task-mapper.ts';

export class InvalidAssigneeError extends Error {
  constructor() {
    super('INVALID_ASSIGNEE');
    this.name = 'InvalidAssigneeError';
  }
}

export class InactiveAssigneeError extends Error {
  constructor() {
    super('INACTIVE_ASSIGNEE');
    this.name = 'InactiveAssigneeError';
  }
}

export interface TaskQueryFilters {
  date?: string;
  assigneeId?: string;
  status?: string;
}

export class TaskRepository {
  async ensureSeedTasks(): Promise<void> {
    const assignee = await prisma.user.findFirst({ where: { status: 'active' } });
    if (assignee) {
      await prisma.task.updateMany({
        where: { assigneeIds: { equals: [] } },
        data: { assigneeIds: [assignee.id] },
      });
    }

    const today = startOfDay(new Date());
    const todayCount = await prisma.task.count({ where: { scheduledDate: today } });
    if (todayCount > 0) return;

    const seeds = [
      {
        id: 'T-1001',
        title: 'Deep clean espresso machine & grinders',
        branch: 'Gothic',
        tags: [
          { label: 'Bar', bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Maintenance', bg: 'bg-orange-50', text: 'text-orange-600' },
        ],
        progress: 50,
        status: 'todo',
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'T-1002',
        title: 'Redesign seasonal menu',
        branch: 'All Branches',
        tags: [{ label: 'Marketing', bg: 'bg-purple-50', text: 'text-purple-600' }],
        progress: 0,
        status: 'in_progress',
        dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'T-1003',
        title: 'Inventory count (Merch only)',
        branch: 'Sagrada',
        tags: [{ label: 'Inventory', bg: 'bg-green-50', text: 'text-green-600' }],
        progress: 100,
        status: 'in_review',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ];

    for (const seed of seeds) {
      await prisma.task.create({
        data: {
          id: `T-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          title: seed.title,
          branch: seed.branch,
          tags: seed.tags,
          progress: seed.progress,
          status: seed.status,
          priority: 'Medium',
          dueAt: seed.dueAt,
          scheduledDate: today,
          assigneeIds: assignee ? [assignee.id] : [],
        },
      });
    }
  }

  private async validateAssignees(assigneeIds: string[], tx = prisma): Promise<void> {
    if (!assigneeIds.length) return;
    const users = await tx.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, status: true },
    });
    if (users.length !== assigneeIds.length) {
      throw new InvalidAssigneeError();
    }
    if (users.some((u) => u.status === 'inactive')) {
      throw new InactiveAssigneeError();
    }
  }

  async findById(id: string): Promise<TaskRecord | null> {
    const row = await prisma.task.findUnique({ where: { id } });
    return row ? mapDbTaskToRecord(row) : null;
  }

  async findAll(filters: TaskQueryFilters = {}): Promise<TaskRecord[]> {
    await this.ensureSeedTasks();

    const where: any = {};

    if (filters.date) {
      where.scheduledDate = parseDateParam(filters.date);
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assigneeId) {
      where.assigneeIds = { has: filters.assigneeId };
    }

    const rows = await prisma.task.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
    });

    return rows.map(mapDbTaskToRecord);
  }

  async create(data: Partial<TaskRecord> & { title: string; status: string }): Promise<TaskRecord> {
    const payload = mapUiTaskToPayload(data);

    return prisma.$transaction(async (tx) => {
      await this.validateAssignees(payload.assigneeIds, tx as typeof prisma);

      const id = data.id || `T-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const row = await tx.task.create({
        data: {
          id,
          title: payload.title,
          description: payload.description,
          branch: payload.branch,
          tags: payload.tags as any,
          commentsCount: payload.commentsCount,
          attachmentsCount: payload.attachmentsCount,
          progress: payload.progress,
          priority: payload.priority,
          dueAt: payload.dueAt,
          scheduledDate: payload.scheduledDate,
          assigneeIds: payload.assigneeIds,
          status: payload.status,
          locationId: payload.locationId,
        },
      });

      return mapDbTaskToRecord(row);
    });
  }

  async update(id: string, data: Partial<TaskRecord>): Promise<TaskRecord> {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new Error(`Task ${id} not found`);

    const merged = mapDbTaskToRecord(existing);
    const payload = mapUiTaskToPayload({ ...merged, ...data, title: data.title ?? merged.title, status: data.status ?? merged.status });

    return prisma.$transaction(async (tx) => {
      await this.validateAssignees(payload.assigneeIds, tx as typeof prisma);

      const row = await tx.task.update({
        where: { id },
        data: {
          title: payload.title,
          description: payload.description,
          branch: payload.branch,
          tags: payload.tags as any,
          commentsCount: payload.commentsCount,
          attachmentsCount: payload.attachmentsCount,
          progress: payload.progress,
          priority: payload.priority,
          dueAt: payload.dueAt,
          scheduledDate: payload.scheduledDate,
          assigneeIds: payload.assigneeIds,
          status: payload.status,
          locationId: payload.locationId,
        },
      });

      return mapDbTaskToRecord(row);
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.task.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async migrateStatus(fromStatus: string, toStatus: string, scheduledDate?: string): Promise<number> {
    const where: { status: string; scheduledDate?: Date } = { status: fromStatus };
    if (scheduledDate) {
      where.scheduledDate = parseDateParam(scheduledDate);
    }
    const result = await prisma.task.updateMany({
      where,
      data: { status: toStatus },
    });
    return result.count;
  }

  async toggleLike(id: string, userId: string): Promise<TaskRecord> {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new Error(`Task ${id} not found`);

    const current = existing.likedByIds ?? [];
    const likedByIds = current.includes(userId)
      ? current.filter((uid) => uid !== userId)
      : [...current, userId];

    const row = await prisma.task.update({
      where: { id },
      data: { likedByIds },
    });

    return mapDbTaskToRecord(row);
  }

  async syncFromClient(taskData: any): Promise<TaskRecord> {
    const existing = await prisma.task.findUnique({ where: { id: taskData.id } });
    const clientUpdatedAt = taskData.updatedAt ? new Date(taskData.updatedAt) : new Date();

    if (existing) {
      const serverUpdatedAt = new Date(existing.updatedAt);
      if (clientUpdatedAt.getTime() <= serverUpdatedAt.getTime()) {
        return mapDbTaskToRecord(existing);
      }
      return this.update(taskData.id, taskData);
    }

    return this.create({
      ...taskData,
      title: taskData.title || 'Untitled Task',
      status: taskData.status || 'todo',
    });
  }
}

export const taskRepository = new TaskRepository();

export { formatDateParam };
