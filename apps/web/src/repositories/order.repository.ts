import { prisma } from '../lib/db';
import { Order, OrderStatus } from '../lib/types/domain';
import { crmRepository } from './crm.repository';
import { auditRepository } from './audit.repository';
import { shiftRepository } from './shift.repository';
import type { OrderHistoryFilters } from '../lib/order-history-validation';

export interface PaymentLine {
  method: 'card' | 'cash' | 'points' | 'giftcard';
  amount: number;
  code?: string;
}

export interface CompletePaymentPayload {
  payments: PaymentLine[];
  customerId?: string;
  discount?: { name: string; value: number };
  tip?: { type: 'percent' | 'fixed'; value: number };
  total?: number;
  paidItemIndexes?: number[];
}

// Helper to map Prisma Order (with items) to Domain Order
export function mapToDomainOrder(dbOrder: any): Order {
  if (!dbOrder) return null as any;
  return {
    id: dbOrder.id,
    tableId: dbOrder.tableId || undefined,
    locationId: dbOrder.locationId,
    source: dbOrder.source,
    status: dbOrder.status as OrderStatus,
    paymentStatus: dbOrder.paid ? 'paid' : 'unpaid',
    paid: dbOrder.paid,
    amountPaid: dbOrder.amountPaid ?? 0,
    payments: (dbOrder.transactions || []).map((t: any) => ({
      method: t.method,
      amount: t.amount,
      code: t.code || undefined,
    })),
    items: (dbOrder.items || []).map((item: any) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      paid: item.paid,
      comments: item.comments || undefined,
      refundedQuantity: item.refundedQuantity ?? 0,
    })),
    subtotal: dbOrder.total,
    tax: dbOrder.total * 0.1,
    total: dbOrder.total,
    refundedAmount: dbOrder.refundedAmount ?? 0,
    createdAt: dbOrder.createdAt,
    updatedAt: dbOrder.updatedAt,
    discountName: dbOrder.discountName || undefined,
    discountValue: dbOrder.discountValue ?? 0,
    deliveryId: dbOrder.orderNumber.startsWith('GLV') || dbOrder.orderNumber.startsWith('UBR') ? dbOrder.orderNumber : undefined,
    orderedBy: dbOrder.source === 'dine_in' || dbOrder.source === 'takeaway' ? 'waiter' : 'app',
    customerId: dbOrder.customerId || undefined,
    customerName: dbOrder.customerName || '',
  } as Order;
}

export type OrderHistoryRecord = Order & {
  orderNumber: string;
  tableNumber: string | null;
  waiterName: string | null;
};

function resolveWaiterName(
  orderCreatedAt: Date,
  shifts: Array<{ openedAt: Date; closedAt: Date | null; user: { name: string } }>
): string | null {
  const shift = shifts.find(
    (s) =>
      s.openedAt.getTime() <= orderCreatedAt.getTime() &&
      (!s.closedAt || s.closedAt.getTime() >= orderCreatedAt.getTime())
  );
  return shift?.user.name ?? null;
}

export class OrderRepository {
  
