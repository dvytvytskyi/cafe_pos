import { prisma } from '../lib/db.ts';
import { parseDateParam } from '../lib/task-dates.ts';
import {
  buildKpiPayload,
  type OperationsKpiPayload,
} from '../lib/operations-kpi.ts';

export class ShiftNotFoundError extends Error {
  constructor() {
    super('SHIFT_NOT_FOUND');
    this.name = 'ShiftNotFoundError';
  }
}

export class OperationsKpiRepository {
  async getKpi(date: string, shiftId?: string): Promise<OperationsKpiPayload> {
    if (shiftId) {
      const shift = await prisma.cashShift.findUnique({ where: { id: shiftId } });
      if (!shift) throw new ShiftNotFoundError();
    }

    const scheduledDate = parseDateParam(date);

    const taskGroups = await prisma.task.groupBy({
      by: ['status'],
      where: { scheduledDate },
      _count: { _all: true },
    });

    const taskByStatus: Record<string, number> = {};
    for (const row of taskGroups) {
      taskByStatus[row.status] = row._count._all;
    }

    const checklistWhere = {
      scheduledDate,
      ...(shiftId ? { cashShiftId: shiftId } : {}),
    };

    const checklistTotal = await prisma.dailyChecklist.count({ where: checklistWhere });
    const checklistCompleted = await prisma.dailyChecklist.count({
      where: { ...checklistWhere, completed: true },
    });

    return buildKpiPayload({
      date,
      shiftId: shiftId ?? null,
      taskByStatus,
      checklistTotal,
      checklistCompleted,
    });
  }
}

export const operationsKpiRepository = new OperationsKpiRepository();
