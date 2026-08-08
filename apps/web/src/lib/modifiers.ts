export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  price: number;
  isArchived: boolean;
  sortOrder?: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minQty: number;
  maxQty: number;
  isArchived: boolean;
  sortOrder?: number;
  options: ModifierOption[];
  categories?: Array<{ id: string; name: string }>;
}

export async function getModifierGroupsAsync(includeArchived = false): Promise<ModifierGroup[]> {
  const res = await fetch(`/api/modifiers/groups?includeArchived=${includeArchived}`);
  if (!res.ok) throw new Error('Failed to fetch modifier groups');
  return res.json();
}

export async function createModifierGroupAsync(data: {
  name: string;
  minQty?: number;
  maxQty?: number;
  options?: Array<{ name: string; price: number }>;
  categoryIds?: string[];
}): Promise<ModifierGroup> {
  const res = await fetch('/api/modifiers/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create modifier group');
  }
  return res.json();
}

export async function updateModifierGroupAsync(
  id: string,
  data: { name?: string; minQty?: number; maxQty?: number; isArchived?: boolean }
): Promise<ModifierGroup> {
  const res = await fetch(`/api/modifiers/groups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update modifier group');
  }
  return res.json();
}

export async function archiveModifierGroupAsync(id: string): Promise<ModifierGroup> {
  const res = await fetch(`/api/modifiers/groups/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to archive modifier group');
  return res.json();
}

export async function addModifierOptionAsync(
  groupId: string,
  data: { name: string; price: number }
): Promise<ModifierOption> {
  const res = await fetch(`/api/modifiers/groups/${groupId}/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add modifier option');
  }
  return res.json();
}

export async function updateModifierOptionAsync(
  id: string,
  data: { name?: string; price?: number; isArchived?: boolean }
): Promise<ModifierOption> {
  const res = await fetch(`/api/modifiers/options/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update modifier option');
  }
  return res.json();
}

export async function linkModifierGroupCategoriesAsync(
  groupId: string,
  categoryIds: string[]
): Promise<ModifierGroup> {
  const res = await fetch(`/api/modifiers/groups/${groupId}/categories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to link categories');
  }
  return res.json();
}
