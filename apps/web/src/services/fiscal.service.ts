import { prisma } from '../lib/db';
import { createHash } from 'crypto';
import { auditRepository } from '../repositories/audit.repository';
import { queue } from '../lib/queue';

export interface HuellaParams {
  nifEmisor: string;
  numSerieFactura: string;
  fechaExpedicionFactura: string;
  tipoFactura: string;
  baseImponible: string;
  cuotaImpositiva: string;
  totalFactura: string;
  huellaPrevio: string;
}

export interface RefundItemPayload {
  itemIndex: number;
  quantity: number;
}

export interface RefundPayload {
  items: RefundItemPayload[];
  reason: string;
  method?: 'cash' | 'card';
}

export interface FiscalXmlRecord {
  invoiceNumber: string;
  recordType: string;
  nifEmisor: string;
  fechaExpedicion: string;
  tipoFactura: string;
  taxBase: number;
  taxAmount: number;
  total: number;
  hash: string;
  prevHash: string;
  originalInvoiceNumber?: string;
  refundReason?: string;
}

export function calculateHuellaHash(params: HuellaParams): string {
  const dataString = `nif=${params.nifEmisor}&invoiceNumber=${params.numSerieFactura}&date=${params.fechaExpedicionFactura}&type=${params.tipoFactura}&base=${params.baseImponible}&tax=${params.cuotaImpositiva}&total=${params.totalFactura}&prevHash=${params.huellaPrevio}`;
  return createHash('sha256').update(dataString).digest('hex').toUpperCase();
}

export function generateFiscalXml(record: FiscalXmlRecord): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<FacturaVerifactu>
  <Emisor NIF="${record.nifEmisor}"/>
  <NumSerieFactura>${record.invoiceNumber}</NumSerieFactura>
  <FechaExpedicion>${record.fechaExpedicion}</FechaExpedicion>
  <TipoFactura>${record.tipoFactura}</TipoFactura>
  <RecordType>${record.recordType}</RecordType>
  <BaseImponible>${record.taxBase.toFixed(2)}</BaseImponible>
  <CuotaImpositiva>${record.taxAmount.toFixed(2)}</CuotaImpositiva>
  <ImporteTotal>${record.total.toFixed(2)}</ImporteTotal>
  <Huella Anterior="${record.prevHash}" Actual="${record.hash}"/>
  ${record.originalInvoiceNumber ? `<FacturaOriginal>${record.originalInvoiceNumber}</FacturaOriginal>` : ''}
  ${record.refundReason ? `<MotivoRectificacion>${record.refundReason}</MotivoRectificacion>` : ''}
