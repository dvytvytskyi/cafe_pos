import { prisma } from '../lib/db.ts';
import {
  validatePrinterInput,
  type PrinterType,
  PrinterValidationError,
} from '../lib/printer-validation.ts';

export type PrinterRecord = {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  type: PrinterType;
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  type: string;
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
}): PrinterRecord {
  return {
    id: row.id,
    name: row.name,
    ipAddress: row.ipAddress,
    port: row.port,
    type: row.type as PrinterType,
    locationId: row.locationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrinterRepository {
  async findAll(locationId = 'default'): Promise<PrinterRecord[]> {
    const rows = await prisma.printer.findMany({
      where: { locationId },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapRow);
  }

  async findById(id: string): Promise<PrinterRecord | null> {
    const row = await prisma.printer.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async create(input: Parameters<typeof validatePrinterInput>[0]): Promise<PrinterRecord> {
    const data = validatePrinterInput(input);
    const row = await prisma.printer.create({ data });
    return mapRow(row);
  }

  async update(id: string, input: Partial<Parameters<typeof validatePrinterInput>[0]>): Promise<PrinterRecord> {
    const existing = await prisma.printer.findUnique({ where: { id } });
    if (!existing) {
      throw new PrinterValidationError('Printer not found');
    }
    const data = validatePrinterInput({
      name: input.name ?? existing.name,
      ipAddress: input.ipAddress ?? existing.ipAddress,
      port: input.port ?? existing.port,
      type: input.type ?? existing.type,
      locationId: input.locationId ?? existing.locationId,
    });
    const row = await prisma.printer.update({ where: { id }, data });
    return mapRow(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.printer.delete({ where: { id } });
  }
}

export const printerRepository = new PrinterRepository();
