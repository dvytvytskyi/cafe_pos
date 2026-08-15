import { createHash, randomInt } from 'crypto';
import { prisma } from '../lib/db';
import { GUEST_OTP_MAX_ATTEMPTS, GUEST_OTP_TTL_SECONDS } from '../lib/guest-constants';
import { GuestValidationError } from '../lib/guest-validation';
import { validatePhoneE164 } from '../lib/crm-validation';

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export class GuestOtpService {
  async requestOtp(phoneRaw: unknown): Promise<{ sent: boolean; devCode?: string }> {
    const phone = validatePhoneE164(phoneRaw);

    await prisma.guestOtpChallenge.deleteMany({
      where: { phone, expiresAt: { lt: new Date() } },
    });

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + GUEST_OTP_TTL_SECONDS * 1000);

    await prisma.guestOtpChallenge.create({
      data: {
        phone,
        codeHash: hashOtp(code),
        expiresAt,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Guest OTP] ${phone}: ${code}`);
      return { sent: true, devCode: code };
    }

    // Production: integrate SMS provider here
    return { sent: true };
  }

  async verifyOtp(phoneRaw: unknown, codeRaw: unknown): Promise<{ phone: string }> {
    const phone = validatePhoneE164(phoneRaw);
    const code = typeof codeRaw === 'string' ? codeRaw.trim() : '';
    if (!/^\d{6}$/.test(code)) {
      throw new GuestValidationError('OTP code must be 6 digits');
    }

    const challenge = await prisma.guestOtpChallenge.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      throw new GuestValidationError('OTP expired or not found');
    }

    if (challenge.attempts >= GUEST_OTP_MAX_ATTEMPTS) {
      throw new GuestValidationError('Too many OTP attempts');
    }

    const valid = hashOtp(code) === challenge.codeHash;
    await prisma.guestOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: challenge.attempts + 1 },
    });

    if (!valid) {
      throw new GuestValidationError('Invalid OTP code');
    }

    await prisma.guestOtpChallenge.deleteMany({ where: { phone } });
    return { phone };
  }
}

export const guestOtpService = new GuestOtpService();
