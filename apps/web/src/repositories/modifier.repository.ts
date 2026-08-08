import { prisma } from '../lib/db.ts';
import { invalidateMenuCache } from '../lib/menu-cache.ts';
import {
  validateModifierName,
  validateModifierPrice,
  validateModifierQty,
} from '../lib/modifier-validation.ts';

const groupInclude = {
  options: {
    where: { isArchived: false },
    orderBy: { sortOrder: 'asc' as const },
  },
  categories: { select: { id: true, name: true } },
};

export class ModifierRepository {
  async getGroups(includeArchived = false) {
    return prisma.modifierGroup.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      include: {
        options: {
          where: includeArchived ? undefined : { isArchived: false },
          orderBy: { sortOrder: 'asc' },
        },
        categories: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createGroup(data: {
    name: string;
    minQty?: number;
    maxQty?: number;
    options?: Array<{ name: string; price: number }>;
    categoryIds?: string[];
  }) {
    const name = validateModifierName(data.name);
    const { minQty, maxQty } = validateModifierQty(data.minQty ?? 0, data.maxQty ?? 1);
    const maxOrder = await prisma.modifierGroup.aggregate({ _max: { sortOrder: true } });

    const options = (data.options ?? []).map((opt, index) => ({
      name: validateModifierName(opt.name),
      price: validateModifierPrice(opt.price),
      sortOrder: index,
    }));

    const created = await prisma.modifierGroup.create({
      data: {
        name,
        minQty,
        maxQty,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        options: options.length > 0 ? { create: options } : undefined,
        categories:
          data.categoryIds && data.categoryIds.length > 0
            ? { connect: data.categoryIds.map((id) => ({ id })) }
            : undefined,
      },
      include: groupInclude,
    });
    await invalidateMenuCache();
    return created;
  }

  async updateGroup(
    id: string,
    data: {
      name?: string;
      minQty?: number;
      maxQty?: number;
      isArchived?: boolean;
    }
  ) {
    const current = await prisma.modifierGroup.findUnique({ where: { id } });
    if (!current) throw new Error('Modifier group not found');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = validateModifierName(data.name);
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

    if (data.minQty !== undefined || data.maxQty !== undefined) {
      const { minQty, maxQty } = validateModifierQty(
        data.minQty ?? current.minQty,
        data.maxQty ?? current.maxQty
      );
      updateData.minQty = minQty;
      updateData.maxQty = maxQty;
    }

    const updated = await prisma.modifierGroup.update({
      where: { id },
      data: updateData,
      include: groupInclude,
    });
    await invalidateMenuCache();
    return updated;
  }

  async archiveGroup(id: string) {
    const archived = await prisma.modifierGroup.update({
      where: { id },
      data: { isArchived: true },
      include: groupInclude,
    });
    await invalidateMenuCache();
    return archived;
  }

  async addOption(groupId: string, data: { name: string; price: number }) {
    const group = await prisma.modifierGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Modifier group not found');

    const maxOrder = await prisma.modifierOption.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    });

    const created = await prisma.modifierOption.create({
      data: {
        groupId,
        name: validateModifierName(data.name),
        price: validateModifierPrice(data.price),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    await invalidateMenuCache();
    return created;
  }

  async updateOption(
    id: string,
    data: { name?: string; price?: number; isArchived?: boolean }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = validateModifierName(data.name);
    if (data.price !== undefined) updateData.price = validateModifierPrice(data.price);
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

    const updated = await prisma.modifierOption.update({
      where: { id },
      data: updateData,
    });
    await invalidateMenuCache();
    return updated;
  }

  async linkCategories(groupId: string, categoryIds: string[]) {
    const updated = await prisma.modifierGroup.update({
      where: { id: groupId },
      data: {
        categories: {
          set: categoryIds.map((id) => ({ id })),
        },
      },
      include: groupInclude,
    });
    await invalidateMenuCache();
    return updated;
  }
}

export const modifierRepository = new ModifierRepository();
