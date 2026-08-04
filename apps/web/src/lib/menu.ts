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
  isArchived: boolean;
  items: MenuItem[];
}

export async function getMenuCategoriesAsync(includeArchived: boolean = false): Promise<MenuCategory[]> {
  const res = await fetch(`/api/menu/categories?includeArchived=${includeArchived}`);
  if (!res.ok) {
    throw new Error('Failed to fetch menu categories from PostgreSQL');
  }
  return res.json();
}

export async function createCategoryAsync(name: string): Promise<MenuCategory> {
  const res = await fetch('/api/menu/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error('Failed to create menu category in PostgreSQL');
  }
  return res.json();
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
