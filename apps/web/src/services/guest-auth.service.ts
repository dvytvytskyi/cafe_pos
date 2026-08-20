import { prisma } from '../lib/db';
import {
  generateGuestSessionToken,
  hashGuestToken,
  signGuestJwt,
} from '../lib/guest-session';
import { GUEST_SESSION_TTL_SECONDS } from '../lib/guest-constants';
import { GuestValidationError } from '../lib/guest-validation';
import { guestOtpService } from './guest-otp.service';
import { CRM_QR_PREFIX } from '../lib/crm-validation';

export class GuestAuthService {
  async requestOtp(phone: unknown) {
    return guestOtpService.requestOtp(phone);
  }

  async verifyOtpAndLogin(phone: unknown, code: unknown) {
    const { phone: verifiedPhone } = await guestOtpService.verifyOtp(phone, code);
    let customer = await prisma.customer.findUnique({ where: { phone: verifiedPhone } });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: 'Guest',
          phone: verifiedPhone,
          email: `${verifiedPhone.replace(/\D/g, '')}@guest.corgi.local`,
          phoneVerified: true,
          guestRegisteredAt: new Date(),
          joinedDate: new Date().toISOString().slice(0, 10),
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { phoneVerified: true },
      });
    }

    return this.createSession(customer.id, customer.phone, customer.name);
  }

  async registerAfterOtp(
    phone: unknown,
    code: unknown,
    data: { name: string; email: string; allergyNotes?: string }
  ) {
    const { phone: verifiedPhone } = await guestOtpService.verifyOtp(phone, code);

    const customer = await prisma.customer.upsert({
      where: { phone: verifiedPhone },
      create: {
        name: data.name,
        phone: verifiedPhone,
        email: data.email,
        allergyNotes: data.allergyNotes,
        phoneVerified: true,
        guestRegisteredAt: new Date(),
        joinedDate: new Date().toISOString().slice(0, 10),
      },
      update: {
        name: data.name,
        email: data.email,
        allergyNotes: data.allergyNotes,
        phoneVerified: true,
        guestRegisteredAt: new Date(),
      },
    });

    return this.createSession(customer.id, customer.phone, customer.name);
  }

  private async createSession(customerId: string, phone: string, name: string) {
    await prisma.guestSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    const jwt = signGuestJwt({ sub: customerId, phone, name });
    const tokenHash = hashGuestToken(jwt);
    const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_SECONDS * 1000);

    await prisma.guestSession.create({
      data: { customerId, tokenHash, expiresAt },
    });

    return { token: jwt, customerId };
  }

  async logout(req: Request) {
    const { getGuestTokenFromRequest, hashGuestToken: hash } = await import('../lib/guest-session');
    const token = getGuestTokenFromRequest(req);
    if (token) {
      await prisma.guestSession.deleteMany({ where: { tokenHash: hash(token) } });
    }
  }

  async getProfile(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new GuestValidationError('Customer not found');
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      tier: customer.tier,
      points: customer.points,
      ltv: customer.ltv,
      allergyNotes: customer.allergyNotes ?? undefined,
      phoneVerified: customer.phoneVerified,
    };
  }

  async getLoyalty(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new GuestValidationError('Customer not found');

    const config =
      (await prisma.loyaltyConfig.findUnique({ where: { id: 'default' } })) ?? {
        bronzeRate: 0.05,
        silverRate: 0.08,
        goldRate: 0.1,
        vipRate: 0.15,
        silverThreshold: 75,
        goldThreshold: 150,
        vipThreshold: 300,
      };

    const tierOrder = ['Bronze', 'Silver', 'Gold', 'VIP'] as const;
    const currentIdx = tierOrder.indexOf(customer.tier as (typeof tierOrder)[number]);
    const nextTier = currentIdx >= 0 && currentIdx < tierOrder.length - 1 ? tierOrder[currentIdx + 1] : undefined;
    const thresholdMap: Record<string, number> = {
      Silver: config.silverThreshold,
      Gold: config.goldThreshold,
      VIP: config.vipThreshold,
    };
    const pointsToNextTier = nextTier ? Math.max(0, thresholdMap[nextTier] - customer.ltv) : undefined;

    return {
      customer: await this.getProfile(customerId),
      config,
      nextTier,
      pointsToNextTier,
      qrCode: `${CRM_QR_PREFIX}${customer.id}`,
    };
  }

  async getLoyaltyTransactions(customerId: string) {
    return prisma.loyaltyTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async updateProfile(customerId: string, data: { name?: string; email?: string; allergyNotes?: string }) {
    return prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.allergyNotes !== undefined ? { allergyNotes: data.allergyNotes } : {}),
      },
    });
  }
}

export const guestAuthService = new GuestAuthService();
