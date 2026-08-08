export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthValidationError';
  }
}

/** T35.1 — strip non-digits; require exactly 4 digit characters */
export function normalizePinInput(raw: unknown): string {
  if (raw === undefined || raw === null) {
    throw new AuthValidationError('PIN code is required');
  }
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 4) {
    throw new AuthValidationError('PIN must be exactly 4 digits');
  }
  return digits;
}
