/**
 * EU mandatory allergens — Regulation (EU) No 1169/2011, Annex II.
 * Consolidated text applicable in 2026 (EUR-Lex 02011R1169-20250401).
 * @see https://eur-lex.europa.eu/eli/reg/2011/1169/annex/II
 */

export type EuAllergenId =
  | 'Gluten'
  | 'Crustaceans'
  | 'Eggs'
  | 'Fish'
  | 'Peanuts'
  | 'Soybeans'
  | 'Milk'
  | 'Nuts'
  | 'Celery'
  | 'Mustard'
  | 'Sesame'
  | 'Sulphites'
  | 'Lupin'
  | 'Molluscs';

export type EuAllergenDefinition = {
  id: EuAllergenId;
  /** Legal name as listed in Annex II */
  annexName: string;
  icon: string;
  aliases: readonly string[];
};

export const EU_ALLERGENS: readonly EuAllergenDefinition[] = [
  {
    id: 'Gluten',
    annexName: 'Cereals containing gluten',
    icon: '🌾',
    aliases: ['gluten', 'cereals containing gluten', 'wheat', 'barley', 'rye', 'oats'],
  },
  {
    id: 'Crustaceans',
    annexName: 'Crustaceans',
    icon: '🦐',
    aliases: ['crustaceans', 'crustacean', 'shellfish', 'shrimp', 'prawns'],
  },
  {
    id: 'Eggs',
    annexName: 'Eggs',
    icon: '🥚',
    aliases: ['eggs', 'egg'],
  },
  {
    id: 'Fish',
    annexName: 'Fish',
    icon: '🐟',
    aliases: ['fish'],
  },
  {
    id: 'Peanuts',
    annexName: 'Peanuts',
    icon: '🥜',
    aliases: ['peanuts', 'peanut', 'groundnuts'],
  },
  {
    id: 'Soybeans',
    annexName: 'Soybeans',
    icon: '🫘',
    aliases: ['soybeans', 'soy', 'soya'],
  },
  {
    id: 'Milk',
    annexName: 'Milk',
    icon: '🥛',
    aliases: ['milk', 'dairy', 'lactose'],
  },
  {
    id: 'Nuts',
    annexName: 'Nuts',
    icon: '🌰',
    aliases: ['nuts', 'tree nuts', 'almonds', 'hazelnuts', 'walnuts', 'cashews'],
  },
  {
    id: 'Celery',
    annexName: 'Celery',
    icon: '🥬',
    aliases: ['celery'],
  },
  {
    id: 'Mustard',
    annexName: 'Mustard',
    icon: '🟡',
    aliases: ['mustard'],
  },
  {
    id: 'Sesame',
    annexName: 'Sesame seeds',
    icon: '⚪',
    aliases: ['sesame', 'sesame seeds'],
  },
  {
    id: 'Sulphites',
    annexName: 'Sulphur dioxide and sulphites',
    icon: '🧪',
    aliases: ['sulphites', 'sulfites', 'sulphur dioxide', 'so2'],
  },
  {
    id: 'Lupin',
    annexName: 'Lupin',
    icon: '🌸',
    aliases: ['lupin', 'lupine'],
  },
  {
    id: 'Molluscs',
    annexName: 'Molluscs',
    icon: '🦪',
    aliases: ['molluscs', 'mollusks', 'mollusk'],
  },
] as const;

export const ALLOWED_ALLERGENS: readonly EuAllergenId[] = EU_ALLERGENS.map((a) => a.id);

export const ALLERGEN_FILTER_OPTIONS: readonly EuAllergenId[] = ALLOWED_ALLERGENS;

export type AllergenFilterOption = EuAllergenId;

const ALLERGEN_LOOKUP = new Map<string, EuAllergenId>(
  EU_ALLERGENS.flatMap((a) => [
    [a.id.toLowerCase(), a.id],
    ...a.aliases.map((alias) => [alias.toLowerCase(), a.id] as const),
  ])
);

export const ALLERGEN_ICONS: Record<string, string> = Object.fromEntries(
  EU_ALLERGENS.flatMap((a) => [[a.id, a.icon], ...a.aliases.map((alias) => [alias, a.icon])])
);

export function normalizeAllergenId(raw: string): EuAllergenId | null {
  return ALLERGEN_LOOKUP.get(raw.trim().toLowerCase()) ?? null;
}

export function allergenIcon(raw: string): string {
  const id = normalizeAllergenId(raw);
  if (id) return ALLERGEN_ICONS[id] ?? '⚠️';
  return ALLERGEN_ICONS[raw.toLowerCase()] ?? '⚠️';
}

export function validateAllergenIds(allergens: unknown): EuAllergenId[] {
  if (allergens === undefined || allergens === null) return [];
  if (!Array.isArray(allergens)) {
    throw new Error('Allergens must be an array');
  }
  const result: EuAllergenId[] = [];
  for (const raw of allergens) {
    if (typeof raw !== 'string') {
      throw new Error('Invalid allergen');
    }
    const match = normalizeAllergenId(raw);
    if (!match) {
      throw new Error(`Invalid allergen: ${raw}`);
    }
    if (!result.includes(match)) result.push(match);
  }
  return result;
}

export function allergensMatch(a: string, b: string): boolean {
  const na = normalizeAllergenId(a);
  const nb = normalizeAllergenId(b);
  if (na && nb) return na === nb;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function normalizeAllergenList(raw: string[] | undefined | null): EuAllergenId[] {
  if (!raw?.length) return [];
  const out: EuAllergenId[] = [];
  for (const item of raw) {
    const id = normalizeAllergenId(item);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export function globalAllergenCatalog(): Array<{ id: string; name: EuAllergenId; annexName: string; isActive: boolean }> {
  return EU_ALLERGENS.map((a) => ({
    id: a.id,
    name: a.id,
    annexName: a.annexName,
    isActive: true,
  }));
}
