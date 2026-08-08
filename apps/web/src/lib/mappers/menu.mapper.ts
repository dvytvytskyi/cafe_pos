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

interface DbMenuCategory {
  id: string;
  name: string;
  items?: Array<{
    id: string;
    name: string;
    description?: string | null;
    price: number;
    allergens?: string[];
  }>;
  modifierGroups?: Array<{
    id: string;
    name: string;
    minQty: number;
    maxQty: number;
    options?: Array<{ id: string; name: string; price: number }>;
  }>;
}

const DEFAULT_EMENU_IMAGE =
  'https://images.pexels.com/photos/37417630/pexels-photo-37417630.jpeg';

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
      allergens: item.allergens || [],
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
    modifierGroups: (cat.modifierGroups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      minQty: g.minQty,
      maxQty: g.maxQty,
      options: (g.options ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        price: o.price,
      })),
    })),
    items: (cat.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      allergens: item.allergens || [],
      sizes: [],
      categoryId: cat.id,
    })),
  }));
}
