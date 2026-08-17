import net from 'net';
import { prisma } from '@/lib/db';
import { isBarItem } from '@/lib/orders-board';

export type PrintStation = 'kitchen' | 'bar' | 'receipt' | 'all';

export interface PrintOrderResult {
  station: PrintStation;
  printerIp: string;
  itemCount: number;
  success: boolean;
  error?: string;
}

function escposLine(text: string) {
  return Buffer.from(`${text}\n`, 'utf8');
}

async function sendToPrinter(ip: string, content: string, port = 9100): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      client.destroy();
      if (err) reject(err);
      else resolve();
    };

    client.connect(port, ip, () => {
      client.write(Buffer.from([0x1b, 0x40]));
      client.write(Buffer.from([0x1b, 0x61, 0x01]));
      client.write(escposLine(content));
      client.write(Buffer.from([0x1d, 0x56, 0x41, 0x00]));
      setTimeout(() => finish(), 400);
    });

    client.on('error', (err) => finish(err));
    client.setTimeout(3000, () => finish(new Error('Printer connection timeout')));
  });
}

function formatTicketHeader(station: string, orderNumber: string, tableNumber?: string | null) {
  const lines = ['CORGI CAFE', `*** ${station.toUpperCase()} ***`, `Order: ${orderNumber}`];
  if (tableNumber) lines.push(`Table: ${tableNumber}`);
  lines.push('---');
  return lines;
}

export async function resolvePrinterIp(
  locationId: string,
  type: 'kitchen' | 'bar' | 'receipt',
): Promise<string | null> {
  const printer = await prisma.printer.findFirst({
    where: { locationId, type },
    orderBy: { createdAt: 'asc' },
  });
  return printer?.ipAddress ?? null;
}

export class OrderPrintService {
  async printOrder(
    orderId: string,
    station: PrintStation = 'all',
    options: { onlyUnsent?: boolean } = {},
  ): Promise<PrintOrderResult[]> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, table: { select: { number: true } } },
    });
    if (!order) throw new Error('Order not found');

    const onlyUnsent = options.onlyUnsent ?? true;
    const kitchenItems = order.items.filter((i) => {
      if (isBarItem(i.name)) return false;
      if (onlyUnsent && i.sentToKitchen) return false;
      return true;
    });
    const barItems = order.items.filter((i) => {
      if (!isBarItem(i.name)) return false;
      if (onlyUnsent && i.sentToBar) return false;
      return true;
    });

    const jobs: Array<{ station: PrintStation; type: 'kitchen' | 'bar' | 'receipt'; items: typeof order.items }> = [];
    if (station === 'all' || station === 'kitchen') {
      if (kitchenItems.length > 0) jobs.push({ station: 'kitchen', type: 'kitchen', items: kitchenItems });
    }
    if (station === 'all' || station === 'bar') {
      if (barItems.length > 0) jobs.push({ station: 'bar', type: 'bar', items: barItems });
    }
    if (station === 'receipt') {
      jobs.push({ station: 'receipt', type: 'receipt', items: order.items });
    }

    const results: PrintOrderResult[] = [];

    for (const job of jobs) {
      const ip = await resolvePrinterIp(order.locationId, job.type === 'receipt' ? 'receipt' : job.type);
      if (!ip) {
        results.push({
          station: job.station,
          printerIp: '',
          itemCount: job.items.length,
          success: false,
          error: `No ${job.type} printer configured for location`,
        });
        continue;
      }

      const lines = [
        ...formatTicketHeader(job.type, order.orderNumber, order.table?.number),
        ...job.items.map((i) => {
          const mods =
            i.modifierSnapshot && typeof i.modifierSnapshot === 'object'
              ? ` (${JSON.stringify(i.modifierSnapshot)})`
              : '';
          const note = i.comments ? ` [${i.comments}]` : '';
          return `${i.quantity}x ${i.name}${mods}${note}`;
        }),
        '---',
        '\n',
      ];

      try {
        await sendToPrinter(ip, lines.join('\n'));
        const now = new Date();
        for (const item of job.items) {
          if (job.type === 'kitchen') {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: { sentToKitchen: true, acceptedAt: item.acceptedAt ?? now },
            });
          } else if (job.type === 'bar') {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: { sentToBar: true, acceptedAt: item.acceptedAt ?? now },
            });
          }
        }
        results.push({ station: job.station, printerIp: ip, itemCount: job.items.length, success: true });
      } catch (err) {
        results.push({
          station: job.station,
          printerIp: ip,
          itemCount: job.items.length,
          success: false,
          error: err instanceof Error ? err.message : 'Print failed',
        });
      }
    }

    return results;
  }
}

export const orderPrintService = new OrderPrintService();
