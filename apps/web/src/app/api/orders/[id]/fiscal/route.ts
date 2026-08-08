import { NextResponse } from 'next/server';
import { fiscalService, generateFiscalXml } from '@/services/fiscal.service';
import { queue } from '@/lib/queue';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const record = await fiscalService.generateFiscalRecord(id, {
      name: body.clientName,
      nif: body.clientNif,
      address: body.clientAddress,
    });
    queue.publish('verifactu:sync', { orderId: id, fiscalRecordId: record.id }).catch(console.error);
    const xml = generateFiscalXml({
      invoiceNumber: record.invoiceNumber,
      recordType: record.recordType,
      nifEmisor: 'B12345678',
      fechaExpedicion: new Date(record.createdAt).toLocaleDateString('es-ES').replace(/\//g, '-'),
      tipoFactura: record.invoiceType === 'rectificativa' ? 'R1' : 'F2',
      taxBase: record.taxBase,
      taxAmount: record.taxAmount,
      total: record.total,
      hash: record.hash,
      prevHash: record.prevHash,
      refundReason: record.refundReason || undefined,
    });
    return NextResponse.json({ record, xml }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Fiscal generation failed';
    console.error(`Error generating fiscal record for order [${id}]:`, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
