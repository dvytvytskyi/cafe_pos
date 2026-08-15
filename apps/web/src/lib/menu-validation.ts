import { ALLOWED_ALLERGENS, validateAllergenIds as validateEuAllergenIds } from './allergens.ts';

export class MenuValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MenuValidationError';
  }
}

export { ALLOWED_ALLERGENS };

export type SortableCategory = { id: string; sortOrder: number };

/** T13.1 — reorder indices after drag fromIndex → toIndex */
export function shiftSortOrder<T extends SortableCategory>(
  categories: T[],
  fromIndex: number,
  toIndex: number
): Array<{ id: string; sortOrder: number }> {
  if (categories.length === 0) return [];
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const from = Math.max(0, Math.min(fromIndex, sorted.length - 1));
  const to = Math.max(0, Math.min(toIndex, sorted.length - 1));
  const [moved] = sorted.splice(from, 1);
  sorted.splice(to, 0, moved);
  return sorted.map((cat, index) => ({ id: cat.id, sortOrder: index }));
}

/** T13.2 — empty/whitespace category name rejected */
export function validateCategoryName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new MenuValidationError('Category name is required');
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw new MenuValidationError('Category name cannot be empty');
  }
  return trimmed;
}

export type SearchableDish = {
  name: string;
  description?: string | null;
};

/** T13.3 — case-insensitive search on name + description */
export function filterDishesBySearch<T extends SearchableDish>(dishes: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return dishes;
  return dishes.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
  );
}

/** T14.1 — price must be a positive decimal; rejects abc etc. */
export function validateDishPrice(price: unknown): number {
  if (typeof price === 'number') {
    if (!Number.isFinite(price) || price <= 0) {
      throw new MenuValidationError('Price must be a positive number');
    }
    return Math.round(price * 100) / 100;
  }
  if (typeof price === 'string') {
    const trimmed = price.trim();
    const normalized = trimmed.includes(',')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed;
    if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new MenuValidationError('Price must be a positive decimal');
    }
    const num = parseFloat(normalized);
    if (num <= 0) {
      throw new MenuValidationError('Price must be greater than zero');
    }
    return Math.round(num * 100) / 100;
  }
  throw new MenuValidationError('Price must be a positive decimal');
}

/** T14.2 — allergen IDs must be from the EU Annex II list (Reg. 1169/2011) */
export function validateAllergenIds(allergens: unknown): string[] {
  try {
    return validateEuAllergenIds(allergens);
  } catch (e) {
    throw new MenuValidationError(e instanceof Error ? e.message : 'Invalid allergen');
  }
}

export type VariantPriceInput = { price: unknown; isActive?: boolean };

/** T14.3 — active variant grid must have non-zero positive prices */
export function validateVariantPrices(variants: VariantPriceInput[]): number {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new MenuValidationError('At least one variant is required');
  }
  const active = variants.filter((v) => v.isActive !== false);
  if (active.length === 0) {
    throw new MenuValidationError('At least one active variant is required');
  }
  const prices = active.map((v) => validateDishPrice(v.price));
  return Math.min(...prices);
}

export function validateDishName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new MenuValidationError('Dish name is required');
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw new MenuValidationError('Dish name cannot be empty');
  }
  return trimmed;
}
