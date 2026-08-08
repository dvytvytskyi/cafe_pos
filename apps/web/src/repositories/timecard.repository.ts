import { prisma } from '../lib/db.ts';
import {
  AlreadyClockedInError,
  NotClockedInError,
  calcTotalMinutes,
  resolveClockOut,
  shouldAutoClockOut,
  toDateString,
} from '../lib/timecard-validation.ts';

export { AlreadyClockedInError, NotClockedInError };

function toUtcDateOnly(date: Date): Date {
  return new Date(`${toDateString(date)}T00:00:00.000Z`);
}

export class TimeCardRepository {
  async findOpenByUserId(userId: string) {
    return prisma.timeCard.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
      include: { user: true },
    });
  }

  async autoCloseStaleOpenCards(now: Date = new Date()) {
    const openCards = await prisma.timeCard.findMany({ where: { clockOut: null } });
    for (const card of openCards) {
      if (shouldAutoClockOut(card.clockIn, now)) {
        const clockOut = resolveClockOut(card.clockIn, now);
        await prisma.timeCard.update({
          where: { id: card.id },
          data: {
            clockOut,
            totalMinutes: calcTotalMinutes(card.clockIn, clockOut),
          },
        });
      }
    }
  }

  async clockIn(userId: string, at: Date = new Date()) {
    await this.autoCloseStaleOpenCards(at);
    const open = await this.findOpenByUserId(userId);
    if (open) throw new AlreadyClockedInError();

    return prisma.timeCard.create({
      data: {
        userId,
        workDate: toUtcDateOnly(at),
        clockIn: at,
        totalMinutes: 0,
      },
      include: { user: true },
    });
  }

  async clockOut(userId: string, at: Date = new Date()) {
    await this.autoCloseStaleOpenCards(at);
    const open = await this.findOpenByUserId(userId);
    if (!open) throw new NotClockedInError();

    const clockOut = resolveClockOut(open.clockIn, at);
    return prisma.timeCard.update({
      where: { id: open.id },
      data: {
        clockOut,
        totalMinutes: calcTotalMinutes(open.clockIn, clockOut),
      },
      include: { user: true },
    });
  }

  async findByDateRange(from: Date, to: Date) {
    await this.autoCloseStaleOpenCards();
    return prisma.timeCard.findMany({
      where: {
        workDate: {
          gte: toUtcDateOnly(from),
          lte: toUtcDateOnly(to),
        },
      },
      include: { user: true },
      orderBy: [{ workDate: 'asc' }, { clockIn: 'asc' }],
    });
  }

  async findByWorkDate(date: Date) {
    await this.autoCloseStaleOpenCards();
    return prisma.timeCard.findMany({
      where: { workDate: toUtcDateOnly(date) },
      include: { user: true },
      orderBy: { clockIn: 'asc' },
    });
  }
}

export const timeCardRepository = new TimeCardRepository();
