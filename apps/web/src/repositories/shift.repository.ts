import { prisma } from '../lib/db';

export interface CashAdjustment {
  type: 'in' | 'out';
  amount: number;
  reason: string;
  time: string; // ISO string
}

export class ShiftRepository {
  async findActiveShift(locationId: string) {
    return prisma.cashShift.findFirst({
      where: { locationId, status: 'open' },
      include: { user: true },
    });
  }

  async findAll(locationId: string) {
    return prisma.cashShift.findMany({
      where: { locationId },
      orderBy: { openedAt: 'desc' },
      include: { user: true },
    });
  }

  async openShift(locationId: string, userId: string, floatStart: number) {
    // Check if shift is already open
    const current = await this.findActiveShift(locationId);
    if (current) return current;

    return prisma.cashShift.create({
      data: {
        locationId,
        userId,
        floatStart,
        expected: floatStart,
        cashSales: 0,
        cardSales: 0,
        pointsSales: 0,
        cashIn: 0,
        cashOut: 0,
        status: 'open',
        adjustments: [],
      },
      include: { user: true },
    });
  }

  async addAdjustment(shiftId: string, type: 'in' | 'out', amount: number, reason: string) {
    const shift = await prisma.cashShift.findUnique({
      where: { id: shiftId },
    });
    if (!shift || shift.status !== 'open') {
      throw new Error('Shift not found or is closed');
    }

    const adjustments = (shift.adjustments || []) as any as CashAdjustment[];
    const newAdjustment: CashAdjustment = {
      type,
      amount,
      reason,
      time: new Date().toISOString(),
    };
    adjustments.push(newAdjustment);

    const cashIn = adjustments.filter(a => a.type === 'in').reduce((sum, a) => sum + a.amount, 0);
    const cashOut = adjustments.filter(a => a.type === 'out').reduce((sum, a) => sum + a.amount, 0);

    const expected = shift.floatStart + shift.cashSales + cashIn - cashOut;

    return prisma.cashShift.update({
      where: { id: shiftId },
      data: {
        adjustments: adjustments as any,
        cashIn,
        cashOut,
        expected,
      },
      include: { user: true },
    });
  }

  async closeShift(shiftId: string, actualCash: number) {
    const shift = await prisma.cashShift.findUnique({
      where: { id: shiftId },
    });
    if (!shift || shift.status !== 'open') {
      throw new Error('Shift not found or is closed');
    }

    const closedAt = new Date();

    // Query all transactions created during shift window under the shift's location
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: shift.openedAt,
          lte: closedAt,
        },
        order: {
          locationId: shift.locationId,
        },
      },
    });

    let cashSales = 0;
    let cardSales = 0;
    let pointsSales = 0;

    for (const tx of transactions) {
      if (tx.method === 'cash') cashSales += tx.amount;
      else if (tx.method === 'card') cardSales += tx.amount;
      else if (tx.method === 'points') pointsSales += tx.amount;
    }

    const expected = shift.floatStart + cashSales + shift.cashIn - shift.cashOut;
    const difference = actualCash - expected;

    return prisma.cashShift.update({
      where: { id: shiftId },
      data: {
        status: 'closed',
        closedAt,
        cashSales,
        cardSales,
        pointsSales,
        expected,
        actual: actualCash,
        difference,
      },
      include: { user: true },
    });
  }
}

export const shiftRepository = new ShiftRepository();
