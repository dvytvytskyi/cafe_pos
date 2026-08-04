import { prisma } from '../lib/db';

export class RoleRepository {
  async findById(id: string) {
    return prisma.role.findUnique({
      where: { id },
    });
  }

  async findByName(name: string) {
    return prisma.role.findUnique({
      where: { name },
    });
  }

  async findAll() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(name: string, permissions: any = {}) {
    return prisma.role.create({
      data: {
        name,
        permissions,
      },
    });
  }

  async update(id: string, data: { name?: string; permissions?: any }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;

    return prisma.role.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    try {
      await prisma.role.delete({ where: { id } });
      return true;
    } catch (e) {
      console.error(`Error deleting role [${id}]:`, e);
      return false;
    }
  }
}

export const roleRepository = new RoleRepository();
