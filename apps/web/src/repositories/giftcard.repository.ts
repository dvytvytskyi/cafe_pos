import { prisma } from '../lib/db';

export class GiftCardRepository {
  async getGiftCards() {
    return prisma.giftCard.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCardByCode(code: string) {
    return prisma.giftCard.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { customer: true },
    });
  }

  async createGiftCard(initialBalance: number, customerId?: string) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `CORGI-${initialBalance}-${randomSuffix}`;
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year expiry

    return prisma.giftCard.create({
      data: {
        code,
        initialBalance,
        balance: initialBalance,
        customerId: customerId || null,
        status: 'active',
        expiryDate,
      },
      include: { customer: true },
    });
  }

  async redeemCard(code: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.findUnique({
        where: { code: code.trim().toUpperCase() },
      });

      if (!card) throw new Error('Gift Card not found.');

      if (card.status !== 'active') {
        throw new Error(`Gift Card is ${card.status}.`);
      }

      if (new Date(card.expiryDate).getTime() < Date.now()) {
        await tx.giftCard.update({
          where: { id: card.id },
          data: { status: 'expired' },
        });
        throw new Error('Gift Card has expired.');
      }

      if (card.balance < amount) {
        throw new Error(`Insufficient balance (Available: €${card.balance.toFixed(2)})`);
      }

      const newBalance = parseFloat((card.balance - amount).toFixed(2));
      const status = newBalance === 0 ? 'redeemed' : 'active';

      return tx.giftCard.update({
        where: { id: card.id },
        data: {
          balance: newBalance,
          status,
        },
        include: { customer: true },
      });
    });
  }
}

export const giftCardRepository = new GiftCardRepository();
