import { prisma } from '../lib/db';
import { createHash } from 'crypto';

export interface HuellaParams {
  nifEmisor: string;
  numSerieFactura: string;
  fechaExpedicionFactura: string; // format: DD-MM-YYYY
  tipoFactura: string; // 'F2' for simplified (standard receipts)
  baseImponible: string; // two decimal places (e.g. "10.00")
  cuotaImpositiva: string; // two decimal places (e.g. "1.00")
  totalFactura: string; // two decimal places (e.g. "11.00")
  huellaPrevio: string;
}

/**
 * Helper to calculate AEAT Huella Hash (SHA-256)
 */
export function calculateHuellaHash(params: HuellaParams): string {
  const dataString = `nif=${params.nifEmisor}&invoiceNumber=${params.numSerieFactura}&date=${params.fechaExpedicionFactura}&type=${params.tipoFactura}&base=${params.baseImponible}&tax=${params.cuotaImpositiva}&total=${params.totalFactura}&prevHash=${params.huellaPrevio}`;
  return createHash('sha256').update(dataString).digest('hex').toUpperCase();
}

export class FiscalService {
  private static NIF_EMISOR = 'B12345678'; // Corgi Cafe Test NIF

  /**
   * Generates a sequential invoice number and creates a cryptochained FiscalRecord.
   * This is executed inside a transaction with a Row-Lock on the Location table
   * to guarantee strict serial sequence and prevent race conditions.
   */
  async generateFiscalRecord(orderId: string): Promise<any> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch order details first
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { location: true },
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found.`);
      }

      if (!order.paid) {
        throw new Error(`Cannot generate fiscal record for unpaid order ${orderId}.`);
      }

      // Check if fiscal record already exists
      const existingRecord = await tx.fiscalRecord.findUnique({
        where: { orderId },
      });
      if (existingRecord) {
        return existingRecord;
      }

      // 2. ACQUIRE LOCK: Lock the location row for UPDATE.
      // This blocks all other parallel transactions for this location, forcing sequential execution.
      await tx.$queryRaw`
        SELECT "id" FROM "Location" WHERE "id" = ${order.locationId} FOR UPDATE;
      `;

      // 3. Fetch the last fiscal record for this location to get the previous hash and sequence number
      const lastRecords: any[] = await tx.$queryRaw`
        SELECT fr.hash, fr."invoiceNumber"
        FROM "FiscalRecord" fr
        INNER JOIN "Order" o ON fr."orderId" = o.id
        WHERE o."locationId" = ${order.locationId}
        ORDER BY fr."invoiceNumber" DESC
        LIMIT 1;
      `;

      const lastRecord = lastRecords[0];
      const prevHash = lastRecord
        ? lastRecord.hash
        : '0000000000000000000000000000000000000000000000000000000000000000';

      // Determine next invoice sequence number
      let nextSeq = 1;
      if (lastRecord && lastRecord.invoiceNumber) {
        const parts = lastRecord.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }

      const formattedSeq = nextSeq.toString().padStart(6, '0');
      const invoiceNumber = `INV-${order.locationId.slice(0, 3).toUpperCase()}-${formattedSeq}`;

      // Calculate fiscal details (simplified invoice F2)
      const taxRate = 0.10; // 10% VAT standard for cafes in Spain
      const total = order.total;
      const taxBase = total / (1 + taxRate);
      const taxAmount = total - taxBase;

      const dateObj = new Date();
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      const fechaExpedicion = `${day}-${month}-${year}`;

      // 4. Calculate Huella Hash
      const huellaParams: HuellaParams = {
        nifEmisor: FiscalService.NIF_EMISOR,
        numSerieFactura: invoiceNumber,
        fechaExpedicionFactura: fechaExpedicion,
        tipoFactura: 'F2',
        baseImponible: taxBase.toFixed(2),
        cuotaImpositiva: taxAmount.toFixed(2),
        totalFactura: total.toFixed(2),
        huellaPrevio: prevHash,
      };

      const hash = calculateHuellaHash(huellaParams);

      // Generate mock QR Code URL for AEAT verification
      const qrCodeUrl = `https://www2.agenciatributaria.gob.es/wlpl/TARI-PFAC/VerificaCheque?nif=${FiscalService.NIF_EMISOR}&numserie=${invoiceNumber}&fecha=${fechaExpedicion}&total=${total.toFixed(2)}&hash=${hash.slice(0, 8)}`;

      // 5. Save the immutable fiscal record to DB
      const newFiscalRecord = await tx.fiscalRecord.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          invoiceType: 'simplificada',
          taxBase: parseFloat(taxBase.toFixed(2)),
          taxRate,
          taxAmount: parseFloat(taxAmount.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          prevHash,
          hash,
          qrCodeUrl,
        },
      });

      return newFiscalRecord;
    });
  }
}

export const fiscalService = new FiscalService();
