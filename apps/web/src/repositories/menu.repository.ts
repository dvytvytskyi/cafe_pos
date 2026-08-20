import { prisma } from '../lib/db.ts';
import { cache } from '../lib/cache/index.ts';
import {
  invalidateMenuCache,
  menuCategoriesCacheKey,
} from '../lib/menu-cache.ts';
import {
  validateDishName,
  validateDishPrice,
  validateAllergenIds,
} from '../lib/menu-validation.ts';

export interface PriceRecord {
  price: number;
  date: string;
}

export class CategoryHasActiveItemsError extends Error {
  constructor() {
    super('CATEGORY_HAS_ACTIVE_ITEMS');
    this.name = 'CategoryHasActiveItemsError';
  }
}

export class MenuRepository {
  private emenuSeedPromise: Promise<void> | null = null;

  async ensureEmenuSeedMenu(): Promise<void> {
    if (!this.emenuSeedPromise) {
      this.emenuSeedPromise = this.runEmenuSeed();
    }
    return this.emenuSeedPromise;
  }

  private async runEmenuSeed(): Promise<void> {
    let pastries = await prisma.menuCategory.findFirst({
      where: { name: 'Pastries', isArchived: false },
      include: { modifierGroups: true }
    });
    if (!pastries) {
      const maxOrder = await prisma.menuCategory.aggregate({ _max: { sortOrder: true } });
      pastries = await prisma.menuCategory.create({
        data: { name: 'Pastries', sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
        include: { modifierGroups: true }
      });
    }

    const almond = await prisma.menuItem.findFirst({
      where: { name: 'Almond Croissant' },
    });
    if (!almond) {
      await prisma.menuItem.create({
        data: {
          name: 'Almond Croissant',
          description: 'A flaky, buttery double-baked French pastry filled with rich sweet almond frangipane cream and topped with toasted sliced almonds.',
          price: 4.0,
          categoryId: pastries.id,
          allergens: ['Gluten', 'Milk', 'Nuts'],
        },
      });
      await prisma.modifierGroup.create({
        data: {
          name: 'Choose fillings',
          minQty: 0,
          maxQty: 1,
          categories: {
            connect: { id: pastries.id }
          },
          options: {
            create: [
              { name: 'Extra chocolate filling', price: 0.50, sortOrder: 1 },
              { name: 'Vanilla cream filling', price: 0.50, sortOrder: 2 }
            ]
          }
        }
      });
      await invalidateMenuCache();
      return;
    }

    // Always update description and ensure modifier groups exist!
    await prisma.menuItem.update({
      where: { id: almond.id },
      data: {
        description: 'A flaky, buttery double-baked French pastry filled with rich sweet almond frangipane cream and topped with toasted sliced almonds.',
        allergens: ['Gluten', 'Dairy', 'Nuts']
      }
    });

    if (!pastries.modifierGroups || pastries.modifierGroups.length === 0) {
      await prisma.modifierGroup.create({
        data: {
          name: 'Choose fillings',
          minQty: 0,
          maxQty: 1,
          categories: {
            connect: { id: pastries.id }
          },
          options: {
            create: [
              { name: 'Extra chocolate filling', price: 0.50, sortOrder: 1 },
              { name: 'Vanilla cream filling', price: 0.50, sortOrder: 2 }
            ]
          }
        }
      });
    }

    await invalidateMenuCache();
  }

  async getCategories(includeArchived: boolean = false) {
    await this.ensureEmenuSeedMenu();

    const cacheKey = menuCategoriesCacheKey(includeArchived);
    const cached = await cache.get<Awaited<ReturnType<typeof this.fetchCategories>>>(cacheKey);
    if (cached) return cached;

    const data = await this.fetchCategories(includeArchived);
    await cache.set(cacheKey, data, 300);
    return data;
  }

  private fetchCategories(includeArchived: boolean = false) {
    return prisma.menuCategory.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      include: {
        items: {
          where: includeArchived ? undefined : { isArchived: false },
          orderBy: { name: 'asc' },
          include: { translations: true },
        },
        modifierGroups: {
          where: includeArchived ? undefined : { isArchived: false },
          include: {
            options: {
              where: includeArchived ? undefined : { isArchived: false },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(name: string) {
    const maxOrder = await prisma.menuCategory.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.menuCategory.create({
      data: {
        name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { items: true },
    });
    await invalidateMenuCache();
    return created;
  }

  async updateCategory(id: string, name: string) {
    const updated = await prisma.menuCategory.update({
      where: { id },
      data: { name },
      include: { items: true },
    });
    await invalidateMenuCache();
    return updated;
  }

  async reorderCategories(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, sortOrder) =>
        prisma.menuCategory.update({
          where: { id },
          data: { sortOrder },
        })
      )
    );
    await invalidateMenuCache();
    return this.fetchCategories(false);
  }

  async deleteCategory(id: string, mode: 'block' | 'cascade' = 'cascade') {
    const category = await prisma.menuCategory.findUnique({
      where: { id },
      include: { items: { where: { isArchived: false } } },
    });
    if (!category) throw new Error('Category not found');

    if (mode === 'block' && category.items.length > 0) {
      throw new CategoryHasActiveItemsError();
    }

    const archived = await this.archiveCategory(id);
    await invalidateMenuCache();
    return archived;
  }

  async archiveCategory(id: string) {
    const result = await prisma.$transaction(async (tx) => {
      await tx.menuItem.updateMany({
        where: { categoryId: id },
        data: { isArchived: true },
      });
      return tx.menuCategory.update({
        where: { id },
        data: { isArchived: true },
      });
    });
    await invalidateMenuCache();
    return result;
  }

  async createMenuItem(data: {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    allergens?: string[];
  }) {
    const name = validateDishName(data.name);
    const price = validateDishPrice(data.price);
    const allergens = validateAllergenIds(data.allergens);
    if (!data.categoryId) {
      throw new Error('categoryId is required');
    }

    const created = await prisma.menuItem.create({
      data: {
        name,
        description: data.description?.trim() || undefined,
        price,
        categoryId: data.categoryId,
        allergens,
        priceHistory: [],
      },
      include: { category: true },
    });
    await invalidateMenuCache();
    return created;
  }

  async updateMenuItem(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      categoryId?: string;
      allergens?: string[];
      isArchived?: boolean;
      imageUrl?: string | null;
      tags?: string[];
      isVisible?: boolean;
      locationIds?: string[];
    }
  ) {
    const currentItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!currentItem) throw new Error('Menu item not found');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = validateDishName(data.name);
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.allergens !== undefined) updateData.allergens = validateAllergenIds(data.allergens);
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl?.trim() || null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
    if (data.locationIds !== undefined) updateData.locationIds = data.locationIds;

    if (data.price !== undefined) {
      const price = validateDishPrice(data.price);
      if (price !== currentItem.price) {
        updateData.price = price;
        const history = (currentItem.priceHistory || []) as unknown as PriceRecord[];
        history.push({ price: currentItem.price, date: new Date().toISOString() });
        updateData.priceHistory = history as any;
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
    await invalidateMenuCache();
    return updated;
  }

  async archiveMenuItem(id: string) {
    const archived = await prisma.menuItem.update({
      where: { id },
      data: { isArchived: true },
      include: { category: true },
    });
    await invalidateMenuCache();
    return archived;
  }

  async upsertMenuItemTranslation(
    itemId: string,
    locale: string,
    data: { name: string; description?: string | null }
  ) {
    const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Menu item not found');

    const normalizedLocale = locale.trim().toLowerCase();
    const name = validateDishName(data.name);
    const description = data.description?.trim() || null;

    const translation = await prisma.menuItemTranslation.upsert({
      where: { itemId_locale: { itemId, locale: normalizedLocale } },
      create: { itemId, locale: normalizedLocale, name, description },
      update: { name, description },
    });
    await invalidateMenuCache();
    return translation;
  }

  async deleteMenuItemTranslation(itemId: string, locale: string) {
    await prisma.menuItemTranslation.deleteMany({
      where: { itemId, locale: locale.trim().toLowerCase() },
    });
    await invalidateMenuCache();
  }

  async listMenuItemTranslations(itemId: string) {
    return prisma.menuItemTranslation.findMany({
      where: { itemId },
      orderBy: { locale: 'asc' },
    });
  }
}

export const menuRepository = new MenuRepository();
