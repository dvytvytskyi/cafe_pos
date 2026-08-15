import { prisma } from '../lib/db';
import { orderService } from './order.service';
import { guestMerchService } from './guest-merch.service';
import {
  GuestValidationError,
  validateGuestOrderLines,
  validateTipInput,
  validatePointsToSpend,
  type GuestOrderLineInput,
} from '../lib/guest-validation';
import { normalizeTableId } from '../lib/guest-validation';

function lineTotal(line: GuestOrderLineInput): number {
  const modTotal = (line.modifiers ?? []).reduce((s, m) => s + m.price, 0);
  return (line.unitPrice + modTotal) * line.quantity;
}

function formatItemName(line: GuestOrderLineInput): string {
  const mods = (line.modifiers ?? []).map((m) => m.optionName).join(', ');
  return mods ? `${line.name} (${mods})` : line.name;
}

export class GuestOrderService {
  async resolveTable(locationId: string, tableParam: string | undefined) {
    if (!tableParam) return null;
    const normalized = normalizeTableId(tableParam);
    const table = await prisma.table.findFirst({
      where: {
        locationId,
        OR: [{ id: normalized }, { id: tableParam }, { number: tableParam.replace(/^[Tt]/, '') }],
      },
    });
    if (!table) throw new GuestValidationError('Table not found');
    return { id: table.id, number: table.number };
  }

  async createFoodOrder(body: Record<string, unknown>, customerId?: string) {
    const locationId = typeof body.locationId === 'string' ? body.locationId : 'default';
    const tableId =
      typeof body.tableId === 'string' ? body.tableId : undefined;
    const lines = validateGuestOrderLines(body.items);
    const tip = validateTipInput(body.tipType, body.tipValue);

    const resolvedCustomerId =
      customerId || (typeof body.customerId === 'string' ? body.customerId : undefined);

    let customerPoints: number | undefined;
    if (resolvedCustomerId) {
      const customer = await prisma.customer.findUnique({ where: { id: resolvedCustomerId } });
      if (!customer) throw new GuestValidationError('Customer not found');
      customerPoints = customer.points;
    }
    const pointsToSpend = validatePointsToSpend(body.pointsToSpend, customerPoints);

    if (tableId) {
      await this.resolveTable(locationId, tableId);
    }

    for (const line of lines) {
      if (line.itemType === 'merch' && line.merchSkuId) {
        await guestMerchService.validateStock(line.merchSkuId, locationId, line.quantity);
      }
    }

    let subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
    let tipAmount = 0;
    if (tip.tipType === 'percent' && tip.tipValue) {
      tipAmount = (subtotal * tip.tipValue) / 100;
    } else if (tip.tipType === 'fixed' && tip.tipValue) {
      tipAmount = tip.tipValue;
    }
    const total = Math.max(0, subtotal + tipAmount - pointsToSpend);

    const orderId = `GUEST-${Date.now().toString().slice(-8)}`;
    const customerName =
      typeof body.customerName === 'string' ? body.customerName : 'Guest';

    const order = await orderService.createOrder({
      id: orderId,
      locationId,
      tableId,
      source: 'guest_emenu',
      status: 'incoming',
      paymentStatus: 'unpaid',
      paid: false,
      customerName,
      customerId: resolvedCustomerId,
      total,
      tipType: tip.tipType,
      tipValue: tip.tipValue ?? 0,
      pointsToSpend,
      items: lines.map((line) => ({
        name: formatItemName(line),
        price: lineTotal(line) / line.quantity,
        quantity: line.quantity,
        comments: line.comments,
        itemType: line.itemType,
        menuItemId: line.menuItemId,
        merchSkuId: line.merchSkuId,
        modifierSnapshot: line.modifiers,
      })) as any,
      loyaltyGuestIds: resolvedCustomerId ? [resolvedCustomerId] : undefined,
    } as any);

    if (tableId) {
      try {
        await prisma.table.update({
          where: { id: tableId },
          data: { status: 'occupied' },
        });
      } catch {
        // non-blocking if table id mismatch
      }
    }

    return this.toSummary(order.id);
  }

  async createMerchPickupOrder(body: Record<string, unknown>, customerId?: string) {
    const locationId = typeof body.locationId === 'string' ? body.locationId : 'default';
    const lines = validateGuestOrderLines(body.items).filter((l) => l.itemType === 'merch');
    if (lines.length === 0) throw new GuestValidationError('Merch order requires merch items');

    for (const line of lines) {
      if (line.merchSkuId) {
        await guestMerchService.validateStock(line.merchSkuId, locationId, line.quantity);
      }
    }

    const total = lines.reduce((s, l) => s + lineTotal(l), 0);
    const orderId = `MERCH-${Date.now().toString().slice(-8)}`;

    const order = await orderService.createOrder({
      id: orderId,
      locationId,
      source: 'guest_merch_pickup',
      status: 'incoming',
      paymentStatus: 'unpaid',
      paid: false,
      customerName: typeof body.customerName === 'string' ? body.customerName : 'Guest',
      customerId,
      total,
      items: lines.map((line) => ({
        name: line.name,
        price: line.unitPrice,
        quantity: line.quantity,
        itemType: 'merch',
        merchSkuId: line.merchSkuId,
      })) as any,
    } as any);

    return this.toSummary(order.id);
  }

  async getOrder(orderId: string, customerId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new GuestValidationError('Order not found');
    if (customerId) {
      const allowed =
        order.customerId === customerId || order.loyaltyGuestIds.includes(customerId);
      if (!allowed) throw new GuestValidationError('Order not found');
    }
    return this.mapOrder(order);
  }

  async listOrders(customerId: string) {
    const orders = await prisma.order.findMany({
      where: {
        OR: [{ customerId }, { loyaltyGuestIds: { has: customerId } }],
        source: { in: ['guest_emenu', 'guest_merch_pickup'] },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return orders.map((o) => this.mapOrder(o));
  }

  private async toSummary(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new GuestValidationError('Order creation failed');
    return this.mapOrder(order);
  }

  private mapOrder(order: {
    id: string;
    orderNumber: string;
    status: string;
    source: string;
    total: number;
      paid: boolean;
    tableId: string | null;
    pointsToSpend?: number;
    createdAt: Date;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      itemType: string;
      comments: string | null;
    }>;
  }) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      source: order.source,
      total: order.total,
      paid: order.paid,
      pointsToSpend: order.pointsToSpend ?? 0,
      tableId: order.tableId ?? undefined,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        itemType: i.itemType,
        comments: i.comments ?? undefined,
      })),
    };
  }
}

export const guestOrderService = new GuestOrderService();
