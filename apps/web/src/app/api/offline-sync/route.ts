import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { orderRepository } from '@/repositories/order.repository';
import { taskRepository } from '@/repositories/task.repository';
import { cache, redisClient } from '@/lib/cache';
import { queue } from '@/lib/queue';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orders = [], tasks = [], clientTime } = body;

    const serverTime = new Date();
    const anomalyThresholdMs = 5 * 60 * 1000; // 5 minutes

    const syncedIds: string[] = [];
    const syncedTaskIds: string[] = [];
    const anomalies: Array<{ orderId: string; type: string; details: string }> = [];

    // 1. Time Sync Anomaly Check for client payload overall
    let isClientClockSkewed = false;
    if (clientTime) {
      const clientDate = new Date(clientTime);
      const skew = Math.abs(serverTime.getTime() - clientDate.getTime());
      if (skew > anomalyThresholdMs) {
        isClientClockSkewed = true;
        console.warn(`Time Sync Anomaly: Client clock skew detected (${skew / 1000}s difference)`);
      }
    }

    // Cache to collect locations to invalidate later
    const locationsToInvalidate = new Set<string>();

    for (const orderData of orders) {
      try {
        let orderCreatedAt = orderData.createdAt ? new Date(orderData.createdAt) : serverTime;
        let orderUpdatedAt = orderData.updatedAt ? new Date(orderData.updatedAt) : serverTime;

        // Check for future timestamp anomalies on individual orders
        if (orderCreatedAt.getTime() > serverTime.getTime() + anomalyThresholdMs) {
          anomalies.push({
            orderId: orderData.id,
            type: 'future_created_at',
            details: `Order created at ${orderCreatedAt.toISOString()} which is in the future. Resetting to server time.`,
          });
          orderCreatedAt = serverTime;
          orderUpdatedAt = serverTime;
        }

        // Keep track of location
        const locationId = orderData.locationId || 'default-location';
        locationsToInvalidate.add(locationId);

        // Check if order exists in PostgreSQL
        const existingOrder = await orderRepository.findById(orderData.id);

        let finalOrder;
        if (existingOrder) {
          // Conflict Resolution: Merge based on updatedAt
          const existingUpdatedAt = new Date(existingOrder.updatedAt);
          if (orderUpdatedAt.getTime() > existingUpdatedAt.getTime()) {
            // Client has newer information: update the order
            finalOrder = await orderRepository.update(orderData.id, {
              status: orderData.status,
              paymentStatus: orderData.paymentStatus,
              total: orderData.total,
              items: orderData.items,
              tableId: orderData.tableId,
            });
          } else {
            // Server version is newer or equal: skip updating order but treat as synced
            finalOrder = existingOrder;
          }
        } else {
          // Order does not exist: create it
          finalOrder = await orderRepository.create({
            id: orderData.id,
            locationId: locationId,
            status: orderData.status,
            paymentStatus: orderData.paymentStatus,
            total: orderData.total,
            items: orderData.items,
            tableId: orderData.tableId,
            // Pass additional fields that might be custom
            ...orderData,
          });

          // If createdAt needs to be overridden to be accurate (preserving client history unless anomalous)
          await prisma.order.update({
            where: { id: finalOrder.id },
            data: {
              createdAt: orderCreatedAt,
              updatedAt: orderUpdatedAt,
            },
          });
        }

        // Trigger tax compliance (VERI*FACTU) if completed + paid and not already fiscalized
        if (finalOrder.status === 'completed' && finalOrder.paymentStatus === 'paid') {
          const existingFiscal = await prisma.fiscalRecord.findFirst({
            where: { orderId: finalOrder.id },
          });
          if (!existingFiscal) {
            await queue.publish('verifactu:sync', { orderId: finalOrder.id });
          }
        }

        // Broadcast websocket event via Redis
        await redisClient.publish(
          'pos-events',
          JSON.stringify({
            name: existingOrder ? 'order:updated' : 'order:created',
            payload: finalOrder,
          })
        );

        syncedIds.push(orderData.id);
      } catch (orderError: any) {
        console.error(`Failed to sync individual order [${orderData.id}]:`, orderError);
        anomalies.push({
          orderId: orderData.id,
          type: 'sync_error',
          details: orderError.message || String(orderError),
        });
      }
    }

    // Invalidate Redis caches for active orders of affected locations
    for (const locId of locationsToInvalidate) {
      await cache.delete(`active_orders_${locId}`);
    }

    for (const taskData of tasks) {
      try {
        const synced = await taskRepository.syncFromClient(taskData);
        syncedTaskIds.push(synced.id);
      } catch (taskError: any) {
        console.error(`Failed to sync task [${taskData.id}]:`, taskError);
        anomalies.push({
          orderId: taskData.id,
          type: 'task_sync_error',
          details: taskError.message || String(taskError),
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        syncedIds,
        syncedTaskIds,
        clientClockSkewed: isClientClockSkewed,
        anomalies,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in offline-sync route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
