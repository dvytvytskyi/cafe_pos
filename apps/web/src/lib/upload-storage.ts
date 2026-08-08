import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import {
  buildUniqueUploadFilename,
  validateUploadFile,
} from './upload-validation.ts';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export type SavedUpload = {
  url: string;
  filename: string;
  absolutePath: string;
};

export async function saveUploadedFile(file: File): Promise<SavedUpload> {
  validateUploadFile({
    name: file.name,
    type: file.type,
    size: file.size,
  });

  const filename = buildUniqueUploadFilename(file.name);
  await mkdir(UPLOADS_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const absolutePath = path.join(UPLOADS_DIR, filename);
  await writeFile(absolutePath, buffer);

  return {
    url: `/uploads/${filename}`,
    filename,
    absolutePath,
  };
}
