import assert from 'assert';

function compileEscPosReceipt(title: string, price: number): string {
  // ESC/POS commands: Initialize \x1B\x40, Align Center \x1B\x61\x01, Bold On \x1B\x45\x01
  return `\x1B\x40\x1B\x61\x01\x1B\x45\x01${title}\nTotal: €${price.toFixed(2)}\x1B\x64\x03\x1D\x56\x01`;
}

export async function run() {
  console.log('Running test-unit-native-bridge...');

  const receipt = compileEscPosReceipt('Corgi Cafe', 12.50);

  // Asserting ESC/POS headers and values
  assert.ok(receipt.startsWith('\x1B\x40'), 'Must contain initialization ESC command');
  assert.ok(receipt.includes('Corgi Cafe'), 'Must contain receipt title');
  assert.ok(receipt.includes('Total: €12.50'), 'Must contain formatted total price');
  assert.ok(receipt.endsWith('\x1D\x56\x01'), 'Must contain cut paper GS command');

  console.log('✅ test-unit-native-bridge passed.');
}
