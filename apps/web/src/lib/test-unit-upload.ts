import assert from 'assert';
import {
  validateUploadFile,
  buildUniqueUploadFilename,
  UploadValidationError,
  MAX_UPLOAD_BYTES,
} from './upload-validation.ts';

export async function run() {
  console.log('Running test-unit-upload...');

  // T11.1 — reject .txt
  assert.throws(
    () =>
      validateUploadFile({
        name: 'notes.txt',
        type: 'text/plain',
        size: 100,
      }),
    UploadValidationError
  );

  // T11.2 — reject >5MB
  assert.throws(
    () =>
      validateUploadFile({
        name: 'huge.png',
        type: 'image/png',
        size: MAX_UPLOAD_BYTES + 1,
      }),
    UploadValidationError
  );

  // valid png passes
  assert.doesNotThrow(() =>
    validateUploadFile({
      name: 'proof.png',
      type: 'image/png',
      size: 1024,
    })
  );

  // T11.3 — unique filename generation
  const a = buildUniqueUploadFilename('photo.jpg', 1000, 'aaaaaa');
  const b = buildUniqueUploadFilename('photo.jpg', 1000, 'bbbbbb');
  assert.notStrictEqual(a, b);
  assert.match(a, /^1000-aaaaaa\.jpg$/);
  assert.match(b, /^1000-bbbbbb\.jpg$/);

  console.log('✅ test-unit-upload passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