</FacturaVerifactu>`;
}

export class FiscalService {
  private static NIF_EMISOR = 'B12345678';

  private formatDate(date = new Date()) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private async getNextInvoiceNumber(tx: any, locationId: string, prefix: string) {
    const locCode = locationId.slice(0, 3).toUpperCase();
    const pattern = `${prefix}-${locCode}-%`;
    const lastRecords: any[] = await tx.$queryRaw`
      SELECT fr."invoiceNumber"
      FROM "FiscalRecord" fr
      INNER JOIN "Order" o ON fr."orderId" = o.id
      WHERE o."locationId" = ${locationId}
        AND fr."isGuavaArchive" = false
        AND fr."invoiceNumber" LIKE ${pattern}
      ORDER BY fr."invoiceNumber" DESC
      LIMIT 1;
    `;
    const lastRecord = lastRecords[0];
    let nextSeq = 1;
    if (lastRecord?.invoiceNumber) {
      const parts = lastRecord.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    const formattedSeq = nextSeq.toString().padStart(6, '0');
    return `${prefix}-${locCode}-${formattedSeq}`;
  }

  private async getPrevHash(tx: any, locationId: string) {
    const lastRecords: any[] = await tx.$queryRaw`
      SELECT fr.hash
      FROM "FiscalRecord" fr
      INNER JOIN "Order" o ON fr."orderId" = o.id
      WHERE o."locationId" = ${locationId}
        AND fr."isGuavaArchive" = false
      ORDER BY fr."invoiceNumber" DESC
      LIMIT 1;
    `;
    return lastRecords[0]?.hash ?? '0000000000000000000000000000000000000000000000000000000000000000';
  }

  private buildRecord(
    invoiceNumber: string,
    tipoFactura: string,
    total: number,
    prevHash: string,
    invoiceType: string,
    client?: { name?: string; nif?: string; address?: string }
  ) {
    const taxRate = 0.1;
    const taxBase = total / (1 + taxRate);
    const taxAmount = total - taxBase;
    const fechaExpedicion = this.formatDate();
    const hash = calculateHuellaHash({
      nifEmisor: FiscalService.NIF_EMISOR,
      numSerieFactura: invoiceNumber,
      fechaExpedicionFactura: fechaExpedicion,
      tipoFactura,
      baseImponible: taxBase.toFixed(2),
      cuotaImpositiva: taxAmount.toFixed(2),
      totalFactura: total.toFixed(2),
      huellaPrevio: prevHash,
    });
    const qrCodeUrl = `https://www2.agenciatributaria.gob.es/wlpl/TARI-PFAC/VerificaCheque?nif=${FiscalService.NIF_EMISOR}&numserie=${invoiceNumber}&fecha=${fechaExpedicion}&total=${total.toFixed(2)}&hash=${hash.slice(0, 8)}`;
    return {
      invoiceNumber,
      invoiceType,
      taxBase: parseFloat(taxBase.toFixed(2)),
      taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      prevHash,
      hash,
      qrCodeUrl,
      clientName: client?.name,
      clientNif: client?.nif,
      clientAddress: client?.address,
    };
  }

  async generateFiscalRecord(
    orderId: string,
    client?: { name?: string; nif?: string; address?: string }
  ) {
    let created = false;
    const record = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '5s'`);
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { location: true } });
      if (!order) throw new Error(`Order with ID ${orderId} not found.`);
      if (!order.paid) throw new Error(`Cannot generate fiscal record for unpaid order ${orderId}.`);

      const existing = await tx.fiscalRecord.findFirst({
        where: { orderId, recordType: 'invoice', isGuavaArchive: false },
      });
      if (existing) return existing;

      await tx.$queryRaw`SELECT "id" FROM "Location" WHERE "id" = ${order.locationId} FOR UPDATE;`;
      const prevHash = await this.getPrevHash(tx, order.locationId);
      const invoiceNumber = await this.getNextInvoiceNumber(tx, order.locationId, 'INV');
      const built = this.buildRecord(invoiceNumber, 'F2', order.total, prevHash, client?.nif ? 'completa' : 'simplificada', client);

      created = true;
      return tx.fiscalRecord.create({
        data: {
          orderId: order.id,
          recordType: 'invoice',
          ...built,
        },
      });
    });

    if (created) {
      await auditRepository.logEvent('invoice_generated', {
        orderId,
        invoiceNumber: record.invoiceNumber,
        invoiceType: record.invoiceType,
        clientNif: client?.nif || null,
      });
    }

    return record;
  }

  async processRefund(orderId: string, payload: RefundPayload) {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
      if (!order) throw new Error('Order not found');
      if (!order.paid) throw new Error('Cannot refund an unpaid order');

      let refundTotal = 0;
      const itemUpdates: { id: string; refundedQuantity: number }[] = [];

      for (const refundItem of payload.items) {
        const item = order.items[refundItem.itemIndex];
        if (!item) throw new Error(`Invalid item index ${refundItem.itemIndex}`);
        const available = item.quantity - (item.refundedQuantity || 0);
        if (refundItem.quantity <= 0 || refundItem.quantity > available) {
          throw new Error(`Invalid refund quantity for ${item.name}`);
        }
        refundTotal += item.price * refundItem.quantity;
        itemUpdates.push({
          id: item.id,
          refundedQuantity: (item.refundedQuantity || 0) + refundItem.quantity,
        });
      }

      refundTotal = parseFloat(refundTotal.toFixed(2));
      const maxRefundable = parseFloat((order.total - order.refundedAmount).toFixed(2));
      if (refundTotal <= 0 || refundTotal > maxRefundable + 0.01) {
        throw new Error('Refund amount exceeds refundable balance');
      }

      let original = await tx.fiscalRecord.findFirst({
        where: { orderId, recordType: 'invoice', isGuavaArchive: false },
      });
      if (!original) {
        await tx.$queryRaw`SELECT "id" FROM "Location" WHERE "id" = ${order.locationId} FOR UPDATE;`;
        const prevHash = await this.getPrevHash(tx, order.locationId);
        const invoiceNumber = await this.getNextInvoiceNumber(tx, order.locationId, 'INV');
        const built = this.buildRecord(invoiceNumber, 'F2', order.total, prevHash, 'simplificada');
        original = await tx.fiscalRecord.create({
          data: { orderId: order.id, recordType: 'invoice', ...built },
        });
      }

      await tx.$queryRaw`SELECT "id" FROM "Location" WHERE "id" = ${order.locationId} FOR UPDATE;`;
      const prevHash = await this.getPrevHash(tx, order.locationId);
      const rectNumber = await this.getNextInvoiceNumber(tx, order.locationId, 'REC');
      const builtRect = this.buildRecord(rectNumber, 'R1', -refundTotal, prevHash, 'rectificativa');

      const rectificativa = await tx.fiscalRecord.create({
        data: {
          orderId: order.id,
          recordType: 'rectificativa',
          originalFiscalRecordId: original.id,
          refundReason: payload.reason,
          ...builtRect,
        },
      });

      for (const upd of itemUpdates) {
        await tx.orderItem.update({
          where: { id: upd.id },
          data: { refundedQuantity: upd.refundedQuantity },
        });
      }

      const newRefundedAmount = parseFloat((order.refundedAmount + refundTotal).toFixed(2));
      const isFullyRefunded = newRefundedAmount >= order.total - 0.01;

      await tx.order.update({
        where: { id: orderId },
        data: {
          refundedAmount: newRefundedAmount,
          paid: isFullyRefunded ? false : order.paid,
          status: isFullyRefunded ? 'cancelled' : order.status,
        },
      });

      if (payload.method) {
        await tx.transaction.create({
          data: {
            orderId,
            method: payload.method,
            amount: -refundTotal,
            code: `REFUND:${rectNumber}`,
          },
        });
      }

      return {
        rectificativa,
        refundTotal,
        isFullyRefunded,
        originalInvoiceNumber: original.invoiceNumber,
        order: await tx.order.findUnique({
          where: { id: orderId },
          include: { items: { orderBy: { createdAt: 'asc' } }, transactions: true },
        }),
      };
    });

    await auditRepository.logEvent('order_refunded', {
      orderId,
      refundTotal: result.refundTotal,
      reason: payload.reason,
      rectificativaId: result.rectificativa.id,
      invoiceNumber: result.rectificativa.invoiceNumber,
    });

    queue.publish('verifactu:sync', { orderId, fiscalRecordId: result.rectificativa.id }).catch(console.error);

    return result;
  }

  async syncVerifactu(orderId: string) {
    const record = await this.generateFiscalRecord(orderId);
    await queue.publish('verifactu:sync', { orderId, fiscalRecordId: record.id });
    const xml = generateFiscalXml({
      invoiceNumber: record.invoiceNumber,
      recordType: record.recordType,
      nifEmisor: FiscalService.NIF_EMISOR,
      fechaExpedicion: this.formatDate(record.createdAt),
      tipoFactura: record.invoiceType === 'rectificativa' ? 'R1' : 'F2',
      taxBase: record.taxBase,
      taxAmount: record.taxAmount,
      total: record.total,
      hash: record.hash,
      prevHash: record.prevHash,
      refundReason: record.refundReason || undefined,
    });
    return { record, xml };
  }
}

export const fiscalService = new FiscalService();
