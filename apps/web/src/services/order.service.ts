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

async function invalidateActiveOrdersCache(locationId: string) {
  await cache.delete(`active_orders_${locationId}`);
  await cache.delete('active_orders_all');
}

export class OrderService {
  
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order = await orderRepository.create(orderData);

    await invalidateActiveOrdersCache(order.locationId);
    await broadcastEvent('order:created', {
      orderId: order.id,
      locationId: order.locationId,
      status: order.status,
    });

    return order;
  }

  async getActiveOrders(locationId: string, options?: { bypassCache?: boolean }): Promise<Order[]> {
    const cacheKey = locationId === 'all' ? 'active_orders_all' : `active_orders_${locationId}`;
    
    if (!options?.bypassCache) {
      const cachedOrders = await cache.get<Order[]>(cacheKey);
      if (cachedOrders) {
        return cachedOrders;
      }
    }
    
    const orders = await orderRepository.findBoardOrders(
      locationId === 'all' ? undefined : locationId
    );
    
    await cache.set(cacheKey, orders, 60);
    
    return orders;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const updatedOrder = await orderRepository.updateStatus(orderId, status);

    if (status === 'completed' && updatedOrder.paymentStatus === 'paid') {
      await queue.publish('verifactu:sync', { orderId: updatedOrder.id });
    }

    await invalidateActiveOrdersCache(updatedOrder.locationId);
    await broadcastEvent('order:updated', {
      orderId: updatedOrder.id,
      locationId: updatedOrder.locationId,
      status: updatedOrder.status,
    });

    return updatedOrder;
  }

  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    const payload = data as Partial<Order> & Record<string, unknown>;
    const hasNonStatusFields = Object.entries(payload).some(
      ([key, value]) => key !== 'status' && value !== undefined
    );

    if (payload.status && !hasNonStatusFields) {
      return this.updateOrderStatus(orderId, payload.status as OrderStatus);
    }

    const updatedOrder = await orderRepository.update(orderId, data);
    await invalidateActiveOrdersCache(updatedOrder.locationId);
    await broadcastEvent('order:updated', {
      orderId: updatedOrder.id,
      locationId: updatedOrder.locationId,
      status: updatedOrder.status,
      paid: updatedOrder.paid,
    });
    return updatedOrder;
  }

  async completePayment(orderId: string, payload: CompletePaymentPayload): Promise<Order & { warnings?: string[] }> {
    const updatedOrder = await orderRepository.completePayment(orderId, payload);

    if (updatedOrder.paid) {
      void ensureFiscalRecord(updatedOrder.id);
      queue.publish('verifactu:sync', { orderId: updatedOrder.id }).catch(console.error);

      const source = (updatedOrder as Order & { source?: string }).source;
      if (source === 'guest_emenu' || source === 'guest_merch_pickup') {
        try {
          const { guestMerchService } = await import('./guest-merch.service');
          await guestMerchService.confirmMerchSale(orderId);
        } catch (error) {
          console.error(`[Guest] Merch inventory deduct failed for order ${orderId}:`, error);
        }
      }
    }

    await invalidateActiveOrdersCache(updatedOrder.locationId);
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
