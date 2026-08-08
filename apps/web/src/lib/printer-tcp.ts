import net from 'net';
import { validateTestPrintInput } from './printer-validation.ts';

export type TestPrintResult =
  | { ok: true; message: string }
  | { ok: false; status: 500 | 504; error: string; details?: string };

export async function sendTestPrint(ip: string, port: number, timeoutMs = 3000): Promise<TestPrintResult> {
  validateTestPrintInput({ ip, port });

  return new Promise((resolve) => {
    const client = new net.Socket();
    let resolved = false;

    const finish = (result: TestPrintResult) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    client.connect(port, ip, () => {
      client.write(Buffer.from([0x1b, 0x40]));
      client.write(Buffer.from([0x1b, 0x61, 0x01]));
      client.write(Buffer.from([0x1d, 0x21, 0x11]));
      client.write(Buffer.from([0x1b, 0x45, 0x01]));
      client.write(Buffer.from('CORGI CAFE\n', 'utf8'));
      client.write(Buffer.from([0x1b, 0x45, 0x00]));
      client.write(Buffer.from([0x1d, 0x21, 0x00]));
      client.write(Buffer.from('Server Test Receipt\n\nConnection successful!\n\n\n\n\n', 'utf8'));
      client.write(Buffer.from([0x1d, 0x56, 0x41, 0x00]));

      setTimeout(() => {
        client.destroy();
        finish({ ok: true, message: 'Printed successfully' });
      }, 500);
    });

    client.on('error', (err) => {
      client.destroy();
      finish({ ok: false, status: 500, error: 'Connection failed', details: err.message });
    });

    client.setTimeout(timeoutMs, () => {
      client.destroy();
      finish({ ok: false, status: 504, error: 'Connection timeout' });
    });
  });
}
