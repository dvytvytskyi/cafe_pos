import { prisma } from '../lib/db';

export interface PriceRecord {
  price: number;
  date: string; // ISO string
}

export class MenuRepository {
  async getCategories(includeArchived: boolean = false) {
    return prisma.menuCategory.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      include: {
        items: {
          where: includeArchived ? undefined : { isArchived: false },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name: string) {
    return prisma.menuCategory.create({
      data: { name },
      include: { items: true },
    });
  }

  async updateCategory(id: string, name: string) {
    return prisma.menuCategory.update({
      where: { id },
      data: { name },
      include: { items: true },
    });
  }

  async archiveCategory(id: string) {
    return prisma.$transaction(async (tx) => {
      // Archive all items in this category
      await tx.menuItem.updateMany({
        where: { categoryId: id },
        data: { isArchived: true },
      });

      // Archive category
      return tx.menuCategory.update({
        where: { id },
        data: { isArchived: true },
      });
    });
  }

  async createMenuItem(data: {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    allergens?: string[];
  }) {
    return prisma.menuItem.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        allergens: data.allergens || [],
        priceHistory: [],
      },
      include: { category: true },
    });
  }

  async updateMenuItem(id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    categoryId?: string;
    allergens?: string[];
  }) {
    const currentItem = await prisma.menuItem.findUnique({
      where: { id },
    });
    if (!currentItem) throw new Error('Menu item not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.allergens !== undefined) updateData.allergens = data.allergens;

    if (data.price !== undefined && data.price !== currentItem.price) {
      updateData.price = data.price;
      const history = (currentItem.priceHistory || []) as any as PriceRecord[];
      history.push({
        price: currentItem.price,
        date: new Date().toISOString(),
      });
      updateData.priceHistory = history as any;
    }

    return prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async archiveMenuItem(id: string) {
    return prisma.menuItem.update({
      where: { id },
      data: { isArchived: true },
      include: { category: true },
    });
  }
}

export const menuRepository = new MenuRepository();