  async findById(id: string): Promise<Order | null> {
    try {
      const dbOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: true, transactions: true },
      });
      return dbOrder ? mapToDomainOrder(dbOrder) : null;
    } catch (error) {
      console.error(`Error finding order by ID [${id}] in DB:`, error);
      throw error;
    }
  }

  async findAll(): Promise<Order[]> {
    try {
      const dbOrders = await prisma.order.findMany({
        include: { items: true, transactions: true },
        orderBy: { createdAt: 'desc' },
      });
      return dbOrders.map(mapToDomainOrder);
    } catch (error) {
      console.error('Error finding all orders in DB:', error);
      throw error;
    }
  }

  async findOrderHistory(
    filters: OrderHistoryFilters
  ): Promise<{ items: OrderHistoryRecord[]; total: number }> {
    const skip = (filters.page - 1) * filters.limit;

    const where: Record<string, unknown> = {
      locationId: filters.locationId,
      createdAt: { gte: filters.startDate, lte: filters.endDate },
      OR: [
        { paid: true },
        { status: 'completed' },
        { status: 'cancelled' },
        { refundedAmount: { gt: 0 } },
      ],
    };

    if (filters.source) where.source = filters.source;

    if (filters.query) {
      where.AND = [
        {
          OR: [
            { orderNumber: { contains: filters.query, mode: 'insensitive' } },
            { customerName: { contains: filters.query, mode: 'insensitive' } },
            { id: { contains: filters.query, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (filters.paymentMethod) {
      where.transactions = { some: { method: filters.paymentMethod } };
    }

    const [dbOrders, total, shifts] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        include: {
          items: true,
          transactions: true,
          table: { select: { number: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: filters.limit,
      }),
      prisma.order.count({ where: where as any }),
      prisma.cashShift.findMany({
        where: { locationId: filters.locationId },
        include: { user: { select: { name: true } } },
        orderBy: { openedAt: 'desc' },
      }),
    ]);

    const items = dbOrders.map((row) => {
      const domain = mapToDomainOrder(row);
      return {
        ...domain,
        orderNumber: row.orderNumber,
        tableNumber: row.table?.number ?? null,
        waiterName: resolveWaiterName(row.createdAt, shifts),
      };
    });

    return { items, total };
  }

  async findByLocation(locationId: string): Promise<Order[]> {
    try {
      const dbOrders = await prisma.order.findMany({
        where: { locationId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
      return dbOrders.map(mapToDomainOrder);
    } catch (error) {
      console.error(`Error finding orders by location [${locationId}] in DB:`, error);
      throw error;
    }
  }

  async findActiveOrders(): Promise<Order[]> {
    try {
      const activeStatuses = ['incoming', 'preparing', 'ready', 'served'];
      const dbOrders = await prisma.order.findMany({
        where: {
          status: { in: activeStatuses },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
      return dbOrders.map(mapToDomainOrder);
    } catch (error) {
      console.error('Error finding active orders in DB:', error);
      throw error;
    }
  }

  async create(data: Partial<Order>): Promise<Order> {
    try {
      const orderNumber = data.deliveryId || `ORD-${Date.now().toString().slice(-6)}`;
      const source = data.source || 'dine_in';
      const status = data.status || 'preparing';
      const paid = data.paymentStatus === 'paid' || data.paid || false;
      const amountPaid = paid ? (data.total || 0) : 0;

      const dbOrder = await prisma.order.create({
        data: {
          id: data.id,
          orderNumber,
          source,
          customerName: data.customerName || 'Walk-in',
          customerId: data.customerId,
          tableId: data.tableId,
          locationId: data.locationId || 'default',
          status,
          total: data.total || 0,
          discountName: (data as any).discountName || null,
          discountValue: (data as any).discountValue ?? 0,
          tipType: (data as any).tipType || null,
          tipValue: (data as any).tipValue ?? 0,
          paid,
          amountPaid,
          items: {
            create: (data.items || []).map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              paid: item.paid || false,
              comments: item.comments || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return mapToDomainOrder(dbOrder);
    } catch (error) {
      console.error('Error creating order in DB:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    try {
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.total !== undefined) updateData.total = data.total;
      if (data.paymentStatus) {
        updateData.paid = data.paymentStatus === 'paid';
        updateData.amountPaid = updateData.paid ? (data.total || 0) : 0;
      }
      if (data.tableId !== undefined) updateData.tableId = data.tableId;
      if (data.customerName !== undefined) updateData.customerName = data.customerName;
      if (data.customerId !== undefined) updateData.customerId = data.customerId;
      if ((data as any).discountName !== undefined) updateData.discountName = (data as any).discountName;
      if ((data as any).discountValue !== undefined) updateData.discountValue = (data as any).discountValue;

      // Handle items update (for simplicity, delete and recreate items if provided)
      if (data.items) {
        await prisma.orderItem.deleteMany({ where: { orderId: id } });
        updateData.items = {
          create: data.items.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            paid: item.paid || false,
            comments: item.comments || null,
          })),
        };
      }

      const dbOrder = await prisma.order.update({
        where: { id },
        data: updateData,
        include: { items: true, transactions: true },
      });

      return mapToDomainOrder(dbOrder);
    } catch (error) {
      console.error(`Error updating order [${id}] in DB:`, error);
      throw error;
    }
  }

  async completePayment(orderId: string, payload: CompletePaymentPayload): Promise<Order> {
    const warnings: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, transactions: true },
      });
      if (!order) throw new Error('Order not found');
      if (order.paid) throw new Error('Order is already paid');

      const paymentTotal = payload.payments.reduce((sum, p) => sum + p.amount, 0);
      if (paymentTotal <= 0) throw new Error('Payment amount must be greater than zero');

      const hasCash = payload.payments.some((p) => p.method === 'cash');
      if (hasCash) {
        const openShift = await shiftRepository.findActiveShift(order.locationId);
        if (!openShift) {
          warnings.push('NO_OPEN_SHIFT');
        }
      }

      const pointsSpent = payload.payments
        .filter((p) => p.method === 'points')
        .reduce((sum, p) => sum + p.amount, 0);
      const customerId = payload.customerId || order.customerId || undefined;

      if (pointsSpent > 0) {
        if (!customerId) throw new Error('Customer required for points payment');
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error('Customer not found');
        if (customer.points < pointsSpent - 0.001) {
          throw new Error('Insufficient loyalty points');
        }
      }

      for (const payment of payload.payments.filter((p) => p.method === 'giftcard')) {
        if (!payment.code) throw new Error('Gift card code is required');
        const code = payment.code.trim().toUpperCase();
        const card = await tx.giftCard.findUnique({ where: { code } });
        if (!card) throw new Error('Gift Card not found.');
        if (card.status !== 'active') throw new Error(`Gift Card is ${card.status}.`);
        if (new Date(card.expiryDate).getTime() < Date.now()) {
          await tx.giftCard.update({ where: { id: card.id }, data: { status: 'expired' } });
          throw new Error('Gift Card has expired.');
        }
        if (card.balance < payment.amount - 0.001) {
          throw new Error(`Insufficient gift card balance (Available: €${card.balance.toFixed(2)})`);
        }
        const newBalance = parseFloat((card.balance - payment.amount).toFixed(2));
        await tx.giftCard.update({
          where: { id: card.id },
          data: { balance: newBalance, status: newBalance === 0 ? 'redeemed' : 'active' },
        });
      }

      if (payload.paidItemIndexes?.length) {
        const items = await tx.orderItem.findMany({
          where: { orderId },
          orderBy: { createdAt: 'asc' },
        });
        for (const idx of payload.paidItemIndexes) {
          const item = items[idx];
          if (item) {
            await tx.orderItem.update({ where: { id: item.id }, data: { paid: true } });
          }
        }
      }

      for (const payment of payload.payments) {
        await tx.transaction.create({
          data: {
            orderId,
            method: payment.method,
            amount: payment.amount,
            code: payment.code || null,
          },
        });
      }

      const openShift = await tx.cashShift.findFirst({
        where: { locationId: order.locationId, status: 'open' },
      });
      if (openShift) {
        let cashDelta = 0;
        let cardDelta = 0;
        let pointsDelta = 0;
        for (const p of payload.payments) {
          if (p.method === 'cash') cashDelta += p.amount;
          else if (p.method === 'card') cardDelta += p.amount;
          else if (p.method === 'points') pointsDelta += p.amount;
        }
        const newCashSales = parseFloat((openShift.cashSales + cashDelta).toFixed(2));
        const newCardSales = parseFloat((openShift.cardSales + cardDelta).toFixed(2));
        const newPointsSales = parseFloat((openShift.pointsSales + pointsDelta).toFixed(2));
        await tx.cashShift.update({
          where: { id: openShift.id },
          data: {
            cashSales: newCashSales,
            cardSales: newCardSales,
            pointsSales: newPointsSales,
            expected: parseFloat(
              (openShift.floatStart + newCashSales + openShift.cashIn - openShift.cashOut).toFixed(2)
            ),
          },
        });
      }

      const orderTotal = payload.total ?? order.total;
      const newAmountPaid = parseFloat((order.amountPaid + paymentTotal).toFixed(2));
      const isFullyPaid = newAmountPaid >= orderTotal - 0.01;

      const updateData: Record<string, unknown> = {
        amountPaid: newAmountPaid,
        paid: isFullyPaid,
        status: isFullyPaid ? 'completed' : order.status,
        total: orderTotal,
      };
      if (payload.discount) {
        updateData.discountName = payload.discount.name;
        updateData.discountValue = payload.discount.value;
      }
      if (payload.tip) {
        updateData.tipType = payload.tip.type;
        updateData.tipValue = payload.tip.value;
      }
      if (customerId) updateData.customerId = customerId;

      await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      if (isFullyPaid && order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'dirty' },
        });
      }

      if (isFullyPaid && customerId) {
        const cashCardPaid = payload.payments
          .filter((p) => p.method === 'cash' || p.method === 'card' || p.method === 'giftcard')
          .reduce((sum, p) => sum + p.amount, 0);
        await crmRepository.applyLoyaltyTransactionInTx(
          tx,
          customerId,
          cashCardPaid,
          pointsSpent,
          orderId
        );
      }

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, transactions: true },
      });
    });

    if (result.paid) {
      await auditRepository.logEvent('order_completed', {
        orderId,
        total: result.total,
        payments: payload.payments,
      });
    }

    const mapped = mapToDomainOrder(result);
    (mapped as any).warnings = warnings;
    return mapped;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    try {
      const dbOrder = await prisma.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });
      return mapToDomainOrder(dbOrder);
    } catch (error) {
      console.error(`Error updating order status [${id}] in DB:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Cascade delete is handled by database foreign keys since we set onDelete: Cascade
      await prisma.order.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error(`Error deleting order [${id}] from DB:`, error);
      return false;
    }
  }
}

export const orderRepository = new OrderRepository();
