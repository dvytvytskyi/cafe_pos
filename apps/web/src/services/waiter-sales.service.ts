import { prisma } from '@/lib/db';

export interface WaiterSalesFilters {
  locationId: string;
  startDate: Date;
  endDate: Date;
  staffId?: string;
}

export class WaiterSalesService {
  async getReport(filters: WaiterSalesFilters) {
    const orders = await prisma.order.findMany({
      where: {
        locationId: filters.locationId,
        createdAt: { gte: filters.startDate, lte: filters.endDate },
        OR: [{ paid: true }, { status: 'completed' }],
      },
      include: {
        items: true,
        takenByStaff: { select: { id: true, name: true } },
        closedByStaff: { select: { id: true, name: true } },
        assignedStaff: { select: { id: true, name: true } },
      },
    });

    type Row = {
      staffId: string;
      staffName: string;
      orderCount: number;
      itemCount: number;
      revenue: number;
      byCategory: Record<string, number>;
    };

    const byStaff = new Map<string, Row>();

    const ensure = (id: string, name: string) => {
      if (!byStaff.has(id)) {
        byStaff.set(id, {
          staffId: id,
          staffName: name,
          orderCount: 0,
          itemCount: 0,
          revenue: 0,
          byCategory: {},
        });
      }
      return byStaff.get(id)!;
    };

    for (const order of orders) {
      const closedId = order.closedByStaffId;
      const takenId = order.takenByStaffId;
      const assignedId = order.assignedStaffId;

      if (closedId && order.closedByStaff) {
        const row = ensure(closedId, order.closedByStaff.name);
        row.orderCount += 1;
      } else if (takenId && order.takenByStaff) {
        const row = ensure(takenId, order.takenByStaff.name);
        row.orderCount += 1;
      } else if (assignedId && order.assignedStaff) {
        const row = ensure(assignedId, order.assignedStaff.name);
        row.orderCount += 1;
      }

      for (const item of order.items) {
        const staffId = item.soldByStaffId ?? takenId ?? assignedId;
        if (!staffId) continue;
        const staffName =
          order.takenByStaff?.name ??
          order.assignedStaff?.name ??
          order.closedByStaff?.name ??
          'Staff';
        if (filters.staffId && staffId !== filters.staffId) continue;

        const row = ensure(staffId, staffName);
        row.itemCount += item.quantity;
        const lineTotal = item.price * item.quantity;
        row.revenue = parseFloat((row.revenue + lineTotal).toFixed(2));
        const cat = item.itemType === 'merch' ? 'merch' : 'food';
        row.byCategory[cat] = parseFloat(((row.byCategory[cat] ?? 0) + lineTotal).toFixed(2));
      }
    }

    return {
      period: { start: filters.startDate, end: filters.endDate },
      staff: [...byStaff.values()].sort((a, b) => b.revenue - a.revenue),
    };
  }
}

export const waiterSalesService = new WaiterSalesService();
