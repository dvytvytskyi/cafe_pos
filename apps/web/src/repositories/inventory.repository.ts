import { prisma } from '../lib/db.ts';
import {
  InventoryValidationError,
  validateCreateItemInput,
  validateStockQuantity,
  validateTransferInput,
  validateUpdateItemInput,
  type StockTransferStatus,
} from '../lib/inventory-validation.ts';
import { INVENTORY_ITEMS_CACHE_KEY, invalidateInventoryCache } from '../lib/inventory-cache.ts';
import { cache } from '../lib/cache/index.ts';
import { MAIN_WAREHOUSE_LOCATION_ID } from '../lib/inventory-constants.ts';

export class InsufficientStockError extends Error {
  code = 'INSUFFICIENT_STOCK';

  constructor(available: number, requested: number) {
    super(`Insufficient stock. Available: ${available}, requested: ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

const ITEM_INCLUDE = {
  transfers: { orderBy: { createdAt: 'desc' as const }, take: 5 },
  locationStock: {
    include: { location: { select: { id: true, name: true } } },
  },
} as const;

const STOCK_TRANSFER_INCLUDE = {
  item: {
    select: {
      id: true,
      sku: true,
      name: true,
      quantity: true,
      minStockLevel: true,
      category: true,
      unit: true,
    },
  },
} as const;

async function assertLocationsExist(locationIds: string[]) {
  const unique = [...new Set(locationIds)];
  if (unique.length === 0) return;
  const found = await prisma.location.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((l) => l.id));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new InventoryValidationError(`Unknown location(s): ${missing.join(', ')}`);
  }
}

async function upsertLocationStock(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  itemId: string,
  locationId: string,
  quantity: number
) {
  return tx.inventoryLocationStock.upsert({
    where: { itemId_locationId: { itemId, locationId } },
    create: { itemId, locationId, quantity },
    update: { quantity },
  });
}

async function syncItemTotalQuantity(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  itemId: string
) {
  const rows = await tx.inventoryLocationStock.findMany({ where: { itemId } });
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  return tx.merchInventory.update({
    where: { id: itemId },
    data: { quantity: total },
  });
}

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
      include: ITEM_INCLUDE,
      orderBy: { sku: 'asc' },
    });
  }

  async createItem(data: {
    name: string;
    sku: string;
    price: number;
    initialStock?: number;
    minStockLevel?: number;
    category?: string;
    unit?: string;
    locationStocks?: Record<string, number>;
  }) {
    const validated = validateCreateItemInput(data);
    const stocks = validated.locationStocks ?? {};
    const stockEntries = Object.entries(stocks).filter(([, qty]) => qty > 0);

    if (stockEntries.length === 0 && validated.initialStock > 0) {
      stockEntries.push([MAIN_WAREHOUSE_LOCATION_ID, validated.initialStock]);
    }

    await assertLocationsExist(stockEntries.map(([locationId]) => locationId));

    const totalStock =
      stockEntries.length > 0
        ? stockEntries.reduce((sum, [, qty]) => sum + qty, 0)
        : validated.initialStock;

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.merchInventory.create({
        data: {
          name: validated.name,
          sku: validated.sku,
          price: validated.price,
          quantity: totalStock,
          minStockLevel: validated.minStockLevel,
          category: validated.category,
          unit: validated.unit,
        },
      });

      for (const [locationId, qty] of stockEntries) {
        await upsertLocationStock(tx, created.id, locationId, qty);
      }

      if (totalStock > 0) {
        await tx.inventoryTransfer.create({
          data: {
            itemId: created.id,
            type: 'check_in',
            quantity: totalStock,
            reason: 'Initial stock setup',
          },
        });
      }

      return tx.merchInventory.findUnique({
        where: { id: created.id },
        include: ITEM_INCLUDE,
      });
    });

    await invalidateInventoryCache();
    return item;
  }

  async updateItem(
    itemId: string,
    data: {
      name: string;
      sku?: string;
      price: number;
      minStockLevel: number;
      category: string;
      unit: string;
      locationStocks: Record<string, number>;
    }
  ) {
    const validated = validateUpdateItemInput(data);
    const locationIds = Object.keys(validated.locationStocks);
    await assertLocationsExist(locationIds);

    const existing = await prisma.merchInventory.findUnique({ where: { id: itemId } });
    if (!existing) throw new InventoryValidationError('Inventory item not found');

    const totalStock = Object.values(validated.locationStocks).reduce((sum, n) => sum + n, 0);

    const item = await prisma.$transaction(async (tx) => {
      await tx.merchInventory.update({
        where: { id: itemId },
        data: {
          name: validated.name,
          ...(validated.sku ? { sku: validated.sku } : {}),
          price: validated.price,
          minStockLevel: validated.minStockLevel,
          category: validated.category,
          unit: validated.unit,
          quantity: totalStock,
        },
      });

      for (const locationId of locationIds) {
        const qty = validated.locationStocks[locationId] ?? 0;
        await upsertLocationStock(tx, itemId, locationId, qty);
      }

      await tx.inventoryLocationStock.deleteMany({
        where: {
          itemId,
          locationId: { notIn: locationIds },
        },
      });

      return tx.merchInventory.findUnique({
        where: { id: itemId },
        include: ITEM_INCLUDE,
      });
    });

    await invalidateInventoryCache();
    return item;
  }

  async patchGuestMerchSettings(
    itemId: string,
    data: {
      guestVisible?: boolean;
      guestImageUrl?: string | null;
      guestDescription?: string | null;
    }
  ) {
    const existing = await prisma.merchInventory.findUnique({ where: { id: itemId } });
    if (!existing) throw new InventoryValidationError('Inventory item not found');

    const update: Record<string, unknown> = {};
    if (data.guestVisible !== undefined) update.guestVisible = !!data.guestVisible;
    if (data.guestImageUrl !== undefined) {
      update.guestImageUrl =
        typeof data.guestImageUrl === 'string' ? data.guestImageUrl.trim() || null : null;
    }
    if (data.guestDescription !== undefined) {
      update.guestDescription =
        typeof data.guestDescription === 'string' ? data.guestDescription.trim() || null : null;
    }

    if (Object.keys(update).length === 0) {
      throw new InventoryValidationError('No guest settings provided');
    }

    const item = await prisma.merchInventory.update({
      where: { id: itemId },
      data: update,
      include: ITEM_INCLUDE,
    });
    await invalidateInventoryCache();
    return item;
  }

  async adjustStock(
    itemId: string,
    type: 'check_in' | 'check_out',
    quantity: number,
    reason?: string,
    locationId = MAIN_WAREHOUSE_LOCATION_ID
  ) {
    const qty = validateStockQuantity(quantity);
    await assertLocationsExist([locationId]);

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.merchInventory.findUnique({ where: { id: itemId } });
      if (!item) throw new InventoryValidationError('Inventory item not found');

      const stockRow = await tx.inventoryLocationStock.findUnique({
        where: { itemId_locationId: { itemId, locationId } },
      });
      const currentAtLocation = stockRow?.quantity ?? 0;

      let newAtLocation = currentAtLocation;
      if (type === 'check_in') {
        newAtLocation += qty;
      } else {
        if (currentAtLocation < qty) {
          throw new InsufficientStockError(currentAtLocation, qty);
        }
        newAtLocation -= qty;
      }

      await upsertLocationStock(tx, itemId, locationId, newAtLocation);

      await tx.inventoryTransfer.create({
        data: {
          itemId,
          type,
          quantity: qty,
          reason,
        },
      });

      await syncItemTotalQuantity(tx, itemId);

      return tx.merchInventory.findUnique({
        where: { id: itemId },
        include: ITEM_INCLUDE,
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
    await assertLocationsExist([validated.sourceLocationId, validated.targetLocationId]);

    const transfer = await prisma.$transaction(async (tx) => {
      const item = await tx.merchInventory.findUnique({ where: { id: validated.itemId } });
      if (!item) throw new InventoryValidationError('Inventory item not found');

      const sourceRow = await tx.inventoryLocationStock.findUnique({
        where: {
          itemId_locationId: {
            itemId: validated.itemId,
            locationId: validated.sourceLocationId,
          },
        },
      });
      const available = sourceRow?.quantity ?? 0;
      if (available < validated.quantity) {
        throw new InsufficientStockError(available, validated.quantity);
      }

      await upsertLocationStock(
        tx,
        validated.itemId,
        validated.sourceLocationId,
        available - validated.quantity
      );

      await tx.inventoryTransfer.create({
        data: {
          itemId: validated.itemId,
          type: 'check_out',
          quantity: validated.quantity,
          reason: `Transfer to ${validated.targetLocationId}`,
        },
      });

      await syncItemTotalQuantity(tx, validated.itemId);

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

      if (existing.status !== 'in_transit' && existing.status !== 'pending') {
        throw new InventoryValidationError('Only in_transit or pending transfers can be completed');
      }

      const targetRow = await tx.inventoryLocationStock.findUnique({
        where: {
          itemId_locationId: {
            itemId: existing.itemId,
            locationId: existing.targetLocationId,
          },
        },
      });
      const targetQty = (targetRow?.quantity ?? 0) + existing.quantity;
      await upsertLocationStock(tx, existing.itemId, existing.targetLocationId, targetQty);

      await tx.inventoryTransfer.create({
        data: {
          itemId: existing.itemId,
          type: 'check_in',
          quantity: existing.quantity,
          reason: `Transfer received at ${existing.targetLocationId}`,
        },
      });

      await syncItemTotalQuantity(tx, existing.itemId);

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
          const locationId = order.locationId ?? MAIN_WAREHOUSE_LOCATION_ID;
          const stockRow = await tx.inventoryLocationStock.findUnique({
            where: { itemId_locationId: { itemId: matched.id, locationId } },
          });
          const current = stockRow?.quantity ?? matched.quantity;
          const newQty = Math.max(0, current - qty);

          await upsertLocationStock(tx, matched.id, locationId, newQty);

          await tx.inventoryTransfer.create({
            data: {
              itemId: matched.id,
              type: 'sale',
              quantity: qty,
              reason: `Sales Order ${order.orderNumber}`,
            },
          });

          await syncItemTotalQuantity(tx, matched.id);
        }
      }
    });

    await invalidateInventoryCache();
  }
}

export const inventoryRepository = new InventoryRepository();
