import assert from 'node:assert/strict';
import { formatApiError, httpStatusFromError } from './api-errors.ts';

function testHttpStatus() {
  const forbidden = new Error('Forbidden: location not in scope');
  (forbidden as Error & { status: number }).status = 403;
  assert.equal(httpStatusFromError(forbidden), 403);
  assert.equal(httpStatusFromError(new Error('boom')), 500);
}

function testFormatApiError() {
  const err = new Error('Forbidden: location not in scope');
  (err as Error & { status: number }).status = 403;
  const { status, body } = formatApiError(err);
  assert.equal(status, 403);
  assert.equal(body.error, 'Forbidden');
}

testHttpStatus();
testFormatApiError();
console.log('test-unit-api-errors: ok');
