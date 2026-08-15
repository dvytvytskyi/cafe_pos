import assert from 'node:assert/strict';
import {
  isPosShellAllowedPath,
  posShellDefaultPath,
} from './pos-shell.ts';

function testAllowedPaths() {
  assert.equal(isPosShellAllowedPath('/orders'), true);
  assert.equal(isPosShellAllowedPath('/orders?tab=tables'), false);
  assert.equal(isPosShellAllowedPath('/orders/extra'), true);
  assert.equal(isPosShellAllowedPath('/'), false);
  assert.equal(isPosShellAllowedPath('/crm'), false);
  assert.equal(isPosShellAllowedPath('/settings'), false);
}

function testDefaultPath() {
  assert.equal(posShellDefaultPath(), '/orders?tab=delivery');
}

testAllowedPaths();
testDefaultPath();
console.log('test-unit-pos-shell: ok');
