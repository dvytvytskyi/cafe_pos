/**
 * Module 26 — printer validation unit tests
 */
import assert from 'assert';
import {
  isValidIpv4,
  isValidPort,
  validatePrinterInput,
  validateTestPrintInput,
  PrinterValidationError,
} from './printer-validation.ts';

function run() {
  console.log('--- Module 26 Printers Unit Tests ---');
  let failed = 0;

  const check = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`✅ ${name}`);
    } catch (e) {
      failed++;
      console.error(`❌ ${name}`, e);
    }
  };

  check('T26.1 valid IPv4', () => {
    assert.strictEqual(isValidIpv4('192.168.1.150'), true);
    assert.strictEqual(isValidIpv4('10.0.0.1'), true);
    assert.strictEqual(isValidIpv4('999.1.1.1'), false);
    assert.strictEqual(isValidIpv4('192.168.1'), false);
  });

  check('T26.2 port range 1-65535', () => {
    assert.strictEqual(isValidPort(1), true);
    assert.strictEqual(isValidPort(65535), true);
    assert.strictEqual(isValidPort(9100), true);
    assert.strictEqual(isValidPort(0), false);
    assert.strictEqual(isValidPort(65536), false);
    assert.strictEqual(isValidPort(1.5), false);
  });

  check('T26.3 validate printer input', () => {
    const p = validatePrinterInput({
      name: 'Kitchen',
      ipAddress: '192.168.1.150',
      port: 9100,
      type: 'kitchen',
    });
    assert.strictEqual(p.type, 'kitchen');
    assert.strictEqual(p.port, 9100);
  });

  check('T26.4 invalid IP rejected', () => {
    assert.throws(
      () => validatePrinterInput({ name: 'X', ipAddress: 'bad-ip', type: 'bar' }),
      PrinterValidationError
    );
  });

  check('T26.5 invalid type rejected', () => {
    assert.throws(
      () => validatePrinterInput({ name: 'X', ipAddress: '192.168.0.1', type: 'fax' }),
      PrinterValidationError
    );
  });

  check('T26.6 test print input', () => {
    const t = validateTestPrintInput({ ip: '192.168.1.1', port: 9100 });
    assert.strictEqual(t.ipAddress, '192.168.1.1');
  });

  if (failed) process.exit(1);
  console.log('--- Module 26 Unit Tests Passed ---');
}

run();
