import { NextResponse } from 'next/server';
import { UploadValidationError } from '@/lib/upload-validation';
import { saveUploadedFile } from '@/lib/upload-storage';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const entry = formData.get('file');

    if (!(entry instanceof File)) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 });
    }

    const saved = await saveUploadedFile(entry);
    return NextResponse.json({ url: saved.url, filename: saved.filename }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
