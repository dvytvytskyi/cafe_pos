import { orderRepository, CompletePaymentPayload } from '../repositories/order.repository';
import { queue } from '../lib/queue';
import { cache } from '../lib/cache';
import { broadcastEvent } from '../lib/ws-client';
import { Order, OrderStatus } from '../lib/types/domain';
import type { OrderHistoryFilters } from '../lib/order-history-validation';

async function ensureFiscalRecord(orderId: string) {
  try {
    const { fiscalService } = await import('./fiscal.service');
    await fiscalService.generateFiscalRecord(orderId);
  } catch (error) {
    console.error(`[Fiscal] Auto-generation failed for order ${orderId}:`, error);
  }
}

export class OrderService {
  
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order = await orderRepository.create(orderData);

    await cache.delete(`active_orders_${order.locationId}`);
    await broadcastEvent('order:created', {
      orderId: order.id,
      locationId: order.locationId,
      status: order.status,
    });

    return order;
  }

  async getActiveOrders(locationId: string): Promise<Order[]> {
    const cacheKey = `active_orders_${locationId}`;
    
    // Try to get from cache first
    const cachedOrders = await cache.get<Order[]>(cacheKey);
    if (cachedOrders) {
      return cachedOrders;
    }
    
    // Fetch from repository
    const orders = await orderRepository.findActiveOrders();
    const locationOrders = orders.filter(o => o.locationId === locationId);
    
    // Save to cache for 60 seconds
    await cache.set(cacheKey, locationOrders, 60);
    
    return locationOrders;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const updatedOrder = await orderRepository.updateStatus(orderId, status);

    if (status === 'completed' && updatedOrder.paymentStatus === 'paid') {
      await queue.publish('verifactu:sync', { orderId: updatedOrder.id });
    }

    await cache.delete(`active_orders_${updatedOrder.locationId}`);
    await broadcastEvent('order:updated', {
      orderId: updatedOrder.id,
      locationId: updatedOrder.locationId,
      status: updatedOrder.status,
    });

    return updatedOrder;
  }

  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    if (data.status) {
      return this.updateOrderStatus(orderId, data.status as OrderStatus);
    }

    const updatedOrder = await orderRepository.update(orderId, data);
    await cache.delete(`active_orders_${updatedOrder.locationId}`);
    await broadcastEvent('order:updated', {
      orderId: updatedOrder.id,
      locationId: updatedOrder.locationId,
      status: updatedOrder.status,
    });
    return updatedOrder;
  }

  async completePayment(orderId: string, payload: CompletePaymentPayload): Promise<Order & { warnings?: string[] }> {
    const updatedOrder = await orderRepository.completePayment(orderId, payload);

    if (updatedOrder.paid) {
      void ensureFiscalRecord(updatedOrder.id);
      queue.publish('verifactu:sync', { orderId: updatedOrder.id }).catch(console.error);
    }

    await cache.delete(`active_orders_${updatedOrder.locationId}`);
    await broadcastEvent('order:updated', {
      orderId: updatedOrder.id,
      locationId: updatedOrder.locationId,
      status: updatedOrder.status,
      paid: updatedOrder.paid,
    });

    return updatedOrder;
  }

  async getOrderHistory(filters: OrderHistoryFilters) {
    const { items, total } = await orderRepository.findOrderHistory(filters);
    const totalPages = Math.max(1, Math.ceil(total / filters.limit));
    return {
      orders: items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages,
    };
  }
}

export const orderService = new OrderService();
