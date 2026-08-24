import { prisma } from '@/lib/db';
import { fiscalService } from './fiscal.service';

export interface SendReceiptInput {
  email: string;
  includeFiscal?: boolean;
}

export class ReceiptEmailService {
  async sendOrderReceipt(orderId: string, input: SendReceiptInput) {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new Error('Valid email is required');

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        fiscalRecords: {
          where: { isGuavaArchive: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!order) throw new Error('Order not found');

    let fiscalRecord = order.fiscalRecords[0];
    if (input.includeFiscal !== false && !fiscalRecord) {
      fiscalRecord = await fiscalService.generateFiscalRecord(orderId);
    }

    const payload = {
      to: email,
      subject: `Corgi Cafe receipt — ${order.orderNumber}`,
      orderNumber: order.orderNumber,
      total: order.total,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      invoiceNumber: fiscalRecord?.invoiceNumber,
      qrCodeUrl: fiscalRecord?.qrCodeUrl,
    };

    const webhook = process.env.RECEIPT_EMAIL_WEBHOOK_URL;
    if (webhook) {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Email webhook failed: ${res.status}`);
      }
    } else {
      console.info('[ReceiptEmail] DEV mode — would send:', payload);
    }

    const sent = order.receiptsSentTo.includes(email)
      ? order.receiptsSentTo
      : [...order.receiptsSentTo, email];

    await prisma.order.update({
      where: { id: orderId },
      data: { invoiceEmail: email, receiptsSentTo: sent },
    });

    return { email, sent: true, invoiceNumber: fiscalRecord?.invoiceNumber ?? null };
  }
}

export const receiptEmailService = new ReceiptEmailService();
