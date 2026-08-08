import { NextResponse } from 'next/server';
import { resolveProfileUserId } from '@/lib/current-user';
import { profileRepository } from '@/repositories/profile.repository';
import {
  EmailAlreadyInUseError,
  ProfileValidationError,
} from '@/lib/profile-validation';

export async function GET(req: Request) {
  try {
    const userId = resolveProfileUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const profile = await profileRepository.findById(userId);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = resolveProfileUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const body = await req.json();
    const profile = await profileRepository.updateProfile(userId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
    });

    return NextResponse.json(profile, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof EmailAlreadyInUseError) {
      return NextResponse.json({ error: 'EMAIL_ALREADY_IN_USE' }, { status: 409 });
    }
    if (error instanceof ProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
