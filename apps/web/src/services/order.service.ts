import { orderRepository } from '../repositories/order.repository';
import { queue } from '../lib/queue';
import { cache } from '../lib/cache';
import { Order, OrderStatus } from '../lib/types/domain';

export class OrderService {
  
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order = await orderRepository.create(orderData);
    
    // Invalidate any cached active orders list
    await cache.delete(`active_orders_${order.locationId}`);
    
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
    
    // If completed, trigger the background job for tax compliance (VERI*FACTU)
    if (status === 'completed' && updatedOrder.paymentStatus === 'paid') {
      await queue.publish('verifactu:sync', { orderId: updatedOrder.id });
    }
    
    // Invalidate cache
    await cache.delete(`active_orders_${updatedOrder.locationId}`);
    
    return updatedOrder;
  }

  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    const updatedOrder = await orderRepository.update(orderId, data);
    
    // If status is completed, trigger background job
    if (data.status === 'completed' && updatedOrder.paymentStatus === 'paid') {
      await queue.publish('verifactu:sync', { orderId: updatedOrder.id });
    }
    
    // Invalidate cache
    await cache.delete(`active_orders_${updatedOrder.locationId}`);
    
    return updatedOrder;
  }
}

export const orderService = new OrderService();
