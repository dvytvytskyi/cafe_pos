import { NextResponse } from 'next/server';
import { printerRepository } from '@/repositories/printer.repository';
import { PrinterValidationError } from '@/lib/printer-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') ?? 'default';
    const printers = await printerRepository.findAll(locationId);
    return NextResponse.json(printers, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error listing printers:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const printer = await printerRepository.create(body);
    return NextResponse.json(printer, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof PrinterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating printer:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
