export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  allergens: string[];
  isArchived: boolean;
  priceHistory?: { price: number; date: string }[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder?: number;
  isArchived: boolean;
  items: MenuItem[];
}

const menuCache = new Map<string, { data: MenuCategory[]; ts: number }>();
const MENU_CLIENT_CACHE_MS = 60_000;

export async function getMenuCategoriesAsync(includeArchived: boolean = false): Promise<MenuCategory[]> {
  const cacheKey = includeArchived ? 'archived' : 'active';
  const hit = menuCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < MENU_CLIENT_CACHE_MS) {
    return hit.data;
  }

  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
    try {
      const { getMenuSnapshot } = await import('./pos-offline-db');
      const snap = await getMenuSnapshot(cacheKey);
      if (snap?.categories) {
        return snap.categories as MenuCategory[];
      }
    } catch {
      // fall through to fetch attempt
    }
  }

  const res = await fetch(`/api/menu/categories?includeArchived=${includeArchived}`);
  if (!res.ok) {
    if (typeof window !== 'undefined') {
      try {
        const { getMenuSnapshot } = await import('./pos-offline-db');
        const snap = await getMenuSnapshot(cacheKey);
        if (snap?.categories) return snap.categories as MenuCategory[];
      } catch {
        // ignore
      }
    }
    throw new Error('Failed to fetch menu categories from PostgreSQL');
  }
  const data = (await res.json()) as MenuCategory[];
  menuCache.set(cacheKey, { data, ts: Date.now() });

  if (typeof window !== 'undefined') {
    import('./pos-offline-db')
      .then(({ putMenuSnapshot }) =>
        putMenuSnapshot({
          key: cacheKey,
          categories: data,
          updatedAt: new Date().toISOString(),
        })
      )
      .catch(() => {});
  }

  return data;
}

/** Warm menu cache before opening POS modal (avoids "Loading menu…" on first click). */
export function prefetchMenuCategories(): void {
  void getMenuCategoriesAsync().catch(() => {});
}

export async function createCategoryAsync(name: string): Promise<MenuCategory> {
  const res = await fetch('/api/menu/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create menu category in PostgreSQL');
  }
  return res.json();
}

export async function updateCategoryAsync(id: string, name: string): Promise<MenuCategory> {
  const res = await fetch(`/api/menu/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update menu category');
  }
  return res.json();
}

export async function reorderCategoriesAsync(orderedIds: string[]): Promise<void> {
  const res = await fetch('/api/menu/categories/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reorder menu categories');
  }
}

export async function deleteCategoryAsync(id: string, mode: 'block' | 'cascade' = 'cascade'): Promise<void> {
  const res = await fetch(`/api/menu/categories/${id}?mode=${mode}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete menu category');
  }
}

export async function createMenuItemAsync(data: {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  allergens?: string[];
}): Promise<MenuItem> {
  const res = await fetch('/api/menu/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to create menu item in PostgreSQL');
  }
  return res.json();
}

export async function updateMenuItemAsync(
  id: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    categoryId?: string;
    allergens?: string[];
    isArchived?: boolean;
  }
): Promise<MenuItem> {
  const res = await fetch(`/api/menu/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update menu item [${id}] in PostgreSQL`);
  }
  return res.json();
}

export async function archiveMenuItemAsync(id: string): Promise<MenuItem> {
  const res = await fetch(`/api/menu/items/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to archive menu item [${id}] in PostgreSQL`);
  }
  return res.json();
}

export { filterDishesBySearch } from './menu-validation.ts';
