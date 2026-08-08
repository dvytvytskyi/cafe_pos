export interface TaskTag {
  label: string;
  bg: string;
  text: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string | null;
  branch: string;
  tags: TaskTag[];
  comments: number;
  attachments: number;
  progress: number;
  deadline: string;
  assignees: string[];
  status: string;
  scheduledDate: string;
  dueAt?: string | null;
  locationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  date?: string;
  assigneeId?: string;
  status?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDeadlineLabel(
  dueAt: Date | null | undefined,
  status: string,
  progress: number
): string {
  if (status === 'completed' || status === 'archived' || progress >= 100) {
    return 'Done';
  }
  if (!dueAt) return 'No deadline';

  const now = new Date();
  const diffMs = dueAt.getTime() - now.getTime();
  if (diffMs < 0) return 'Overdue';

  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 30) return `${diffDays}d`;

  const hours = dueAt.getHours().toString().padStart(2, '0');
  const minutes = dueAt.getMinutes().toString().padStart(2, '0');
  return `${dueAt.getDate()} ${MONTH_NAMES[dueAt.getMonth()]} ${dueAt.getFullYear()} at ${hours}:${minutes}`;
}

export function parseDeadlineToDate(deadline: string): Date | null {
  if (!deadline || deadline === 'No deadline' || deadline === 'Done' || deadline === 'Overdue') {
    return null;
  }
  if (/^\d+d$/.test(deadline)) {
    const days = Number(deadline.replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
  const parsed = new Date(deadline.replace(' at ', ' '));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mapDbTaskToRecord(dbTask: any): TaskRecord {
  const tags = Array.isArray(dbTask.tags) ? dbTask.tags : [];
  const dueAt = dbTask.dueAt ? new Date(dbTask.dueAt) : null;
  const scheduled = dbTask.scheduledDate ? new Date(dbTask.scheduledDate) : new Date();

  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    branch: dbTask.branch,
    tags,
    comments: dbTask.commentsCount ?? 0,
    attachments: dbTask.attachmentsCount ?? 0,
    progress: dbTask.progress ?? 0,
    deadline: formatDeadlineLabel(dueAt, dbTask.status, dbTask.progress ?? 0),
    assignees: dbTask.assigneeIds ?? [],
    status: dbTask.status,
    scheduledDate: scheduled.toISOString().slice(0, 10),
    dueAt: dueAt ? dueAt.toISOString() : null,
    locationId: dbTask.locationId,
    createdAt: new Date(dbTask.createdAt).toISOString(),
    updatedAt: new Date(dbTask.updatedAt).toISOString(),
  };
}

export function mapUiTaskToPayload(task: Partial<TaskRecord> & { title: string; status: string }) {
  const dueAt = task.dueAt
    ? new Date(task.dueAt)
    : task.deadline
      ? parseDeadlineToDate(task.deadline)
      : null;

  const scheduledDate = task.scheduledDate
    ? parseDateParam(task.scheduledDate)
    : startOfDay(new Date());

  return {
    title: task.title,
    description: task.description ?? null,
    branch: task.branch ?? 'All Branches',
    tags: task.tags ?? [],
    commentsCount: task.comments ?? 0,
    attachmentsCount: task.attachments ?? 0,
    progress: task.progress ?? 0,
    dueAt,
    scheduledDate,
    assigneeIds: task.assignees ?? [],
    status: task.status,
    locationId: task.locationId ?? null,
  };
}

import { parseDateParam, startOfDay } from './task-dates.ts';
