import { prisma } from '../lib/db.ts';
import { createHash } from 'crypto';
import {
  validatePin,
  validateEmployeeName,
  PinDuplicateError,
} from '../lib/staff-validation.ts';

export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

export { PinDuplicateError };

export class UserRepository {
  async ensureDefaultStaff(): Promise<void> {
    const role = await prisma.role.upsert({
      where: { name: 'Waiter' },
      update: {},
      create: {
        id: 'role-default-waiter',
        name: 'Waiter',
        permissions: { orders: ['view', 'create'], tasks: ['view', 'create'] },
      },
    });

    const seeds = [
      {
        id: 'staff-001',
        name: 'Anna Muñoz Hidalgo',
        pin: '1234',
        position: 'Waiter',
        section: 'Floor',
        avatarInitials: 'AM',
        email: 'anna@corgicafe.local',
      },
      {
        id: 'staff-002',
        name: 'Denis Donets',
        pin: '5678',
        position: 'Bartender',
        section: 'Floor',
        avatarInitials: 'DD',
        email: 'denis@corgicafe.local',
      },
      {
        id: 'staff-003',
        name: 'Albert Mesropov',
        pin: '9012',
        position: 'Cleaner',
        section: 'Kitchen',
        avatarInitials: 'AM',
        email: 'albert@corgicafe.local',
      },
    ];

    for (const seed of seeds) {
      await prisma.user.upsert({
        where: { id: seed.id },
        update: { status: 'active' },
        create: {
          id: seed.id,
          name: seed.name,
          pinHash: hashPin(seed.pin),
          roleId: role.id,
          position: seed.position,
          section: seed.section,
          email: seed.email,
          avatarInitials: seed.avatarInitials,
          status: 'active',
        },
      });
    }
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true, locations: true },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
  }) {
    await this.ensureDefaultStaff();

    const where: Record<string, unknown> = {};
    if (options?.status && options.status !== 'all') {
      where.status = options.status;
    }
    if (options?.search?.trim()) {
      where.name = { contains: options.search.trim(), mode: 'insensitive' };
    }

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 100));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true, locations: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  private async assertPinAvailable(pin: string, excludeUserId?: string) {
    const existing = await this.findByPin(pin);
    if (existing && existing.id !== excludeUserId) {
      throw new PinDuplicateError();
    }
  }

  async findByPin(pin: string) {
    const pinHash = hashPin(pin);
    return prisma.user.findFirst({
      where: { pinHash },
      include: { role: true, locations: true },
    });
  }

  async create(data: {
    name: string;
    pin: string;
    roleId: string;
    locationIds?: string[];
    position?: string;
    section?: string;
    nie?: string;
    phone?: string;
    email?: string;
    contractStart?: string;
    contractEnd?: string;
    scheduleStart?: string;
    scheduleEnd?: string;
    daysPerWeek?: number;
    avatarInitials?: string;
    status?: string;
  }) {
    const name = validateEmployeeName(data.name);
    const pin = validatePin(data.pin);
    await this.assertPinAvailable(pin);

    const pinHash = hashPin(pin);
    return prisma.user.create({
      data: {
        name,
        pinHash,
        roleId: data.roleId,
        position: data.position,
        section: data.section,
        nie: data.nie,
        phone: data.phone,
        email: data.email,
        contractStart: data.contractStart,
        contractEnd: data.contractEnd,
        scheduleStart: data.scheduleStart,
        scheduleEnd: data.scheduleEnd,
        daysPerWeek: data.daysPerWeek,
        avatarInitials: data.avatarInitials,
        status: data.status || 'active',
        locations: data.locationIds ? {
          connect: data.locationIds.map(id => ({ id })),
        } : undefined,
      },
      include: { role: true, locations: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    pin?: string;
    roleId?: string;
    locationIds?: string[];
    position?: string;
    section?: string;
    nie?: string;
    phone?: string;
    email?: string;
    contractStart?: string;
    contractEnd?: string;
    scheduleStart?: string;
    scheduleEnd?: string;
    daysPerWeek?: number;
    avatarInitials?: string;
    status?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = validateEmployeeName(data.name);
    if (data.pin !== undefined) {
      const pin = validatePin(data.pin);
      await this.assertPinAvailable(pin, id);
      updateData.pinHash = hashPin(pin);
    }
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.section !== undefined) updateData.section = data.section;
    if (data.nie !== undefined) updateData.nie = data.nie;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.contractStart !== undefined) updateData.contractStart = data.contractStart;
    if (data.contractEnd !== undefined) updateData.contractEnd = data.contractEnd;
    if (data.scheduleStart !== undefined) updateData.scheduleStart = data.scheduleStart;
    if (data.scheduleEnd !== undefined) updateData.scheduleEnd = data.scheduleEnd;
    if (data.daysPerWeek !== undefined) updateData.daysPerWeek = data.daysPerWeek;
    if (data.avatarInitials !== undefined) updateData.avatarInitials = data.avatarInitials;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.locationIds !== undefined) {
      updateData.locations = {
        set: data.locationIds.map(id => ({ id })),
      };
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true, locations: true },
    });
  }

  async delete(id: string) {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch (e) {
      console.error(`Error deleting user [${id}]:`, e);
      return false;
    }
  }
}

export const userRepository = new UserRepository();
