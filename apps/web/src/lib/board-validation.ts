export type BoardStage = {
  id: string;
  label: string;
  color: string;
};

export interface BoardValidationResult {
  valid: boolean;
  error?: string;
}

export class BoardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoardValidationError';
  }
}

/** T9.2 — single column name must be non-empty */
export function validateStageLabel(label: string): BoardValidationResult {
  const trimmed = label.trim();
  if (!trimmed) {
    return { valid: false, error: 'Column name cannot be empty' };
  }
  return { valid: true };
}

/** T9.1 — duplicate column names blocked (case-insensitive) */
export function validateBoardStages(stages: BoardStage[]): BoardValidationResult {
  if (!Array.isArray(stages) || stages.length === 0) {
    return { valid: false, error: 'At least one column is required' };
  }

  const labels: string[] = [];
  for (const stage of stages) {
    const labelCheck = validateStageLabel(stage.label);
    if (!labelCheck.valid) {
      return labelCheck;
    }
    if (!stage.id?.trim()) {
      return { valid: false, error: 'Each column must have an id' };
    }
    labels.push(stage.label.trim().toLowerCase());
  }

  const unique = new Set(labels);
  if (unique.size !== labels.length) {
    return { valid: false, error: 'Duplicate column names are not allowed' };
  }

  return { valid: true };
}

export function assertValidBoardStages(stages: BoardStage[]): void {
  const result = validateBoardStages(stages);
  if (!result.valid) {
    throw new BoardValidationError(result.error ?? 'Invalid board columns');
  }
}
