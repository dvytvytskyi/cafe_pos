import { prisma } from '../lib/db';
import { createHash } from 'crypto';

export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true, locations: true },
    });
  }

  async findAll() {
    return prisma.user.findMany({
      include: { role: true, locations: true },
      orderBy: { name: 'asc' },
    });
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
    const pinHash = hashPin(data.pin);
    return prisma.user.create({
      data: {
        name: data.name,
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
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.pin !== undefined) updateData.pinHash = hashPin(data.pin);
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
