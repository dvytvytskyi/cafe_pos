import { NextResponse } from 'next/server';
import { resolveProfileUserId } from '@/lib/current-user';
import { profileRepository } from '@/repositories/profile.repository';
import {
  InvalidCurrentPasswordError,
  ProfileValidationError,
} from '@/lib/profile-validation';

export async function PUT(req: Request) {
  try {
    const userId = resolveProfileUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const body = await req.json();
    if (!body?.newPassword) {
      return NextResponse.json({ error: 'newPassword is required' }, { status: 400 });
    }

    await profileRepository.changePassword(userId, body.oldPassword ?? '', body.newPassword);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InvalidCurrentPasswordError) {
      return NextResponse.json({ error: 'INVALID_CURRENT_PASSWORD' }, { status: 400 });
    }
    if (error instanceof ProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/profile/password error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
