import assert from 'assert';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import { saveUploadedFile } from './upload-storage.ts';
import { checklistRepository } from '../repositories/checklist.repository.ts';
import { shiftRepository } from '../repositories/shift.repository.ts';
import { prisma, disconnectDb } from './db.ts';
import { formatDateParam } from './task-dates.ts';
import { MAX_UPLOAD_BYTES, UploadValidationError } from './upload-validation.ts';

const BASE = 'http://localhost:3000';
const ROLE_ID = 'role-upload-m11';
const USER_ID = 'user-upload-m11';
const LOCATION_ID = 'default';
const TODAY = formatDateParam(new Date());
const SAMPLE_PNG = path.join(process.cwd(), 'public/media/image.png');

async function setup() {
  await prisma.location.upsert({
    where: { id: LOCATION_ID },
    update: {},
    create: { id: LOCATION_ID, name: 'Default Cafe', address: 'Main St 1' },
  });
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'Upload M11', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'Upload Tester',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });
  await checklistRepository.ensureDefaultTemplates();
  if (!(await shiftRepository.findActiveShift(LOCATION_ID))) {
    await shiftRepository.openShift(LOCATION_ID, USER_ID, 100);
  }
}

async function cleanup(uploadedPaths: string[]) {
  for (const p of uploadedPaths) {
    await unlink(p).catch(() => {});
  }
  await prisma.dailyChecklist.deleteMany({
    where: { taskKey: 'c1', locationKey: 'gotico', scheduledDate: new Date(TODAY) },
  });
  await prisma.cashShift.deleteMany({ where: { userId: USER_ID } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: USER_ID } }).catch(() => {});
  await prisma.role.deleteMany({ where: { id: ROLE_ID } }).catch(() => {});
}

async function postUploadHttp(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return fetch(`${BASE}/api/upload`, { method: 'POST', body: formData });
}

export async function run() {
  console.log('--- Module 11 PhotoProofUpload Integration Tests ---');
  const uploadedPaths: string[] = [];

  try {
    await setup();
    const pngBuffer = await readFile(SAMPLE_PNG);

    // T11.1 — reject txt (storage layer + HTTP)
    let txtStorageBlocked = false;
    try {
      await saveUploadedFile(new File(['hello'], 'bad.txt', { type: 'text/plain' }));
    } catch (err) {
      txtStorageBlocked = err instanceof UploadValidationError;
    }
    assert.ok(txtStorageBlocked, 'Expected UploadValidationError for .txt');
    const txtRes = await postUploadHttp(new File(['hello'], 'bad.txt', { type: 'text/plain' }));
    assert.strictEqual(txtRes.status, 400);
    console.log('✅ T11.1 Reject .txt file');

    // T11.2 — reject >5MB
    const bigRes = await postUploadHttp(
      new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'big.png', { type: 'image/png' })
    );
    assert.strictEqual(bigRes.status, 400);
    const bigBody = await bigRes.json();
    assert.match(bigBody.error, /5MB/i);
    console.log('✅ T11.2 Reject >5MB');

    // T11.3 — unique filenames via HTTP
    const res1 = await postUploadHttp(new File([pngBuffer], 'a.png', { type: 'image/png' }));
    const res2 = await postUploadHttp(new File([pngBuffer], 'a.png', { type: 'image/png' }));
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res2.status, 201);
    const body1 = await res1.json();
    const body2 = await res2.json();
    assert.notStrictEqual(body1.filename, body2.filename);
    uploadedPaths.push(path.join(process.cwd(), 'public', body1.url));
    uploadedPaths.push(path.join(process.cwd(), 'public', body2.url));
    console.log('✅ T11.3 Unique filename generation');

    // T11.4 — upload → URL saved on checklist
    const saved = await saveUploadedFile(new File([pngBuffer], 'proof.png', { type: 'image/png' }));
    uploadedPaths.push(saved.absolutePath);

    const completion = await checklistRepository.upsertCompletion({
      shiftType: 'closing',
      date: TODAY,
      locationKey: 'gotico',
      taskKey: 'c1',
      completed: true,
      photoUrl: saved.url,
      userId: USER_ID,
    });
    assert.strictEqual(completion.photoUrl, saved.url);

    const dbRow = await prisma.dailyChecklist.findFirst({
      where: {
        taskKey: 'c1',
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
        shiftType: 'closing',
      },
    });
    assert.strictEqual(dbRow?.photoUrl, saved.url);
    console.log('✅ T11.4 Upload → URL saved on checklist');

    console.log('✅ Module 11 integration tests passed.');
  } finally {
    await cleanup(uploadedPaths);
    await disconnectDb();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
