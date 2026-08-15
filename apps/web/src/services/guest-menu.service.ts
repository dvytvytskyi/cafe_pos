import { menuRepository } from '../repositories/menu.repository';
import { DEFAULT_EMENU_IMAGE, type GuestLocale } from '../lib/guest-constants';
import { normalizeAllergenList } from '../lib/allergens';

type DbCategory = Awaited<ReturnType<typeof menuRepository.getCategories>>[number];
type DbItem = NonNullable<DbCategory['items']>[number];
type DbModifierGroup = NonNullable<DbCategory['modifierGroups']>[number];

function pickTranslation(
  item: DbItem & { translations?: Array<{ locale: string; name: string; description: string | null }> },
  locale: GuestLocale
) {
  const translation = item.translations?.find((t) => t.locale === locale);
  return {
    name: translation?.name ?? item.name,
    description: translation?.description ?? item.description ?? '',
  };
}

function itemVisibleAtLocation(item: DbItem, locationId: string): boolean {
  if (item.isArchived) return false;
  if (item.isVisible === false) return false;
  const locs = item.locationIds ?? [];
  if (locs.length === 0) return true;
  return locs.includes(locationId);
}

import { filterDishesBySearch } from '@/lib/menu-validation';

export class GuestMenuService {
  async getMenu(locationId: string, locale: GuestLocale, searchQuery?: string) {
    const categories = await menuRepository.getCategories(false);

    const mappedCategories = categories.map((cat) => ({ id: cat.id, name: cat.name }));

    const items = categories.flatMap((cat) => {
      const modifierGroups = (cat.modifierGroups ?? []).map((g: DbModifierGroup) => ({
        id: g.id,
        name: g.name,
        minQty: g.minQty,
        maxQty: g.maxQty,
        options: (g.options ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          price: o.price,
        })),
      }));

      return (cat.items ?? [])
        .filter((item) => itemVisibleAtLocation(item as DbItem, locationId))
        .map((item) => {
          const t = pickTranslation(item as DbItem & { translations?: any[] }, locale);
          return {
            id: item.id,
            categoryId: cat.id,
            categoryName: cat.name,
            name: t.name,
            description: t.description,
            image: (item as DbItem).imageUrl || DEFAULT_EMENU_IMAGE,
            basePrice: item.price,
            allergens: normalizeAllergenList(item.allergens),
            tags: (item as DbItem).tags ?? [],
            modifierGroups,
          };
        });
    });

    const filteredItems = searchQuery?.trim()
      ? filterDishesBySearch(items, searchQuery.trim())
      : items;

    return { categories: mappedCategories, items: filteredItems, locale };
  }

  async getMenuItem(itemId: string, locationId: string, locale: GuestLocale) {
    const menu = await this.getMenu(locationId, locale);
    const item = menu.items.find((i) => i.id === itemId);
    if (!item) return null;
    return item;
  }
}

export const guestMenuService = new GuestMenuService();
