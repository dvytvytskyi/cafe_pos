import type { BoardStage } from './board-validation.ts';
import { assertValidBoardStages } from './board-validation.ts';
import { DEFAULT_LOCATION_ID } from './constants.ts';

export type BoardType = 'orders' | 'tasks';

export type { BoardStage };

export const DEFAULT_ORDER_STAGES: BoardStage[] = [
  { id: 'incoming', label: 'Incoming', color: 'bg-yellow-500' },
  { id: 'preparing', label: 'Preparing', color: 'bg-orange-500' },
  { id: 'served', label: 'Served', color: 'bg-indigo-500' },
  { id: 'ready', label: 'Ready for Pickup', color: 'bg-green-500' },
  { id: 'completed', label: 'Completed', color: 'bg-purple-500' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

export const DEFAULT_TASK_STAGES: BoardStage[] = [
  { id: 'todo', label: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-orange-500' },
  { id: 'in_review', label: 'In Review', color: 'bg-purple-500' },
  { id: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { id: 'completed', label: 'Completed', color: 'bg-green-500' },
  { id: 'archived', label: 'Archived', color: 'bg-gray-400' },
];

export function getDefaultStages(type: BoardType): BoardStage[] {
  return type === 'orders' ? DEFAULT_ORDER_STAGES : DEFAULT_TASK_STAGES;
}

function buildQuery(type: BoardType, locationId: string): string {
  const params = new URLSearchParams({ type, locationId });
  return `?${params.toString()}`;
}

export async function getBoardSettingsAsync(
  type: BoardType,
  locationId: string = DEFAULT_LOCATION_ID
): Promise<BoardStage[]> {
  const res = await fetch(`/api/settings/board${buildQuery(type, locationId)}`);
  if (!res.ok) {
    throw new Error(`Failed to load board settings for ${type}`);
  }
  const data = await res.json();
  return data.stages ?? getDefaultStages(type);
}

export async function saveBoardSettingsAsync(
  type: BoardType,
  stages: BoardStage[],
  locationId: string = DEFAULT_LOCATION_ID
): Promise<BoardStage[]> {
  assertValidBoardStages(stages);

  const res = await fetch(`/api/settings/board${buildQuery(type, locationId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to save board settings for ${type}`);
  }

  const data = await res.json();
  return data.stages;
}
