import { prisma } from '../lib/db';
import { Order, OrderStatus } from '../lib/types/domain';
import { crmRepository } from './crm.repository';
import { auditRepository } from './audit.repository';
import { shiftRepository } from './shift.repository';
import type { OrderHistoryFilters } from '../lib/order-history-validation';
import { normalizeSearchText } from '../lib/order-history-validation';
import { coerceStatusForSource } from '../lib/orders-board';
import { isDeliverySource, calculateCashChange } from '../lib/order-totals';

async function findCustomerIdsForOrderHistoryQuery(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  const directMatches = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ],
    },
    select: { id: true, name: true, email: true, phone: true },
    take: 100,
  });

  const ids = new Set(directMatches.map((c) => c.id));
  const normalizedQ = normalizeSearchText(q.toLowerCase());

  if (normalizedQ.length >= 2) {
    const candidates = await prisma.customer.findMany({
      ...(ids.size > 0 ? { where: { id: { notIn: [...ids] } } } : {}),
      select: { id: true, name: true, email: true, phone: true },
      take: 500,
      orderBy: { name: 'asc' },
    });

    for (const c of candidates) {
      const name = normalizeSearchText(c.name.toLowerCase());
      const email = normalizeSearchText(c.email.toLowerCase());
      if (
        name.includes(normalizedQ) ||
        email.includes(normalizedQ) ||
        c.phone.includes(q)
      ) {
        ids.add(c.id);
      }
    }
  }

  return [...ids];
}

export interface PaymentLine {
  method: 'card' | 'cash' | 'points' | 'giftcard';
  amount: number;
  code?: string;
  cashTendered?: number;
}

export interface CompletePaymentPayload {
  payments: PaymentLine[];
  customerId?: string;
  discount?: { name: string; value: number; type?: 'percent' | 'fixed' };
  tip?: { type: 'percent' | 'fixed'; value: number };
  total?: number;
  paidItemIndexes?: number[];
  /** When false, fully paid orders keep their current status (e.g. POS prepaid preparing). */
  markCompleted?: boolean;
  closedByStaffId?: string;
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
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      paid: item.paid,
      comments: item.comments || undefined,
      refundedQuantity: item.refundedQuantity ?? 0,
      menuItemId: item.menuItemId || undefined,
      modifierSnapshot: item.modifierSnapshot ?? undefined,
      guestIndex: item.guestIndex ?? undefined,
      soldByStaffId: item.soldByStaffId || undefined,
      sentToKitchen: item.sentToKitchen ?? false,
      sentToBar: item.sentToBar ?? false,
      served: item.served ?? false,
    })),
    subtotal: dbOrder.total,
    tax: dbOrder.total * 0.1,
    total: dbOrder.total,
    refundedAmount: dbOrder.refundedAmount ?? 0,
    createdAt: dbOrder.createdAt,
    updatedAt: dbOrder.updatedAt,
    discountName: dbOrder.discountName || undefined,
    discountValue: dbOrder.discountValue ?? 0,
    discountType: dbOrder.discountType || 'percent',
    tipType: dbOrder.tipType || undefined,
    tipValue: dbOrder.tipValue ?? 0,
    guestCount: dbOrder.guestCount ?? undefined,
    takenByStaffId: dbOrder.takenByStaffId || undefined,
    servedByStaffId: dbOrder.servedByStaffId || undefined,
    closedByStaffId: dbOrder.closedByStaffId || undefined,
    assignedStaffId: dbOrder.assignedStaffId || undefined,
    isPrepaid: dbOrder.isPrepaid ?? false,
    invoiceEmail: dbOrder.invoiceEmail || undefined,
    receiptsSentTo: dbOrder.receiptsSentTo ?? [],
    deliveryId: dbOrder.orderNumber.startsWith('GLV') || dbOrder.orderNumber.startsWith('UBR') ? dbOrder.orderNumber : undefined,
    orderedBy: dbOrder.source === 'dine_in' || dbOrder.source === 'takeaway' ? 'waiter' : 'app',
    customerId: dbOrder.customerId || undefined,
    loyaltyGuestIds: dbOrder.loyaltyGuestIds?.length
      ? dbOrder.loyaltyGuestIds
      : dbOrder.customerId
        ? [dbOrder.customerId]
        : [],
    customerName: dbOrder.customerName || '',
    orderNumber: dbOrder.orderNumber,
    pointsToSpend: dbOrder.pointsToSpend ?? 0,
  } as Order;
}

