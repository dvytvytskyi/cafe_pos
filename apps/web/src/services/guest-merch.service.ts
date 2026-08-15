import { prisma } from '../lib/db';
import { DEFAULT_EMENU_IMAGE } from '../lib/guest-constants';
import { GuestValidationError } from '../lib/guest-validation';

export class GuestMerchService {
  async getCatalog(locationId: string) {
    const items = await prisma.merchInventory.findMany({
      where: { category: 'merch', guestVisible: true },
      include: {
        locationStock: {
          where: { locationId },
        },
      },
      orderBy: { name: 'asc' },
    });

    return items.map((item) => {
      const locStock = item.locationStock[0];
      const stock = locStock?.quantity ?? item.quantity;
      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        description: item.guestDescription ?? '',
        image: item.guestImageUrl || DEFAULT_EMENU_IMAGE,
        price: item.price,
        stock,
        unit: item.unit,
      };
    });
  }

  async getItemStock(itemId: string, locationId: string): Promise<number> {
    const row = await prisma.inventoryLocationStock.findUnique({
      where: { itemId_locationId: { itemId, locationId } },
    });
    if (row) return row.quantity;
    const item = await prisma.merchInventory.findUnique({ where: { id: itemId } });
    return item?.quantity ?? 0;
  }

  async validateStock(itemId: string, locationId: string, quantity: number) {
    const stock = await this.getItemStock(itemId, locationId);
    if (quantity > stock) {
      throw new GuestValidationError(`Insufficient stock. Available: ${stock}`);
    }
  }

  async confirmMerchSale(orderId: string, staffUserId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new GuestValidationError('Order not found');

    const merchItems = order.items.filter((i) => i.itemType === 'merch');
    if (merchItems.length === 0) return order;

    await prisma.$transaction(async (tx) => {
      for (const line of merchItems) {
        if (!line.merchSkuId) continue;
        const stockRow = await tx.inventoryLocationStock.findUnique({
          where: {
            itemId_locationId: { itemId: line.merchSkuId, locationId: order.locationId },
          },
        });
        const available = stockRow?.quantity ?? 0;
        if (line.quantity > available) {
          throw new GuestValidationError(`Insufficient stock for ${line.name}`);
        }
        if (stockRow) {
          await tx.inventoryLocationStock.update({
            where: { id: stockRow.id },
            data: { quantity: stockRow.quantity - line.quantity },
          });
        }
        await tx.inventoryTransfer.create({
          data: {
            itemId: line.merchSkuId,
            type: 'sale',
            quantity: line.quantity,
            reason: `Guest order ${order.orderNumber}${staffUserId ? ` by ${staffUserId}` : ''}`,
          },
        });
        const allStock = await tx.inventoryLocationStock.findMany({
          where: { itemId: line.merchSkuId },
        });
        const total = allStock.reduce((s, r) => s + r.quantity, 0);
        await tx.merchInventory.update({
          where: { id: line.merchSkuId },
          data: { quantity: total },
        });
      }
    });

    return order;
  }
}

export const guestMerchService = new GuestMerchService();
