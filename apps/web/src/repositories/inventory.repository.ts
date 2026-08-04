import { prisma } from '../lib/db';

export class InventoryRepository {
  async getItems() {
    return prisma.merchInventory.findMany({
      include: { transfers: { orderBy: { createdAt: 'desc' } } },
      orderBy: { sku: 'asc' },
    });
  }

  async createItem(data: { name: string; sku: string; price: number; initialStock?: number }) {
    const initialStock = data.initialStock || 0;

    return prisma.$transaction(async (tx) => {
      const item = await tx.merchInventory.create({
        data: {
          name: data.name,
          sku: data.sku,
          price: data.price,
          quantity: initialStock,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryTransfer.create({
          data: {
            itemId: item.id,
            type: 'check_in',
            quantity: initialStock,
            reason: 'Initial stock setup',
          },
        });
      }

      return tx.merchInventory.findUnique({
        where: { id: item.id },
        include: { transfers: true },
      });
    });
  }

  async adjustStock(itemId: string, type: 'check_in' | 'check_out', quantity: number, reason?: string) {
    if (quantity <= 0) throw new Error('Quantity must be greater than zero');

    return prisma.$transaction(async (tx) => {
      const item = await tx.merchInventory.findUnique({ where: { id: itemId } });
      if (!item) throw new Error('Inventory item not found');

      let newQuantity = item.quantity;
      if (type === 'check_in') {
        newQuantity += quantity;
      } else {
        newQuantity -= quantity;
        if (newQuantity < 0) throw new Error(`Insufficient stock. Current: ${item.quantity}, requested deduction: ${quantity}`);
      }

      await tx.inventoryTransfer.create({
        data: {
          itemId,
          type,
          quantity,
          reason,
        },
      });

      return tx.merchInventory.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
        include: { transfers: { orderBy: { createdAt: 'desc' } } },
      });
    });
  }

  async deductStockFromOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    // Fetch all active inventory items
    const inventoryItems = await prisma.merchInventory.findMany();

    return prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        // Find matching inventory items by SKU or Name (case insensitive)
        const matched = inventoryItems.find(
          inv => inv.sku.toLowerCase() === orderItem.name.toLowerCase() ||
                 inv.name.toLowerCase() === orderItem.name.toLowerCase()
        );

        if (matched) {
          const qty = orderItem.quantity;
          const newQty = matched.quantity - qty;

          // Record deduction transfer log
          await tx.inventoryTransfer.create({
            data: {
              itemId: matched.id,
              type: 'sale',
              quantity: qty,
              reason: `Sales Order ${order.orderNumber}`,
            },
          });

          // Update inventory stock level
          await tx.merchInventory.update({
            where: { id: matched.id },
            data: { quantity: newQty < 0 ? 0 : newQty }, // Prevent negative stock levels
          });
        }
      }
    });
  }
}

export const inventoryRepository = new InventoryRepository();
