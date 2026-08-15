export class ModifierValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModifierValidationError';
  }
}

/** T15.1 — maxQty must be >= minQty */
export function validateModifierQty(minQty: unknown, maxQty: unknown): { minQty: number; maxQty: number } {
  const min = parseQty(minQty, 'minQty');
  const max = parseQty(maxQty, 'maxQty');
  if (max < min) {
    throw new ModifierValidationError('maxQty must be greater than or equal to minQty');
  }
  return { minQty: min, maxQty: max };
}

function parseQty(value: unknown, field: string): number {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
    throw new ModifierValidationError(`${field} must be a non-negative integer`);
  }
  return num;
}

/** T15.2 — modifier option price >= 0 */
export function validateModifierPrice(price: unknown): number {
  if (typeof price === 'number') {
    if (!Number.isFinite(price) || price < 0) {
      throw new ModifierValidationError('Modifier price must be zero or greater');
    }
    return Math.round(price * 100) / 100;
  }
  if (typeof price === 'string') {
    const trimmed = price.trim();
    const normalized = trimmed.includes(',')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed;
    if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new ModifierValidationError('Modifier price must be a valid decimal');
    }
    const num = parseFloat(normalized);
    if (num < 0) {
      throw new ModifierValidationError('Modifier price must be zero or greater');
    }
    return Math.round(num * 100) / 100;
  }
  throw new ModifierValidationError('Modifier price must be zero or greater');
}

export function validateModifierName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new ModifierValidationError('Modifier name is required');
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ModifierValidationError('Modifier name cannot be empty');
  }
  return trimmed;
}
