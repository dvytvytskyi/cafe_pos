import { cache } from './cache/index.ts';

export const MENU_CATEGORIES_CACHE_PREFIX = 'menu:categories:';

export function menuCategoriesCacheKey(includeArchived: boolean): string {
  return `${MENU_CATEGORIES_CACHE_PREFIX}${includeArchived}`;
}

export async function invalidateMenuCache(): Promise<void> {
  await cache.clear(MENU_CATEGORIES_CACHE_PREFIX);
}
