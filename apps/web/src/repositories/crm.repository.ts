import { prisma } from '../lib/db';

export class CrmRepository {
  async getCustomers() {
    return prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCustomer(data: {
    name: string;
    phone: string;
    email: string;
    birthday?: string;
    allergyNotes?: string;
    notes?: string;
  }) {
    return prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        birthday: data.birthday,
        allergyNotes: data.allergyNotes,
        notes: data.notes,
        tier: 'Bronze',
        points: 0.0,
        ltv: 0.0,
        visitCount: 0,
        joinedDate: new Date().toISOString().split('T')[0],
      },
    });
  }

  async updateCustomer(id: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    birthday?: string;
    allergyNotes?: string;
    notes?: string;
    favoriteDishes?: string[];
    points?: number;
    tier?: string;
  }) {
    return prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        birthday: data.birthday,
        allergyNotes: data.allergyNotes,
        notes: data.notes,
        favoriteDishes: data.favoriteDishes,
        points: data.points,
        tier: data.tier,
      },
    });
  }

  async getLoyaltyConfig() {
    let config = await prisma.loyaltyConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await prisma.loyaltyConfig.create({
        data: {
          id: 'default',
          bronzeRate: 0.05,
          silverRate: 0.08,
          goldRate: 0.10,
          vipRate: 0.15,
          silverThreshold: 75.0,
          goldThreshold: 150.0,
          vipThreshold: 300.0,
        },
      });
    }

    return config;
  }

  async saveLoyaltyConfig(data: {
    bronzeRate?: number;
    silverRate?: number;
    goldRate?: number;
    vipRate?: number;
    silverThreshold?: number;
    goldThreshold?: number;
    vipThreshold?: number;
  }) {
    return prisma.loyaltyConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...data,
      },
      update: data,
    });
  }

  async applyLoyaltyTransaction(customerId: string, amountPaid: number, pointsSpent: number, orderId?: string) {
    return prisma.$transaction(async (tx) => {
      const config = await tx.loyaltyConfig.findUnique({ where: { id: 'default' } }) || {
        bronzeRate: 0.05,
        silverRate: 0.08,
        goldRate: 0.10,
        vipRate: 0.15,
        silverThreshold: 75.0,
        goldThreshold: 150.0,
        vipThreshold: 300.0,
      };

      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error('Customer not found');

      // 1. Calculate rate based on current tier
      let currentRate = config.bronzeRate;
      if (customer.tier === 'Silver') currentRate = config.silverRate;
      else if (customer.tier === 'Gold') currentRate = config.goldRate;
      else if (customer.tier === 'VIP') currentRate = config.vipRate;

      const pointsEarned = parseFloat((amountPaid * currentRate).toFixed(2));

      // 2. Compute new stats
      const newLtv = parseFloat((customer.ltv + amountPaid).toFixed(2));
      let newPoints = parseFloat((customer.points - pointsSpent + pointsEarned).toFixed(2));
      if (newPoints < 0) newPoints = 0;

      // 3. Determine new tier
      let newTier = 'Bronze';
      if (newLtv >= config.vipThreshold) newTier = 'VIP';
      else if (newLtv >= config.goldThreshold) newTier = 'Gold';
      else if (newLtv >= config.silverThreshold) newTier = 'Silver';

      // 4. Log transactions
      if (pointsSpent > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            customerId,
            type: 'spend',
            points: pointsSpent,
            orderId,
          },
        });
      }

      if (pointsEarned > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            customerId,
            type: 'earn',
            points: pointsEarned,
            orderId,
          },
        });
      }

      // 5. Update Customer
      return tx.customer.update({
        where: { id: customerId },
        data: {
          ltv: newLtv,
          points: newPoints,
          tier: newTier,
          visitCount: customer.visitCount + 1,
          lastVisitDate: new Date().toISOString().split('T')[0],
        },
      });
    });
  }
}

export const crmRepository = new CrmRepository();
