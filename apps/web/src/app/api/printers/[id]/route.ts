import { NextResponse } from 'next/server';
import { printerRepository } from '@/repositories/printer.repository';
import { PrinterValidationError } from '@/lib/printer-validation';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const printer = await printerRepository.findById(id);
    if (!printer) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 });
    }
    return NextResponse.json(printer, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const printer = await printerRepository.update(id, body);
    return NextResponse.json(printer, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof PrinterValidationError) {
      const status = error.message === 'Printer not found' ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await printerRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 });
    }
    await printerRepository.delete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
