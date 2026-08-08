import { prisma } from '../lib/db';

export interface DiscountPresetData {
  name: string;
  value: number;
}

export interface PromotionData {
  name: string;
  discountPercent: number;
  activeDays: number[];
  startHour: number;
  endHour: number;
  targetItems?: string[];
}

export class DiscountRepository {
  async getDiscountPresets() {
    let presets = await prisma.discountPreset.findMany({
      orderBy: { value: 'desc' },
    });

    if (presets.length === 0) {
      // Seed default presets
      const defaults = [
        { name: 'Staff Meal', value: 50.0 },
        { name: 'Friends & Family', value: 15.0 },
        { name: 'Loyalty / VIP', value: 10.0 },
        { name: 'Military / Service', value: 10.0 },
        { name: 'Student', value: 5.0 },
        { name: 'Senior', value: 10.0 },
        { name: 'Happy Hour', value: 20.0 },
        { name: 'Promo Code 1', value: 5.0 },
        { name: 'Promo Code 2', value: 10.0 },
        { name: 'Partner', value: 25.0 },
        { name: 'Birthday', value: 15.0 },
        { name: 'Social Media', value: 5.0 },
        { name: 'Neighborhood', value: 10.0 },
        { name: 'Early Bird', value: 15.0 },
        { name: 'Special Event', value: 20.0 },
      ];

      await prisma.discountPreset.createMany({
        data: defaults,
      });

      presets = await prisma.discountPreset.findMany({
        orderBy: { value: 'desc' },
      });
    }

    return presets;
  }

  async getPromotions() {
    let promos = await prisma.promotion.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (promos.length === 0) {
      // Seed default promotions
      const defaults = [
        {
          name: 'Happy Hour Friday',
          discountPercent: 20.0,
          activeDays: [5], // Friday
          startHour: 18,
          endHour: 20,
          targetItems: ['Espresso', 'Corgi Latte', 'Flat White', 'Cappuccino', 'Filter Coffee', 'Iced Latte', 'Mocha', 'Latte Macchiato', 'English Breakfast Tea', 'Fresh Orange Juice', 'Orange Juice', 'Corgi Special Hazelnut Latte with Extra Creamy Milk'],
        },
        {
          name: 'Brunch Special Sunday',
          discountPercent: 15.0,
          activeDays: [0], // Sunday
          startHour: 11,
          endHour: 14,
          targetItems: ['Avocado Toast', 'Eggs Benedict', 'Corgi Special Breakfast', 'Brunch Set For 2'],
        },
      ];

      await prisma.promotion.createMany({
        data: defaults,
      });

      promos = await prisma.promotion.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    return promos;
  }

  async createDiscountPreset(data: DiscountPresetData) {
    return prisma.discountPreset.create({
      data,
    });
  }

  async updateDiscountPreset(id: string, data: Partial<DiscountPresetData>) {
    return prisma.discountPreset.update({
      where: { id },
      data,
    });
  }

  async deleteDiscountPreset(id: string) {
    return prisma.discountPreset.delete({ where: { id } });
  }

  async createPromotion(data: PromotionData) {
    return prisma.promotion.create({
      data: {
        name: data.name,
        discountPercent: data.discountPercent,
        activeDays: data.activeDays,
        startHour: data.startHour,
        endHour: data.endHour,
        targetItems: data.targetItems || [],
      },
    });
  }

  async deletePromotion(id: string) {
    return prisma.promotion.delete({ where: { id } });
  }

  async calculateServerHappyHour(
    items: { name: string; price: number; quantity: number }[],
    dateInput?: Date | string
  ) {
    const date = dateInput ? new Date(dateInput) : new Date();
    const day = date.getDay();
    const hour = date.getHours();

    const promos = await this.getPromotions();
    let activePromo = null;

    for (const promo of promos) {
      if (promo.activeDays.includes(day) && hour >= promo.startHour && hour < promo.endHour) {
        activePromo = promo;
        break;
      }
    }

    if (!activePromo) return null;

    let totalDeduction = 0;
    let hasEligibleItems = false;

    items.forEach(item => {
      const isTarget =
        !activePromo.targetItems ||
        activePromo.targetItems.length === 0 ||
        activePromo.targetItems.includes(item.name);

      if (isTarget) {
        hasEligibleItems = true;
        const itemSubtotal = item.price * item.quantity;
        totalDeduction += itemSubtotal * (activePromo.discountPercent / 100);
      }
    });

    if (!hasEligibleItems) return null;

    return {
      name: activePromo.name,
      value: activePromo.discountPercent,
      amountDeduction: parseFloat(totalDeduction.toFixed(2)),
    };
  }
}

export const discountRepository = new DiscountRepository();
