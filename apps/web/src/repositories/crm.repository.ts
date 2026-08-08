import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db';
import {
  validateCustomerName,
  validatePhoneE164,
  validateEmail,
  validatePointsAdjustment,
  CrmValidationError,
  PhoneDuplicateError,
  type CustomerSortField,
  type SortOrder,
} from '../lib/crm-validation';

function mapSortField(sortBy: CustomerSortField): Prisma.CustomerOrderByWithRelationInput {
  if (sortBy === 'bonusPoints') return { points: 'asc' };
  if (sortBy === 'lastVisit') return { lastVisitDate: 'asc' };
  return { name: 'asc' };
}

function withSortOrder(
  orderBy: Prisma.CustomerOrderByWithRelationInput,
  order: SortOrder
): Prisma.CustomerOrderByWithRelationInput {
  const key = Object.keys(orderBy)[0] as keyof Prisma.CustomerOrderByWithRelationInput;
  return { [key]: order } as Prisma.CustomerOrderByWithRelationInput;
}

export class CrmRepository {
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: CustomerSortField;
    sortOrder?: SortOrder;
  }) {
    const where: Prisma.CustomerWhereInput = {};

    if (options?.search?.trim()) {
      const q = options.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 100));
    const skip = (page - 1) * limit;
    const sortBy = options?.sortBy ?? 'name';
    const sortOrder = options?.sortOrder ?? 'asc';

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: withSortOrder(mapSortField(sortBy), sortOrder),
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** @deprecated Use findAll — kept for backward compatibility */
  async getCustomers() {
    const result = await this.findAll({ limit: 100 });
    return result.items;
  }

  async findById(id: string) {
    return prisma.customer.findUnique({ where: { id } });
  }

  async createCustomer(data: {
    name: string;
    phone: string;
    email: string;
    birthday?: string;
    allergyNotes?: string;
    notes?: string;
  }) {
    const name = validateCustomerName(data.name);
    const phone = validatePhoneE164(data.phone);
    const email = validateEmail(data.email);

    try {
      return await prisma.customer.create({
        data: {
          name,
          phone,
          email,
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
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new PhoneDuplicateError();
      }
      throw error;
    }
  }

  async updateCustomer(id: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    birthday?: string;
    allergyNotes?: string;
    notes?: string;
    favoriteDishes?: string[];
    tier?: string;
  }) {
    const updateData: Prisma.CustomerUpdateInput = {
      birthday: data.birthday,
      allergyNotes: data.allergyNotes,
      notes: data.notes,
      favoriteDishes: data.favoriteDishes,
      tier: data.tier,
    };

    if (data.name !== undefined) {
      updateData.name = validateCustomerName(data.name);
    }
    if (data.email !== undefined) {
      updateData.email = validateEmail(data.email);
    }
    if (data.phone !== undefined) {
      updateData.phone = validatePhoneE164(data.phone);
    }

    try {
      return await prisma.customer.update({
        where: { id },
        data: updateData,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new PhoneDuplicateError();
      }
      throw error;
    }
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

  async applyPointsAdjustment(customerId: string, pointsDelta: number, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ points: number }[]>`
        SELECT points FROM "Customer" WHERE id = ${customerId} FOR UPDATE
      `;
      const locked = rows[0];
      if (!locked) {
        throw new CrmValidationError('Customer not found');
      }

      const cappedDelta = validatePointsAdjustment(pointsDelta, locked.points);
      const newPoints = parseFloat((locked.points + cappedDelta).toFixed(2));

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          type: cappedDelta >= 0 ? 'earn' : 'spend',
          points: Math.abs(cappedDelta),
          orderId: reason ? `adjust:${reason.slice(0, 80)}` : 'adjust:manual',
        },
      });

      return tx.customer.update({
        where: { id: customerId },
        data: { points: newPoints },
      });
    });
  }

  async applyLoyaltyTransactionInTx(
    tx: Prisma.TransactionClient,
    customerId: string,
    amountPaid: number,
    pointsSpent: number,
    orderId?: string
  ) {
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

      let currentRate = config.bronzeRate;
      if (customer.tier === 'Silver') currentRate = config.silverRate;
      else if (customer.tier === 'Gold') currentRate = config.goldRate;
      else if (customer.tier === 'VIP') currentRate = config.vipRate;

      const pointsEarned = parseFloat((amountPaid * currentRate).toFixed(2));

      const newLtv = parseFloat((customer.ltv + amountPaid).toFixed(2));
      let newPoints = parseFloat((customer.points - pointsSpent + pointsEarned).toFixed(2));
      if (newPoints < 0) newPoints = 0;

      let newTier = 'Bronze';
      if (newLtv >= config.vipThreshold) newTier = 'VIP';
      else if (newLtv >= config.goldThreshold) newTier = 'Gold';
      else if (newLtv >= config.silverThreshold) newTier = 'Silver';

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
  }

  async applyLoyaltyTransaction(customerId: string, amountPaid: number, pointsSpent: number, orderId?: string) {
    return prisma.$transaction(async (tx) =>
      this.applyLoyaltyTransactionInTx(tx, customerId, amountPaid, pointsSpent, orderId)
    );
  }
}

export const crmRepository = new CrmRepository();
