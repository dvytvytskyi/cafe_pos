import { prisma } from '@/lib/db';
import { calculateOrderPricing } from '@/lib/order-totals';

export interface AddOrderItemInput {
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  comments?: string;
  modifierSnapshot?: unknown;
  soldByStaffId?: string;
  guestIndex?: number;
}

export interface UpdateOrderItemInput {
  name?: string;
  price?: number;
  quantity?: number;
  comments?: string;
  modifierSnapshot?: unknown;
  guestIndex?: number;
  served?: boolean;
}

export class OrderItemService {
  private recalcTotal(items: { price: number; quantity: number }[]) {
    return calculateOrderPricing(items).total;
  }

  async addItems(orderId: string, items: AddOrderItemInput[]) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error('Order not found');
    if (order.paid && order.isPrepaid) throw new Error('Cannot modify prepaid delivery order');

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const item of items) {
        const row = await tx.orderItem.create({
          data: {
            orderId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            comments: item.comments ?? null,
            menuItemId: item.menuItemId ?? null,
            modifierSnapshot: item.modifierSnapshot ?? null,
            soldByStaffId: item.soldByStaffId ?? null,
            guestIndex: item.guestIndex ?? null,
            itemType: 'food',
            sentToKitchen: false,
            sentToBar: false,
          },
        });
        rows.push(row);
      }

      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const total = this.recalcTotal(allItems);
      await tx.order.update({ where: { id: orderId }, data: { total } });
      return { rows, total };
    });

    return created;
  }

  async updateItem(orderId: string, itemId: string, patch: UpdateOrderItemInput) {
    const item = await prisma.orderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item) throw new Error('Order item not found');

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.paid && order.isPrepaid) throw new Error('Cannot modify prepaid delivery order');

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.price !== undefined ? { price: patch.price } : {}),
        ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
        ...(patch.comments !== undefined ? { comments: patch.comments } : {}),
        ...(patch.modifierSnapshot !== undefined
          ? { modifierSnapshot: patch.modifierSnapshot as object }
          : {}),
        ...(patch.guestIndex !== undefined ? { guestIndex: patch.guestIndex } : {}),
        ...(patch.served !== undefined ? { served: patch.served } : {}),
      },
    });

    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    const total = this.recalcTotal(allItems);
    await prisma.order.update({ where: { id: orderId }, data: { total } });

    return prisma.orderItem.findUnique({ where: { id: itemId } });
  }

  async splitItem(
    orderId: string,
    itemId: string,
    portions: Array<{ guestIndex: number; quantity: number }>,
  ) {
    const item = await prisma.orderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item) throw new Error('Order item not found');

    const qtySum = portions.reduce((s, p) => s + p.quantity, 0);
    if (qtySum !== item.quantity) {
      throw new Error(`Portion quantities (${qtySum}) must equal item quantity (${item.quantity})`);
    }

    await prisma.$transaction(async (tx) => {
      const [first, ...rest] = portions;
      await tx.orderItem.update({
        where: { id: itemId },
        data: { quantity: first.quantity, guestIndex: first.guestIndex },
      });

      for (const portion of rest) {
        await tx.orderItem.create({
          data: {
            orderId,
            name: item.name,
            price: item.price,
            quantity: portion.quantity,
            comments: item.comments,
            menuItemId: item.menuItemId,
            modifierSnapshot: item.modifierSnapshot ?? undefined,
            itemType: item.itemType,
            guestIndex: portion.guestIndex,
            soldByStaffId: item.soldByStaffId,
            sentToKitchen: item.sentToKitchen,
            sentToBar: item.sentToBar,
          },
        });
      }
    });

    return prisma.orderItem.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
  }
}

export const orderItemService = new OrderItemService();
