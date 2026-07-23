import { NextResponse } from 'next/server';
import net from 'net';

export async function POST(req: Request) {
  try {
    const { ip } = await req.json();

    if (!ip) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    return new Promise((resolve) => {
      const client = new net.Socket();
      const printerPort = 9100;
      
      let resolved = false;

      const finish = (res: any) => {
        if (!resolved) {
          resolved = true;
          resolve(res);
        }
      };

      client.connect(printerPort, ip, () => {
        // ESC/POS commands
        const init = Buffer.from([0x1B, 0x40]);
        const alignCenter = Buffer.from([0x1B, 0x61, 0x01]);
        const doubleSize = Buffer.from([0x1D, 0x21, 0x11]);
        const normalSize = Buffer.from([0x1D, 0x21, 0x00]);
        const boldOn = Buffer.from([0x1B, 0x45, 0x01]);
        const boldOff = Buffer.from([0x1B, 0x45, 0x00]);
        const cutPaper = Buffer.from([0x1D, 0x56, 0x41, 0x00]);

        client.write(init);
        client.write(alignCenter);
        client.write(doubleSize);
        client.write(boldOn);
        client.write(Buffer.from("CORGI CAFE\n", 'utf8'));
        client.write(boldOff);
        client.write(normalSize);
        client.write(Buffer.from("Server Test Receipt\n\n", 'utf8'));
        client.write(Buffer.from("Connection successful!\n\n\n\n\n", 'utf8'));
        client.write(cutPaper);
        
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

  } catch (error: any) {
    return NextResponse.json({ error: 'Invalid request', details: error.message }, { status: 400 });
  }
}
