import { NextResponse } from 'next/server';
import { userRepository } from '@/repositories/user.repository';
import { AuthValidationError, normalizePinInput } from '@/lib/auth-validation';
import {
  buildSessionCookie,
  sessionPayloadFromUser,
  signSessionToken,
  toSessionUser,
} from '@/lib/auth-session';
import { MAX_PIN_FAILURES } from '@/lib/auth-constants';
import {
  checkPinRateLimit,
  clearPinFailures,
  getClientKey,
  recordPinFailure,
} from '@/lib/auth-rate-limit';

export async function POST(req: Request) {
  try {
    const clientKey = getClientKey(req);
    await checkPinRateLimit(clientKey);

    const body = await req.json();
    const pin = normalizePinInput(body.pin);

    const user = await userRepository.findByPin(pin);
    if (!user || user.status !== 'active') {
      const failures = await recordPinFailure(clientKey);
      if (failures >= MAX_PIN_FAILURES) {
        return NextResponse.json(
          { error: 'TOO_MANY_FAILED_ATTEMPTS', code: 'TOO_MANY_FAILED_ATTEMPTS', retryAfter: 900 },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: 'Invalid PIN code' }, { status: 401 });
    }

    await clearPinFailures(clientKey);

    const token = signSessionToken(sessionPayloadFromUser(user));
    const response = NextResponse.json(
      { success: true, user: toSessionUser(user) },
      { status: 200 }
    );
    response.headers.set('Set-Cookie', buildSessionCookie(token));
    return response;
  } catch (error: unknown) {
    if (error instanceof AuthValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'TOO_MANY_FAILED_ATTEMPTS') {
      const retryAfter = (error as Error & { retryAfter?: number }).retryAfter ?? 900;
      return NextResponse.json(
        { error: 'TOO_MANY_FAILED_ATTEMPTS', code: 'TOO_MANY_FAILED_ATTEMPTS', retryAfter },
        { status: 429 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in login-pin route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
