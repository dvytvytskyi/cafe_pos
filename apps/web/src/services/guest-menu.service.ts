import { menuRepository } from '../repositories/menu.repository';
import { prisma } from '@/lib/db';
import { DEFAULT_EMENU_IMAGE, type GuestLocale } from '../lib/guest-constants';
import { normalizeAllergenList } from '../lib/allergens';
import { filterDishesBySearch } from '@/lib/menu-validation';
import {
  getMenuListingPrice,
  resolveVariantOptionPrice,
  resolveVariantPricingGroup,
  resolveChannelPrice,
  isVisibleAtSchedule,
  GUEST_RECOMMENDED_CATEGORY_ID,
  type GuestMenuUpsellItem,
  type MenuChannelPrices,
  type VisibilityScheduleRule,
} from '@corgi/contracts';

export { GUEST_RECOMMENDED_CATEGORY_ID };

type DbCategory = Awaited<ReturnType<typeof menuRepository.getCategories>>[number];
type DbItem = NonNullable<DbCategory['items']>[number];
type DbModifierGroup = NonNullable<DbItem['modifierGroups']>[number];

type MappedGuestItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  allergens: string[];
  tags: string[];
  modifierGroups: ReturnType<typeof mapModifierGroups>;
  recommendedItemIds: string[];
};

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
  const schedule = (item as DbItem & { visibilitySchedule?: VisibilityScheduleRule[] | null })
    .visibilitySchedule;
  if (!isVisibleAtSchedule(schedule)) return false;
  const locs = item.locationIds ?? [];
  if (locs.length === 0) return true;
  return locs.includes(locationId);
}

function resolveGuestBasePrice(
  item: DbItem,
  modifierGroups: ReturnType<typeof mapModifierGroups>,
  itemName: string
): number {
  const channelPrices = (item as DbItem & { channelPrices?: MenuChannelPrices | null }).channelPrices;
  const webPrice = resolveChannelPrice(item.price, channelPrices, 'web');
  return getMenuListingPrice(webPrice, modifierGroups, itemName);
}

function mapModifierGroups(
  groups: DbModifierGroup[] | undefined,
  itemName: string,
  fallbackPrice: number
) {
  const mapped = (groups ?? []).map((g) => ({
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

  const variantGroup = resolveVariantPricingGroup(mapped, itemName);
  if (!variantGroup) return mapped;

  const rawPrices = variantGroup.options.map((o) => o.price);
  return mapped.map((g) => {
    if (g.id !== variantGroup.id) return g;
    return {
      ...g,
      options: g.options.map((o) => ({
        ...o,
        price: resolveVariantOptionPrice(o.price, fallbackPrice, rawPrices),
      })),
    };
  });
}

function toUpsellItem(item: MappedGuestItem): GuestMenuUpsellItem {
  return {
    id: item.id,
    name: item.name,
    basePrice: item.basePrice,
    image: item.image,
  };
}

function isFeaturedTag(tags: string[]): boolean {
  return tags.some((t) => t === 'recommended' || t === 'new');
}

export class GuestMenuService {
  async getMenu(locationId: string, locale: GuestLocale, searchQuery?: string) {
    const categories = await menuRepository.getCategories(false);
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { layoutMetadata: true },
    });
    const layoutMeta = (location?.layoutMetadata as Record<string, unknown> | null) ?? {};
    const suggestedIds = Array.isArray(layoutMeta.guestSuggestedItemIds)
      ? (layoutMeta.guestSuggestedItemIds as string[])
      : [];

    const mappedCategories = categories
      .filter((cat) => (cat.items ?? []).some((item) => itemVisibleAtLocation(item as DbItem, locationId)))
      .map((cat) => ({ id: cat.id, name: cat.name }));

    const rawItems: MappedGuestItem[] = categories.flatMap((cat) =>
      (cat.items ?? [])
        .filter((item) => itemVisibleAtLocation(item as DbItem, locationId))
        .map((item) => {
          const t = pickTranslation(item as DbItem & { translations?: any[] }, locale);
          const dbItem = item as DbItem & { recommendedItemIds?: string[] };
          const modifierGroups = mapModifierGroups(dbItem.modifierGroups, t.name, item.price);
          return {
            id: item.id,
            categoryId: cat.id,
            categoryName: cat.name,
            name: t.name,
            description: t.description,
            image: dbItem.imageUrl || DEFAULT_EMENU_IMAGE,
            basePrice: resolveGuestBasePrice(item as DbItem, modifierGroups, t.name),
            allergens: normalizeAllergenList(item.allergens),
            tags: dbItem.tags ?? [],
            modifierGroups,
            recommendedItemIds: dbItem.recommendedItemIds ?? [],
          };
        })
    );

    const itemById = new Map(rawItems.map((i) => [i.id, i]));

    const items = rawItems.map((item) => {
      const recommendedItems = item.recommendedItemIds
        .map((id) => itemById.get(id))
        .filter((x): x is MappedGuestItem => Boolean(x))
        .slice(0, 8)
        .map(toUpsellItem);
      return {
        id: item.id,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        name: item.name,
        description: item.description,
        image: item.image,
        basePrice: item.basePrice,
        allergens: item.allergens,
        tags: item.tags,
        modifierGroups: item.modifierGroups,
        recommendedItems: recommendedItems.length > 0 ? recommendedItems : undefined,
      };
    });

    const featuredItems = rawItems.filter((i) => isFeaturedTag(i.tags));
    const categoriesOut =
      featuredItems.length > 0
        ? [{ id: GUEST_RECOMMENDED_CATEGORY_ID, name: locale === 'es' ? 'Recomendado' : 'Recommended' }, ...mappedCategories]
        : mappedCategories;

    const suggestedFromMeta = suggestedIds
      .map((id) => itemById.get(id))
      .filter((x): x is MappedGuestItem => Boolean(x))
      .map(toUpsellItem);

    const suggestedItems =
      suggestedFromMeta.length > 0
        ? suggestedFromMeta
        : featuredItems.slice(0, 8).map(toUpsellItem);

    const filteredItems = searchQuery?.trim()
      ? filterDishesBySearch(items, searchQuery.trim())
      : items;

    return {
      categories: categoriesOut,
      items: filteredItems,
      locale,
      suggestedItems: suggestedItems.length > 0 ? suggestedItems : undefined,
    };
  }

  async getMenuItem(itemId: string, locationId: string, locale: GuestLocale) {
    const menu = await this.getMenu(locationId, locale);
    const item = menu.items.find((i) => i.id === itemId);
    if (!item) return null;
    return item;
  }
}

export const guestMenuService = new GuestMenuService();
