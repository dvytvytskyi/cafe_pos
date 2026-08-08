import { cache } from './cache/index.ts';

export const INVENTORY_ITEMS_CACHE_KEY = 'inventory:items';

export async function invalidateInventoryCache(): Promise<void> {
  await cache.delete(INVENTORY_ITEMS_CACHE_KEY);
}
