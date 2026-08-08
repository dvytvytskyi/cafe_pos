import assert from 'assert';
import {
  calculateHuellaHash,
  generateFiscalXml,
  type HuellaParams,
} from '../services/fiscal.service.ts';

export async function run() {
  console.log('Running test-unit-fiscal...');

  // T4.1 — SHA-256 hash chain (AEAT Huella algorithm)
  const genesisPrev = '0000000000000000000000000000000000000000000000000000000000000000';
  const params1: HuellaParams = {
    nifEmisor: 'B12345678',
    numSerieFactura: 'INV-DEF-000001',
    fechaExpedicionFactura: '08-08-2026',
    tipoFactura: 'F2',
    baseImponible: '10.00',
    cuotaImpositiva: '1.00',
    totalFactura: '11.00',
    huellaPrevio: genesisPrev,
  };

  const hash1 = calculateHuellaHash(params1);
  assert.strictEqual(hash1.length, 64, 'SHA-256 must yield 64 hex characters');
  assert.strictEqual(hash1, hash1.toUpperCase(), 'Huella hash must be uppercase hex');

  const params2: HuellaParams = {
    ...params1,
    numSerieFactura: 'INV-DEF-000002',
    huellaPrevio: hash1,
  };
  const hash2 = calculateHuellaHash(params2);
  assert.notStrictEqual(hash1, hash2, 'Chained records must produce different hashes');

  const tampered = calculateHuellaHash({ ...params1, baseImponible: '99.00' });
  const brokenChain = calculateHuellaHash({ ...params2, huellaPrevio: tampered });
  assert.notStrictEqual(hash2, brokenChain, 'Tampering must break the chain');

  // T4.2 — deterministic control sum / hash output
  assert.strictEqual(calculateHuellaHash(params1), calculateHuellaHash(params1));

  // T4.3 — fiscal XML structure
  const xml = generateFiscalXml({
    nifEmisor: 'B12345678',
    invoiceNumber: 'INV-DEF-000001',
    fechaExpedicion: '08-08-2026',
    tipoFactura: 'F2',
    recordType: 'simplificada',
    taxBase: 10,
    taxAmount: 1,
    total: 11,
    prevHash: genesisPrev,
    hash: hash1,
  });
  assert.ok(xml.includes('<FacturaVerifactu>'), 'XML must contain root element');
  assert.ok(xml.includes('<Huella Anterior='), 'XML must include hash chain node');

  const rectXml = generateFiscalXml({
    nifEmisor: 'B12345678',
    invoiceNumber: 'INV-DEF-000002',
    fechaExpedicion: '08-08-2026',
    tipoFactura: 'R1',
    recordType: 'rectificativa',
    taxBase: -5,
    taxAmount: -0.5,
    total: -5.5,
    prevHash: hash1,
    hash: hash2,
    originalInvoiceNumber: 'INV-DEF-000001',
    refundReason: 'Wrong item',
  });
  assert.ok(rectXml.includes('<FacturaOriginal>'), 'Rectificativa must reference original invoice');
  assert.ok(rectXml.includes('<MotivoRectificacion>'), 'Rectificativa must include refund reason');

  console.log('✅ test-unit-fiscal passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run()
    .then(async () => {
      const { queue } = await import('./queue/index.ts');
      await queue.closeAll().catch(() => {});
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
