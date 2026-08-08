import { prisma } from '../lib/db.ts';
import {
  InventoryValidationError,
  validateCreateItemInput,
  validateStockQuantity,
  validateTransferInput,
  type StockTransferStatus,
} from '../lib/inventory-validation.ts';
import { INVENTORY_ITEMS_CACHE_KEY, invalidateInventoryCache } from '../lib/inventory-cache.ts';
import { cache } from '../lib/cache/index.ts';

export class InsufficientStockError extends Error {
  code = 'INSUFFICIENT_STOCK';

  constructor(available: number, requested: number) {
    super(`Insufficient stock. Available: ${available}, requested: ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

const STOCK_TRANSFER_INCLUDE = {
  item: { select: { id: true, sku: true, name: true, quantity: true, minStockLevel: true } },
} as const;

export class InventoryRepository {
  async getItems(useCache = true) {
    if (useCache) {
      const cached = await cache.get<Awaited<ReturnType<typeof this.fetchItems>>>(INVENTORY_ITEMS_CACHE_KEY);
      if (cached) return cached;
    }

    const items = await this.fetchItems();
    await cache.set(INVENTORY_ITEMS_CACHE_KEY, items, 300);
    return items;
  }

  private async fetchItems() {
    return prisma.merchInventory.findMany({
      include: { transfers: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { sku: 'asc' },
    });
  }

  async createItem(data: {
    name: string;
    sku: string;
    price: number;
    initialStock?: number;
    minStockLevel?: number;
  }) {
    const validated = validateCreateItemInput(data);
    const initialStock = validated.initialStock;

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.merchInventory.create({
        data: {
          name: validated.name,
          sku: validated.sku,
          price: validated.price,
          quantity: initialStock,
          minStockLevel: validated.minStockLevel,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryTransfer.create({
          data: {
            itemId: created.id,
            type: 'check_in',
            quantity: initialStock,
            reason: 'Initial stock setup',
          },
        });
      }

      return tx.merchInventory.findUnique({
        where: { id: created.id },
        include: { transfers: true },
      });
    });

    await invalidateInventoryCache();
    return item;
  }

  async adjustStock(itemId: string, type: 'check_in' | 'check_out', quantity: number, reason?: string) {
    const qty = validateStockQuantity(quantity);

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.merchInventory.findUnique({ where: { id: itemId } });
      if (!item) throw new InventoryValidationError('Inventory item not found');

      let newQuantity = item.quantity;
      if (type === 'check_in') {
        newQuantity += qty;
      } else {
        if (item.quantity < qty) {
          throw new InsufficientStockError(item.quantity, qty);
        }
        newQuantity -= qty;
      }

      await tx.inventoryTransfer.create({
        data: {
          itemId,
          type,
          quantity: qty,
          reason,
        },
      });

      return tx.merchInventory.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
        include: { transfers: { orderBy: { createdAt: 'desc' } } },
      });
    });

    await invalidateInventoryCache();
    return updated;
  }

  async getStockTransfers() {
    return prisma.stockTransfer.findMany({
      include: STOCK_TRANSFER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStockTransfer(input: {
    itemId: string;
    quantity: number;
    sourceLocationId?: string;
    targetLocationId: string;
    createdByName?: string;
  }) {
    const validated = validateTransferInput(input);

    const transfer = await prisma.$transaction(async (tx) => {
      const item = await tx.merchInventory.findUnique({ where: { id: validated.itemId } });
      if (!item) throw new InventoryValidationError('Inventory item not found');

      if (item.quantity < validated.quantity) {
        throw new InsufficientStockError(item.quantity, validated.quantity);
      }

      const newQuantity = item.quantity - validated.quantity;

      await tx.merchInventory.update({
        where: { id: validated.itemId },
        data: { quantity: newQuantity },
      });

      await tx.inventoryTransfer.create({
        data: {
          itemId: validated.itemId,
          type: 'check_out',
          quantity: validated.quantity,
          reason: `Transfer to ${validated.targetLocationId}`,
        },
      });

      return tx.stockTransfer.create({
        data: {
          itemId: validated.itemId,
          sourceLocationId: validated.sourceLocationId,
          targetLocationId: validated.targetLocationId,
          quantity: validated.quantity,
          status: 'in_transit',
          createdByName: validated.createdByName,
        },
        include: STOCK_TRANSFER_INCLUDE,
      });
    });

    await invalidateInventoryCache();
    return transfer;
  }

  async updateStockTransferStatus(id: string, status: StockTransferStatus) {
    if (status !== 'completed') {
      throw new InventoryValidationError('Only transition to completed is supported via API');
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const existing = await tx.stockTransfer.findUnique({
        where: { id },
        include: { item: true },
      });
      if (!existing) throw new InventoryValidationError('Transfer not found');
      if (existing.status === 'completed') return existing;

      if (existing.status !== 'in_transit') {
        throw new InventoryValidationError('Only in_transit transfers can be completed');
      }

      await tx.inventoryTransfer.create({
        data: {
          itemId: existing.itemId,
          type: 'check_in',
          quantity: existing.quantity,
          reason: `Transfer received at ${existing.targetLocationId}`,
        },
      });

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'completed' },
        include: STOCK_TRANSFER_INCLUDE,
      });
    });

    await invalidateInventoryCache();
    return transfer;
  }

  async deductStockFromOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const inventoryItems = await prisma.merchInventory.findMany();

    await prisma.$transaction(async (tx) => {
      for (const orderItem of order.items) {
        const matched = inventoryItems.find(
          (inv) =>
            inv.sku.toLowerCase() === orderItem.name.toLowerCase() ||
            inv.name.toLowerCase() === orderItem.name.toLowerCase()
        );

        if (matched) {
          const qty = orderItem.quantity;
          const newQty = matched.quantity - qty;

          await tx.inventoryTransfer.create({
            data: {
              itemId: matched.id,
              type: 'sale',
              quantity: qty,
              reason: `Sales Order ${order.orderNumber}`,
            },
          });

          await tx.merchInventory.update({
            where: { id: matched.id },
            data: { quantity: newQty < 0 ? 0 : newQty },
          });
        }
      }
    });

    await invalidateInventoryCache();
  }
}

export const inventoryRepository = new InventoryRepository();
