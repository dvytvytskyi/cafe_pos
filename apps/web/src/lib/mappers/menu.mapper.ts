export interface PosMenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  sizes?: string[];
  allergens?: string[];
}

export interface PosMenuCategory {
  id: string;
  name: string;
  items: PosMenuItem[];
}

interface DbMenuCategory {
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
    items: (cat.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      allergens: item.allergens || [],
      sizes: [],
    })),
  }));
}
