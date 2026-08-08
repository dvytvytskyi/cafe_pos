import { prisma } from '../lib/db';
import {
  defaultExpiryDate,
  formatGiftCardCode,
  GIFT_CODE_MAX_RETRIES,
  GiftCardValidationError,
  isValidGiftCardCode,
  validateExpiryDate,
  validateInitialBalance,
} from '../lib/gift-card-validation';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class GiftCardRepository {
  async getGiftCards() {
    return prisma.giftCard.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCardByCode(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!isValidGiftCardCode(normalized)) {
      return null;
    }
    return prisma.giftCard.findUnique({
      where: { code: normalized },
      include: { customer: true },
    });
  }

  private async generateUniqueCode(tx: TxClient): Promise<string> {
    for (let attempt = 0; attempt < GIFT_CODE_MAX_RETRIES; attempt++) {
      const code = formatGiftCardCode();
      const existing = await tx.giftCard.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new GiftCardValidationError('Failed to generate unique gift card code');
  }

  async createGiftCard(initialBalance: number, customerId?: string) {
    const balance = validateInitialBalance(initialBalance);
    const expiryDate = defaultExpiryDate();

    return prisma.$transaction(async (tx) => {
      const code = await this.generateUniqueCode(tx);
      return tx.giftCard.create({
        data: {
          code,
          initialBalance: balance,
          balance,
          customerId: customerId || null,
          status: 'active',
          expiryDate,
        },
        include: { customer: true },
      });
    });
  }

  async createGiftCardsBatch(count: number, initialBalance: number, customerId?: string) {
    const balance = validateInitialBalance(initialBalance);
    const expiryDate = defaultExpiryDate();

    return prisma.$transaction(async (tx) => {
      const cards = [];
      for (let i = 0; i < count; i++) {
        const code = await this.generateUniqueCode(tx);
        const card = await tx.giftCard.create({
          data: {
            code,
            initialBalance: balance,
            balance,
            customerId: customerId || null,
            status: 'active',
            expiryDate,
          },
          include: { customer: true },
        });
        cards.push(card);
      }
      return cards;
    });
  }

  async setStatus(id: string, status: 'active' | 'disabled') {
    const existing = await prisma.giftCard.findUnique({ where: { id } });
    if (!existing) {
      throw new GiftCardValidationError('Gift Card not found');
    }
    if (existing.status === 'redeemed' || existing.status === 'expired') {
      throw new GiftCardValidationError(`Cannot change status of ${existing.status} card`);
    }
    return prisma.giftCard.update({
      where: { id },
      data: { status },
      include: { customer: true },
    });
  }

  async redeemCard(code: string, amount: number) {
    const normalized = code.trim().toUpperCase();
    if (!isValidGiftCardCode(normalized)) {
      throw new Error('Gift Card not found.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid redemption amount.');
    }

    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; balance: number; status: string; expiryDate: Date }>>`
        SELECT id, balance, status, "expiryDate"
        FROM "GiftCard"
        WHERE code = ${normalized}
        FOR UPDATE
      `;

      const card = locked[0];
      if (!card) throw new Error('Gift Card not found.');

      if (card.status !== 'active') {
        throw new Error(`Gift Card is ${card.status}.`);
      }

      try {
        validateExpiryDate(new Date(card.expiryDate));
      } catch {
        await tx.giftCard.update({ where: { id: card.id }, data: { status: 'expired' } });
        throw new Error('Gift Card has expired.');
      }

      if (card.balance < amount) {
        throw new Error(`Insufficient balance (Available: €${card.balance.toFixed(2)})`);
      }

      const newBalance = parseFloat((card.balance - amount).toFixed(2));
      const status = newBalance === 0 ? 'redeemed' : 'active';

      return tx.giftCard.update({
        where: { id: card.id },
        data: { balance: newBalance, status },
        include: { customer: true },
      });
    });
  }
}

export const giftCardRepository = new GiftCardRepository();
