export const TASK_TITLE_MIN = 3;
export const TASK_TITLE_MAX = 500;

export interface TaskTitleValidation {
  valid: boolean;
  error?: string;
}

/** T8.1 — title length validation for NewTaskModal + API */
export function validateTaskTitle(title: string): TaskTitleValidation {
  const trimmed = title.trim();
  if (!trimmed) {
    return { valid: false, error: 'Title is required' };
  }
  if (trimmed.length < TASK_TITLE_MIN) {
    return { valid: false, error: `Title must be at least ${TASK_TITLE_MIN} characters` };
  }
  if (trimmed.length > TASK_TITLE_MAX) {
    return { valid: false, error: `Title must be at most ${TASK_TITLE_MAX} characters` };
  }
  return { valid: true };
}

/** T8.2 — exclude inactive staff from assignee picker */
export function filterActiveEmployees<T extends { status?: string }>(employees: T[]): T[] {
  return employees.filter((e) => e.status !== 'inactive');
}
