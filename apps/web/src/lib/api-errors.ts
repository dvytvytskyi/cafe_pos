export function httpStatusFromError(error: unknown): number {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return 500;
}

export function formatApiError(error: unknown): {
  status: number;
  body: { error: string; details: string };
} {
  const status = httpStatusFromError(error);
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const label =
    status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal Server Error';
  return { status, body: { error: label, details: message } };
}
