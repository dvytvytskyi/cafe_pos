import { normalizeAllergenList } from '../allergens';

export interface PosModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface PosModifierGroup {
  id: string;
  name: string;
  minQty: number;
  maxQty: number;
  options: PosModifierOption[];
}

export interface PosMenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  sizes?: string[];
  allergens?: string[];
  categoryId?: string;
  modifierGroups?: PosModifierGroup[];
}

export interface PosMenuCategory {
  id: string;
  name: string;
  items: PosMenuItem[];
  modifierGroups?: PosModifierGroup[];
}

export interface EmenuMappedMenu {
  categories: Array<{ id: string; name: string }>;
  dishes: Array<{
    id: string;
    categoryId: string;
    categoryName: string;
    name: string;
    description: string;
    image: string;
    basePrice: number;
    allergens: string[];
  }>;
}

interface DbModifierGroup {
  id: string;
  name: string;
  minQty: number;
  maxQty: number;
  options?: Array<{ id: string; name: string; price: number }>;
}

interface DbMenuCategory {
  id: string;
  name: string;
  items?: Array<{
    id: string;
    name: string;
    description?: string | null;
    price: number;
    allergens?: string[];
    modifierGroups?: DbModifierGroup[];
  }>;
  modifierGroups?: DbModifierGroup[];
}

const DEFAULT_EMENU_IMAGE =
  'https://images.pexels.com/photos/37417630/pexels-photo-37417630.jpeg';

function mapItemAllergens(allergens?: string[]): string[] {
  return normalizeAllergenList(allergens);
}

function mapModifierGroups(groups?: DbModifierGroup[]): PosModifierGroup[] {
  return (groups ?? [])
    .map((g) => ({
      id: g.id,
      name: g.name,
      minQty: g.minQty,
      maxQty: g.maxQty,
      options: (g.options ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        price: o.price,
      })),
    }))
    .filter((g) => g.options.length > 0);
}

/** Prefer per-item modifier groups; fall back to category-level (legacy). */
export function resolvePosItemModifierGroups(
  item: Pick<PosMenuItem, 'modifierGroups' | 'categoryId'>,
  category?: Pick<PosMenuCategory, 'modifierGroups'>
): PosModifierGroup[] {
  const itemGroups = item.modifierGroups?.filter((g) => g.options.length > 0) ?? [];
  if (itemGroups.length > 0) return itemGroups;
  return category?.modifierGroups?.filter((g) => g.options.length > 0) ?? [];
}

export function mapCategoriesToEmenuMenu(
  categories: DbMenuCategory[] | null | undefined,
  defaultImage: string = DEFAULT_EMENU_IMAGE
): EmenuMappedMenu {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { categories: [], dishes: [] };
  }

  const mappedCategories = categories.map((cat) => ({ id: cat.id, name: cat.name }));
  const dishes = categories.flatMap((cat) =>
    (cat.items || []).map((item) => ({
      id: item.id,
      categoryId: cat.id,
      categoryName: cat.name,
      name: item.name,
      description: item.description || '',
      image: defaultImage,
      basePrice: item.price,
      allergens: mapItemAllergens(item.allergens),
    }))
  );

  return { categories: mappedCategories, dishes };
}

interface DbMenuCategoryLegacy {
  id: string;
  name: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    allergens?: string[];
  }>;
}

export function mapCategoriesToPosMenu(categories: DbMenuCategory[] | null | undefined): PosMenuCategory[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    modifierGroups: mapModifierGroups(cat.modifierGroups),
    items: (cat.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      allergens: mapItemAllergens(item.allergens),
      sizes: [],
      categoryId: cat.id,
      modifierGroups: mapModifierGroups(item.modifierGroups),
    })),
  }));
}
