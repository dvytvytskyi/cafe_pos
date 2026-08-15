import type { ChecklistShiftType, LocationKey } from './checklist-locations.ts';
import { formatDateParam } from './task-dates.ts';

export type ChecklistTemplate = {
  id: string;
  taskKey: string;
  title: string;
  requiresPhoto: boolean;
  category: ChecklistShiftType;
  sortOrder: number;
  permissions: Record<string, boolean>;
};

export type ChecklistCompletion = {
  id: string;
  shiftType: ChecklistShiftType;
  scheduledDate: string;
  locationKey: LocationKey;
  taskKey: string;
  completed: boolean;
  photoUrl: string | null;
  completedAt: string | null;
  completedById: string | null;
};

export type ChecklistBoardData = {
  templates: ChecklistTemplate[];
  completions: ChecklistCompletion[];
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function getChecklistsAsync(
  date: Date | string,
  shiftType?: ChecklistShiftType
): Promise<ChecklistBoardData> {
  const dateParam = typeof date === 'string' ? date : formatDateParam(date);
  const res = await fetch(
    `/api/checklists${buildQuery({ date: dateParam, shiftType })}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load checklists');
  }
  return res.json();
}

export async function saveChecklistCompletionAsync(payload: {
  shiftType: ChecklistShiftType;
  date: string;
  locationKey: LocationKey;
  taskKey: string;
  completed: boolean;
  photoUrl?: string | null;
  userId: string;
}): Promise<ChecklistCompletion> {
  const res = await fetch('/api/checklists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save checklist completion');
  }
  return res.json();
}

export async function patchChecklistCompletionAsync(
  id: string,
  payload: { completed?: boolean; photoUrl?: string | null; userId?: string }
): Promise<ChecklistCompletion> {
  const res = await fetch(`/api/checklists/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update checklist completion');
  }
  return res.json();
}

/** Build completion map keyed by `${locationKey}_${taskKey}` for UI */
export function completionsToStateMap(
  completions: ChecklistCompletion[]
): Record<string, { completed: boolean; photoUrl?: string; completionId?: string }> {
  const map: Record<string, { completed: boolean; photoUrl?: string; completionId?: string }> = {};
  for (const c of completions) {
    const key = `${c.locationKey}_${c.taskKey}`;
    map[key] = {
      completed: c.completed,
      photoUrl: c.photoUrl ?? undefined,
      completionId: c.id,
    };
  }
  return map;
}

export async function saveChecklistTemplatesAsync(
  templates: Omit<ChecklistTemplate, 'id'>[]
): Promise<ChecklistTemplate[]> {
  const res = await fetch('/api/checklists/templates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save checklist templates');
  }
  const data = await res.json();
  return data.templates;
}
