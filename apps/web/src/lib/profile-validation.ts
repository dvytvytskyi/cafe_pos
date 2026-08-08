import { EMAIL_RFC_REGEX } from './crm-validation.ts';

export class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('EMAIL_ALREADY_IN_USE');
    this.name = 'EmailAlreadyInUseError';
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super('INVALID_CURRENT_PASSWORD');
    this.name = 'InvalidCurrentPasswordError';
  }
}

/** T24.1 — min 8, upper, digit, special */
export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export function validateProfileName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new ProfileValidationError('Name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new ProfileValidationError('Name must be at least 2 characters');
  }
  if (trimmed.length > 100) {
    throw new ProfileValidationError('Name must be at most 100 characters');
  }
  return trimmed;
}

export function validateProfileEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new ProfileValidationError('Email is required');
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new ProfileValidationError('Email is required');
  }
  if (!EMAIL_RFC_REGEX.test(trimmed)) {
    throw new ProfileValidationError('Invalid email format');
  }
  return trimmed;
}

export function validateProfilePhone(phone: unknown): string | null {
  if (phone == null || phone === '') return null;
  if (typeof phone !== 'string') {
    throw new ProfileValidationError('Invalid phone format');
  }
  const trimmed = phone.trim();
  if (trimmed.length > 20) {
    throw new ProfileValidationError('Phone must be at most 20 characters');
  }
  return trimmed;
}

export function validateNewPassword(password: unknown): string {
  if (typeof password !== 'string' || !password) {
    throw new ProfileValidationError('New password is required');
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    throw new ProfileValidationError(
      'Password must be at least 8 characters with uppercase, digit, and special character'
    );
  }
  return password;
}

export function splitProfileName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? '', lastName: '' };
  }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

export function joinProfileName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first && !last) {
    throw new ProfileValidationError('First name is required');
  }
  return validateProfileName(last ? `${first} ${last}` : first);
}
