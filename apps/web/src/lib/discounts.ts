export interface DiscountPreset {
  id: string;
  name: string;
  value: number; // percentage
  color?: string;
}

export const DEFAULT_DISCOUNTS: DiscountPreset[] = [
  { id: '1', name: 'Staff Meal', value: 50 },
  { id: '2', name: 'Friends & Family', value: 15 },
  { id: '3', name: 'Loyalty / VIP', value: 10 },
  { id: '4', name: 'Military / Service', value: 10 },
  { id: '5', name: 'Student', value: 5 },
  { id: '6', name: 'Senior', value: 10 },
  { id: '7', name: 'Happy Hour', value: 20 },
  { id: '8', name: 'Promo Code 1', value: 5 },
  { id: '9', name: 'Promo Code 2', value: 10 },
  { id: '10', name: 'Partner', value: 25 },
  { id: '11', name: 'Birthday', value: 15 },
  { id: '12', name: 'Social Media', value: 5 },
  { id: '13', name: 'Neighborhood', value: 10 },
  { id: '14', name: 'Early Bird', value: 15 },
  { id: '15', name: 'Special Event', value: 20 },
];

/** @deprecated Use getDiscountPresetsAsync — presets are stored in PostgreSQL. */
export const getDiscountPresets = (): DiscountPreset[] => DEFAULT_DISCOUNTS;

/** @deprecated Use createDiscountPresetAsync / updateDiscountPresetAsync — no local cache. */
export const saveDiscountPresets = (_presets: DiscountPreset[]) => {};

// --- Database Connected Async Operations ---

export async function getDiscountPresetsAsync(): Promise<DiscountPreset[]> {
  const res = await fetch('/api/discounts');
  if (!res.ok) {
    throw new Error('Failed to fetch discount presets from PostgreSQL');
  }
  return res.json();
}

export async function createDiscountPresetAsync(name: string, value: number): Promise<DiscountPreset> {
  const res = await fetch('/api/discounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, value }),
  });
  if (!res.ok) {
    throw new Error('Failed to create discount preset in PostgreSQL');
  }
  return res.json();
}

export async function updateDiscountPresetAsync(
  id: string,
  patch: { name?: string; value?: number; color?: string }
): Promise<DiscountPreset> {
  const res = await fetch(`/api/discounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update discount preset [${id}] in PostgreSQL`);
  }
  return res.json();
}

export async function deleteDiscountPresetAsync(id: string): Promise<void> {
  const res = await fetch(`/api/discounts/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Failed to delete discount preset [${id}] in PostgreSQL`);
  }
}