export type OrderHistoryRecord = Order & {
  orderNumber: string;
  tableNumber: string | null;
  waiterName: string | null;
  customerPointsEarned?: number;
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
      AND: [
        {
          OR: [
            { paid: true },
            { status: 'completed' },
            { status: 'cancelled' },
            { refundedAmount: { gt: 0 } },
          ],
        },
      ],
    };

    if (filters.source) where.source = filters.source;

    if (filters.customerId) {
      (where.AND as Record<string, unknown>[]).push({
        OR: [
          { customerId: filters.customerId },
          { loyaltyGuestIds: { has: filters.customerId } },
        ],
      });
    }

    if (filters.query) {
      const q = filters.query.trim();
      const customerIds = await findCustomerIdsForOrderHistoryQuery(q);
      const orConditions: Record<string, unknown>[] = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
      ];

      const looksLikeOrderId =
        /^(ORD|GLV|UBR)/i.test(q) || /^[0-9a-f-]{8,}$/i.test(q);
      if (looksLikeOrderId) {
        orConditions.push({ id: { contains: q, mode: 'insensitive' } });
      }

      if (customerIds.length > 0) {
        orConditions.push({ customerId: { in: customerIds } });
        orConditions.push({ loyaltyGuestIds: { hasSome: customerIds } });
      }

      (where.AND as Record<string, unknown>[]).push({ OR: orConditions });
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

    const orderIds = dbOrders.map((row) => row.id);
    const earnRows =
      orderIds.length > 0
        ? await prisma.loyaltyTransaction.findMany({
            where: { orderId: { in: orderIds }, type: 'earn' },
          })
        : [];

    const pointsByOrderCustomer = new Map<string, number>();
    for (const tx of earnRows) {
      if (!tx.orderId) continue;
      const key = `${tx.orderId}:${tx.customerId}`;
      pointsByOrderCustomer.set(key, (pointsByOrderCustomer.get(key) ?? 0) + tx.points);
    }

    const items = dbOrders.map((row) => {
      const domain = mapToDomainOrder(row);
      const guestId = filters.customerId ?? row.customerId ?? undefined;
      const customerPointsEarned = guestId
        ? pointsByOrderCustomer.get(`${row.id}:${guestId}`) ?? 0
        : row.customerId
          ? pointsByOrderCustomer.get(`${row.id}:${row.customerId}`) ?? 0
          : 0;
      return {
        ...domain,
        orderNumber: row.orderNumber,
        tableNumber: row.table?.number ?? null,
        waiterName: resolveWaiterName(row.createdAt, shifts),
        customerPointsEarned,
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

  async findBoardOrders(locationId?: string): Promise<Order[]> {
    try {
      const locationFilter = locationId ? { locationId } : {};
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [pipeline, terminal] = await prisma.$transaction([
        prisma.order.findMany({
          where: {
            status: { in: ['incoming', 'preparing', 'ready', 'served'] },
            ...locationFilter,
          },
          include: { items: true, transactions: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.order.findMany({
          where: {
            status: { in: ['completed', 'cancelled'] },
            updatedAt: { gte: startOfDay },
            ...locationFilter,
          },
          include: { items: true, transactions: true },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        }),
      ]);

      return [...pipeline, ...terminal].map(mapToDomainOrder);
    } catch (error) {
      console.error('Error finding board orders in DB:', error);
      throw error;
    }
  }

  /** @deprecated Use findBoardOrders */
  async findActiveOrders(locationId?: string): Promise<Order[]> {
    return this.findBoardOrders(locationId);
  }

  async create(data: Partial<Order>): Promise<Order> {
    try {
      const orderNumber = data.deliveryId || `ORD-${Date.now().toString().slice(-6)}`;
      const source = data.source || 'dine_in';
      const status = data.status || 'preparing';
      const deliveryPrepaid = isDeliverySource(source);
      const paid =
        data.paymentStatus === 'paid' || data.paid || deliveryPrepaid || false;
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
          discountType: (data as any).discountType || null,
          tipType: (data as any).tipType || null,
          tipValue: (data as any).tipValue ?? 0,
          pointsToSpend: (data as any).pointsToSpend ?? 0,
          guestCount: (data as any).guestCount ?? null,
          takenByStaffId: (data as any).takenByStaffId ?? null,
          servedByStaffId: (data as any).servedByStaffId ?? null,
          assignedStaffId: (data as any).assignedStaffId ?? null,
          isPrepaid: deliveryPrepaid || (data as any).isPrepaid === true,
          paid,
          amountPaid,
          loyaltyGuestIds: (data as any).loyaltyGuestIds ?? [],
          items: {
            create: (data.items || []).map((item: any) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              paid: item.paid || false,
              comments: item.comments || null,
              itemType: item.itemType || 'food',
              menuItemId: item.menuItemId || null,
              merchSkuId: item.merchSkuId || null,
              modifierSnapshot: item.modifierSnapshot ?? null,
              soldByStaffId: item.soldByStaffId || null,
              guestIndex: item.guestIndex ?? null,
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
      if (data.status) {
        const existing = await prisma.order.findUnique({ where: { id }, select: { source: true } });
        updateData.status = existing
          ? coerceStatusForSource(existing.source, data.status)
          : data.status;
      }
      if (data.total !== undefined) updateData.total = data.total;
      if (data.paymentStatus) {
        updateData.paid = data.paymentStatus === 'paid';
        updateData.amountPaid = updateData.paid ? (data.total || 0) : 0;
      }
      if (data.tableId !== undefined) updateData.tableId = data.tableId;
      if (data.customerName !== undefined) updateData.customerName = data.customerName;
      if (data.customerId !== undefined) updateData.customerId = data.customerId;
      if ((data as any).loyaltyGuestIds !== undefined) {
        updateData.loyaltyGuestIds = (data as any).loyaltyGuestIds;
      }
      if (data.source !== undefined) updateData.source = data.source;
      if ((data as any).discountName !== undefined) updateData.discountName = (data as any).discountName;
      if ((data as any).discountValue !== undefined) updateData.discountValue = (data as any).discountValue;
      if ((data as any).discountType !== undefined) updateData.discountType = (data as any).discountType;
      if ((data as any).tipType !== undefined) updateData.tipType = (data as any).tipType;
      if ((data as any).tipValue !== undefined) updateData.tipValue = (data as any).tipValue;
      if ((data as any).guestCount !== undefined) updateData.guestCount = (data as any).guestCount;
      if ((data as any).takenByStaffId !== undefined) updateData.takenByStaffId = (data as any).takenByStaffId;
      if ((data as any).servedByStaffId !== undefined) updateData.servedByStaffId = (data as any).servedByStaffId;
      if ((data as any).closedByStaffId !== undefined) updateData.closedByStaffId = (data as any).closedByStaffId;
      if ((data as any).assignedStaffId !== undefined) updateData.assignedStaffId = (data as any).assignedStaffId;
      if ((data as any).pointsToSpend !== undefined) updateData.pointsToSpend = (data as any).pointsToSpend;

      // Replace line items only when a non-empty list is sent (never wipe via [])
      if (Array.isArray(data.items) && data.items.length > 0) {
        await prisma.orderItem.deleteMany({ where: { orderId: id } });
        updateData.items = {
          create: data.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            paid: item.paid || false,
            comments: item.comments || null,
            menuItemId: item.menuItemId || null,
            modifierSnapshot: item.modifierSnapshot ?? null,
            soldByStaffId: item.soldByStaffId || null,
            guestIndex: item.guestIndex ?? null,
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
      if (order.isPrepaid || isDeliverySource(order.source)) {
        throw new Error('Delivery orders are prepaid and cannot be checked out from POS');
      }
      if (order.items.length === 0 && order.total > 0.01) {
        throw new Error('Cannot checkout: order line items are missing. Re-open the order from the table or create a new one.');
      }

      const paymentTotal = payload.payments.reduce((sum, p) => sum + p.amount, 0);
      if (paymentTotal <= 0) throw new Error('Payment amount must be greater than zero');

      const hasCash = payload.payments.some((p) => p.method === 'cash');
      if (hasCash) {
        const openShift = await shiftRepository.findActiveShift(order.locationId);
        if (!openShift) {
          warnings.push('NO_OPEN_SHIFT');
        }
      }

      const reservedPoints = Number(order.pointsToSpend ?? 0);
      const explicitPoints = payload.payments
        .filter((p) => p.method === 'points')
        .reduce((sum, p) => sum + p.amount, 0);
      const pointsToDeduct =
        explicitPoints > 0.001 ? explicitPoints : reservedPoints > 0.001 ? reservedPoints : 0;
      const customerId =
        payload.customerId ||
        order.customerId ||
        order.loyaltyGuestIds?.[0] ||
        undefined;

      if (pointsToDeduct > 0) {
        if (!customerId) throw new Error('Customer required for points payment');
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error('Customer not found');
        if (customer.points < pointsToDeduct - 0.001) {
          throw new Error('Insufficient loyalty points');
        }
        const newPoints = parseFloat((customer.points - pointsToDeduct).toFixed(2));
        await tx.customer.update({
          where: { id: customerId },
          data: { points: Math.max(0, newPoints) },
        });
        await tx.loyaltyTransaction.create({
          data: {
            customerId,
            type: 'spend',
            points: pointsToDeduct,
            orderId,
          },
        });
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
        let cashTendered: number | null = null;
        let changeGiven: number | null = null;
        if (payment.method === 'cash' && payment.cashTendered != null) {
          const change = calculateCashChange(payment.amount, payment.cashTendered);
          cashTendered = change.cashTendered;
          changeGiven = change.changeGiven;
        }
        await tx.transaction.create({
          data: {
            orderId,
            method: payment.method,
            amount: payment.amount,
            code: payment.code || null,
            cashTendered,
            changeGiven,
            recordedByStaffId: payload.closedByStaffId || null,
          },
        });
      }
      if (reservedPoints > 0.001 && explicitPoints < 0.001) {
        await tx.transaction.create({
          data: {
            orderId,
            method: 'points',
            amount: reservedPoints,
            code: null,
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
        if (reservedPoints > 0.001 && explicitPoints < 0.001) {
          pointsDelta += reservedPoints;
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
        status: isFullyPaid
          ? (payload.markCompleted === false ? order.status : 'completed')
          : order.status,
        total: orderTotal,
      };
      if (payload.discount) {
        updateData.discountName = payload.discount.name;
        updateData.discountValue = payload.discount.value;
        updateData.discountType = payload.discount.type ?? 'percent';
      }
      if (payload.tip) {
        updateData.tipType = payload.tip.type;
        updateData.tipValue = payload.tip.value;
      }
      if (payload.closedByStaffId) {
        updateData.closedByStaffId = payload.closedByStaffId;
      }
      if (customerId) updateData.customerId = customerId;

      await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      if (isFullyPaid && order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'available' },
        });
      }

      if (isFullyPaid && customerId) {
        const allTx = await tx.transaction.findMany({ where: { orderId } });
        const cashCardPaid = allTx
          .filter((t) => t.method === 'cash' || t.method === 'card' || t.method === 'giftcard')
          .reduce((sum, t) => sum + t.amount, 0);
        await crmRepository.applyLoyaltyTransactionInTx(
          tx,
          customerId,
          cashCardPaid,
          0,
          orderId
        );
      }

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, transactions: true },
      });
    });

    if (result.paid && result.status === 'completed') {
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
      const existing = await prisma.order.findUnique({ where: { id }, select: { source: true } });
      const nextStatus = existing
        ? (coerceStatusForSource(existing.source, status) as OrderStatus)
        : status;

      const dbOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id },
          data: { status: nextStatus },
          include: { items: true, transactions: true },
        });

        if (nextStatus === 'ready') {
          await tx.orderItem.updateMany({
            where: { orderId: id, readyAt: null },
            data: { readyAt: new Date() },
          });
        }

        return updated;
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

  async applyLoyaltyPoints(orderId: string, customerId: string, pointsToSpend: number): Promise<Order> {
    if (pointsToSpend < 0) throw new Error('Points must be non-negative');
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.paid) throw new Error('Cannot apply points to a paid order');

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error('Customer not found');
    if (customer.points < pointsToSpend - 0.001) {
      throw new Error('Insufficient loyalty points');
    }

    const loyaltyGuestIds = order.loyaltyGuestIds.includes(customerId)
      ? order.loyaltyGuestIds
      : [...order.loyaltyGuestIds, customerId];

    const dbOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        customerId,
        pointsToSpend,
        loyaltyGuestIds,
      },
      include: { items: true, transactions: true },
    });

    return mapToDomainOrder(dbOrder);
  }

  async getLoyaltyBalance(orderId: string, customerId?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    const cid = customerId || order.customerId || order.loyaltyGuestIds[0];
    if (!cid) return { customerId: null, points: 0, pointsToSpend: order.pointsToSpend };

    const customer = await prisma.customer.findUnique({ where: { id: cid } });
    return {
      customerId: cid,
      points: customer?.points ?? 0,
      pointsToSpend: order.pointsToSpend,
      customerName: customer?.name ?? null,
    };
  }
}

export const orderRepository = new OrderRepository();
