export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
}

export abstract class MemoryRepository<T extends { id: string }> implements IRepository<T> {
  protected items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async create(data: Partial<T>): Promise<T> {
    const id = (data as any).id || crypto.randomUUID();
    const newItem = { ...data, id } as T;
    this.items.set(id, newItem);
    return newItem;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Record with id ${id} not found`);
    const updated = { ...existing, ...data };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
