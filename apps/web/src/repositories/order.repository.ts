import { prisma } from '../lib/db';
import { Order, OrderStatus } from '../lib/types/domain';

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
    items: (dbOrder.items || []).map((item: any) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      paid: item.paid,
      comments: item.comments || undefined,
    })),
    subtotal: dbOrder.total,
    tax: dbOrder.total * 0.1,
    total: dbOrder.total,
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

export class OrderRepository {
  
  async findById(id: string): Promise<Order | null> {
    try {
      const dbOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
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
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
      return dbOrders.map(mapToDomainOrder);
    } catch (error) {
      console.error('Error finding all orders in DB:', error);
      throw error;
    }
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
        include: { items: true },
      });

      return mapToDomainOrder(dbOrder);
    } catch (error) {
      console.error(`Error updating order [${id}] in DB:`, error);
      throw error;
    }
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
