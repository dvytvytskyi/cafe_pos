import { formatDateParam, isValidDateParam } from './task-dates';
import { TaskRecord, TaskFilters } from './task-mapper';
import { saveTaskOffline, syncOfflineData } from './offline-sync';
import { DEFAULT_LOCATION_ID } from './constants';

export type Task = TaskRecord;

export { isValidDateParam, formatDateParam };

function buildQuery(filters: TaskFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function isOffline(): boolean {
  return typeof window !== 'undefined' && !navigator.onLine;
}

function buildOfflineTask(
  data: Partial<Task> & { title: string; status?: string },
  existingId?: string
): Task {
  const now = new Date().toISOString();
  return {
    id: existingId || data.id || `T-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    title: data.title,
    description: data.description ?? null,
    branch: data.branch ?? 'All Branches',
    tags: data.tags ?? [],
    comments: data.comments ?? 0,
    attachments: data.attachments ?? 0,
    progress: data.progress ?? 0,
    deadline: data.deadline ?? 'No deadline',
    assignees: data.assignees ?? [],
    status: data.status ?? 'todo',
    scheduledDate: data.scheduledDate ?? formatDateParam(new Date()),
    dueAt: data.dueAt ?? null,
    locationId: data.locationId ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
  };
}

export async function syncTasksFromOffline(
  locationId: string = DEFAULT_LOCATION_ID
): Promise<number> {
  if (typeof window === 'undefined') return 0;
  const result = await syncOfflineData(locationId);
  return result.syncedCount;
}

export async function getTasksAsync(filters: TaskFilters = {}): Promise<Task[]> {
  const res = await fetch(`/api/tasks${buildQuery(filters)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch tasks');
  }
  return res.json();
}

export async function getTaskAsync(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch task [${id}]`);
  }
  return res.json();
}

export async function createTaskAsync(
  data: Partial<Task> & { title: string; status?: string }
): Promise<Task> {
  if (isOffline()) {
    const task = buildOfflineTask(data);
    await saveTaskOffline(task);
    return task;
  }

  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create task');
  }
  return res.json();
}

export async function updateTaskAsync(id: string, data: Partial<Task>): Promise<Task> {
  if (isOffline()) {
    const task = buildOfflineTask(
      { ...data, title: data.title ?? 'Untitled Task', status: data.status ?? 'todo' },
      id
    );
    await saveTaskOffline(task);
    return task;
  }

  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update task [${id}]`);
  }
  return res.json();
}

export async function deleteTaskAsync(id: string): Promise<boolean> {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Failed to delete task [${id}]`);
  }
  const result = await res.json();
  return result.success === true;
}

export async function migrateTaskStatusAsync(from: string, to: string): Promise<number> {
  const res = await fetch('/api/tasks/migrate-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to migrate tasks');
  }
  const data = await res.json();
  return data.migrated ?? 0;
}
