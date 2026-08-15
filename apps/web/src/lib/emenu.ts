export const DEFAULT_LOCATION_ID = 'default';

export interface EMenuDish {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  allergens: string[];
}

export interface EMenuCategory {
  id: string;
  name: string;
}

export { ALLERGEN_FILTER_OPTIONS, type AllergenFilterOption } from './allergens';

export const DEFAULT_EMENU_IMAGE =
  'https://images.pexels.com/photos/37417630/pexels-photo-37417630.jpeg';

/** Normalize table param from QR: uuid passthrough, numeric → t{n} */
export function normalizeTableId(raw: string | null | undefined): string {
  if (!raw?.trim()) return 't4';
  const trimmed = raw.trim();
  if (trimmed.includes('-')) return trimmed;
  const num = trimmed.replace(/^[Tt]/, '');
  return `t${num}`;
}

export function buildEmenuQrUrl(
  tableId: string,
  locationId: string = DEFAULT_LOCATION_ID,
  baseUrl?: string
): string {
  const origin =
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const params = new URLSearchParams({
    location: locationId,
    table: tableId,
  });
  return `${origin}/emenu?${params.toString()}`;
}

export function searchDishesByName(dishes: EMenuDish[], query: string): EMenuDish[] {
  const q = query.trim().toLowerCase();
  if (!q) return dishes;
  return dishes.filter(
    (d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
  );
}

import { allergensMatch } from './allergens';

export function filterDishesByAllergens(dishes: EMenuDish[], excludedAllergens: string[]): EMenuDish[] {
  if (!excludedAllergens.length) return dishes;
  return dishes.filter(
    (d) => !d.allergens.some((a) => excludedAllergens.some((ex) => allergensMatch(a, ex)))
  );
}

export function isCoffeeCategory(categoryName: string): boolean {
  return categoryName.toLowerCase().includes('coffee');
}
