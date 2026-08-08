import { randomBytes } from 'crypto';
import path from 'path';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

export type UploadCandidate = {
  name: string;
  type: string;
  size: number;
};

export function validateUploadFile(file: UploadCandidate): void {
  if (!file.name?.trim()) {
    throw new UploadValidationError('File name is required');
  }

  const ext = path.extname(file.name).toLowerCase();
  if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
    throw new UploadValidationError('Only JPEG and PNG files are allowed');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new UploadValidationError('Only JPEG and PNG files are allowed');
  }

  if (file.size <= 0) {
    throw new UploadValidationError('File is empty');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError('File exceeds 5MB limit');
  }
}

/** T11.3 — unique filename: timestamp + random suffix, preserve extension */
export function buildUniqueUploadFilename(
  originalName: string,
  now: number = Date.now(),
  randomSuffix: string = randomBytes(6).toString('hex')
): string {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const safeExt = ext === '.jpeg' || ext === '.jpg' || ext === '.png' ? ext : '.jpg';
  return `${now}-${randomSuffix}${safeExt}`;
}
