import { prisma } from '../lib/db.ts';
import {
  OverlappingShiftError,
  ScheduleValidationError,
  ScheduleShiftInput,
  parseWeekStart,
  toWeekStartString,
  validateNoOverlappingShifts,
} from '../lib/schedule-validation.ts';

export { OverlappingShiftError, ScheduleValidationError };

function toUtcDateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export class ScheduleRepository {
  async findByWeek(weekStart: Date) {
    return prisma.shiftSchedule.findMany({
      where: { weekStart: toUtcDateOnly(weekStart) },
      include: { user: { select: { id: true, name: true, avatarInitials: true, position: true } } },
      orderBy: [{ userId: 'asc' }, { dayOfWeek: 'asc' }],
    });
  }

  async bulkSave(
    weekStartInput: string,
    shifts: ScheduleShiftInput[],
    clearedUserIds: string[] = []
  ) {
    const weekStart = parseWeekStart(weekStartInput);
    validateNoOverlappingShifts(shifts);

    const weekDate = toUtcDateOnly(weekStart);
    const userIds = [...new Set([...shifts.map((s) => s.userId), ...clearedUserIds])];

    return prisma.$transaction(async (tx) => {
      if (userIds.length > 0) {
        await tx.shiftSchedule.deleteMany({
          where: {
            weekStart: weekDate,
            userId: { in: userIds },
          },
        });
      }

      if (shifts.length === 0) return [];

      await tx.shiftSchedule.createMany({
        data: shifts.map((s) => ({
          userId: s.userId,
          weekStart: weekDate,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });

      return tx.shiftSchedule.findMany({
        where: { weekStart: weekDate, userId: { in: userIds } },
        orderBy: [{ userId: 'asc' }, { dayOfWeek: 'asc' }],
      });
    });
  }
}

export const scheduleRepository = new ScheduleRepository();

export { toWeekStartString };
