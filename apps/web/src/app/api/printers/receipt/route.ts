import { NextResponse } from 'next/server';
import net from 'net';
import { prisma } from '@/lib/db';

function escposLine(text: string) {
  return Buffer.from(`${text}\n`, 'utf8');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ip, orderId, type = 'receipt' } = body;

    if (!ip && orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const printerType = type === 'kitchen' ? 'kitchen' : type === 'bar' ? 'bar' : 'receipt';
      const printer = await prisma.printer.findFirst({
        where: { locationId: order.locationId, type: printerType },
      });
      if (!printer) {
        return NextResponse.json({ error: `No ${printerType} printer configured` }, { status: 404 });
      }
      body.ip = printer.ipAddress;
    }

    const resolvedIp = body.ip;
    if (!resolvedIp) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    let content = 'CORGI CAFE\nServer Test Receipt\n\n';
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, transactions: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const lines = [
        'CORGI CAFE',
        type === 'kitchen'
          ? '*** KITCHEN ***'
          : type === 'bar'
            ? '*** BAR ***'
            : '*** RECEIPT ***',
        `Order: ${order.id}`,
        `Customer: ${order.customerName || 'Walk-in'}`,
        '---',
        ...order.items.map((i) => `${i.quantity}x ${i.name}  EUR${(i.price * i.quantity).toFixed(2)}`),
        '---',
        `TOTAL: EUR${order.total.toFixed(2)}`,
      ];
      if (order.transactions.length > 0) {
        lines.push('Payments:');
        order.transactions.forEach((t) => lines.push(`  ${t.method}: EUR${t.amount.toFixed(2)}`));
      }
      lines.push('\n\n');
      content = lines.join('\n');
    }

    return new Promise<Response>((resolve) => {
      const client = new net.Socket();
      let resolved = false;
      const finish = (res: Response) => {
        if (!resolved) {
          resolved = true;
          resolve(res);
        }
      };

      client.connect(9100, resolvedIp, () => {
        client.write(Buffer.from([0x1b, 0x40]));
        client.write(Buffer.from([0x1b, 0x61, 0x01]));
        client.write(escposLine(content));
        client.write(Buffer.from([0x1d, 0x56, 0x41, 0x00]));
        setTimeout(() => {
          client.destroy();
          finish(NextResponse.json({ success: true, message: 'Printed successfully' }));
        }, 500);
      });

      client.on('error', (err) => {
        client.destroy();
        finish(NextResponse.json({ error: 'Connection failed', details: err.message }, { status: 500 }));
      });

      client.setTimeout(3000, () => {
        client.destroy();
        finish(NextResponse.json({ error: 'Connection timeout' }, { status: 504 }));
      });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
