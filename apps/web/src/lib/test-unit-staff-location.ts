import assert from 'node:assert/strict';
import { pickPrimaryLocationId } from './staff-location.ts';

function testPickPrimary() {
  assert.equal(pickPrimaryLocationId([]), 'default');
  assert.equal(
    pickPrimaryLocationId([
      { id: 'loc-gotico', name: 'Gótico', address: null },
      { id: 'default', name: 'Eixample', address: null },
    ]),
    'default'
  );
  assert.equal(
    pickPrimaryLocationId([{ id: 'loc-gotico', name: 'Gótico', address: null }]),
    'loc-gotico'
  );
}

testPickPrimary();
console.log('test-unit-staff-location: ok');
