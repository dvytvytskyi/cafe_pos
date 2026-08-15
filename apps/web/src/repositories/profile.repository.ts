import { prisma } from '../lib/db.ts';
import {
  EmailAlreadyInUseError,
  InvalidCurrentPasswordError,
  ProfileValidationError,
  validateProfileEmail,
  validateProfileName,
  validateProfilePhone,
  validateNewPassword,
} from '../lib/profile-validation.ts';
import { hashPassword, verifyPassword } from '../lib/profile-password.ts';

export type ProfileRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarInitials: string | null;
  avatarUrl: string | null;
  role: { id: string; name: string };
  locations: { id: string; name: string }[];
  hasPassword: boolean;
};

function mapProfile(user: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarInitials: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  role: { id: string; name: string };
  locations: { id: string; name: string }[];
}): ProfileRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarInitials: user.avatarInitials,
    avatarUrl: user.avatarUrl,
    role: { id: user.role.id, name: user.role.name },
    locations: user.locations.map((loc) => ({ id: loc.id, name: loc.name })),
    hasPassword: !!user.passwordHash,
  };
}

export class ProfileRepository {
  async findById(userId: string): Promise<ProfileRecord | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, locations: true },
    });
    if (!user) return null;
    return mapProfile(user);
  }

  private async assertEmailAvailable(email: string, excludeUserId: string) {
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        id: { not: excludeUserId },
      },
    });
    if (existing) {
      throw new EmailAlreadyInUseError();
    }
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string; phone?: string | null; avatarUrl?: string | null }
  ): Promise<ProfileRecord> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.name = validateProfileName(data.name);
    }
    if (data.email !== undefined) {
      const email = validateProfileEmail(data.email);
      await this.assertEmailAvailable(email, userId);
      updateData.email = email;
    }
    if (data.phone !== undefined) {
      updateData.phone = validateProfilePhone(data.phone);
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl === null ? null : String(data.avatarUrl).trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ProfileValidationError('No profile fields to update');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true, locations: true },
    });
    return mapProfile(user);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ProfileValidationError('User not found');
    }

    const nextPassword = validateNewPassword(newPassword);

    if (user.passwordHash) {
      if (!oldPassword || !verifyPassword(oldPassword, user.passwordHash)) {
        throw new InvalidCurrentPasswordError();
      }
    } else if (oldPassword) {
      throw new InvalidCurrentPasswordError();
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(nextPassword) },
    });
  }
}

export const profileRepository = new ProfileRepository();
