import { NextResponse } from 'next/server';
import { PrinterValidationError } from '@/lib/printer-validation';
import { sendTestPrint } from '@/lib/printer-tcp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip = body.ip ?? body.ipAddress;
    const port = body.port;

    const result = await sendTestPrint(ip, port);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }
    return NextResponse.json({ success: true, message: result.message }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof PrinterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: 'Invalid request', details: message }, { status: 400 });
  }
}
