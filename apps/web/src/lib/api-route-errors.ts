import { NextResponse } from 'next/server';
import { formatApiError } from './api-errors';

export { httpStatusFromError, formatApiError } from './api-errors';

export function apiErrorResponse(
  error: unknown,
  options?: { logLabel?: string }
): NextResponse {
  const { status, body } = formatApiError(error);
  if (status >= 500 && options?.logLabel) {
    console.error(options.logLabel, error);
  }
  return NextResponse.json(body, { status });
}
