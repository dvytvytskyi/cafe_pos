export const PRINTER_TYPES = ['kitchen', 'bar', 'receipt'] as const;
export type PrinterType = (typeof PRINTER_TYPES)[number];

export const DEFAULT_PRINTER_PORT = 9100;
export const MIN_PORT = 1;
export const MAX_PORT = 65535;

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export class PrinterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrinterValidationError';
  }
}

export function isValidIpv4(value: string): boolean {
  return IPV4_RE.test(value.trim());
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
}

export function isValidPrinterType(value: string): value is PrinterType {
  return (PRINTER_TYPES as readonly string[]).includes(value);
}

export type PrinterInput = {
  name: string;
  ipAddress: string;
  port?: number;
  type: string;
  locationId?: string;
};

export function validatePrinterInput(input: PrinterInput): {
  name: string;
  ipAddress: string;
  port: number;
  type: PrinterType;
  locationId: string;
} {
  const name = input.name?.trim();
  if (!name || name.length > 120) {
    throw new PrinterValidationError('Printer name is required (max 120 characters)');
  }

  const ipAddress = input.ipAddress?.trim();
  if (!ipAddress || !isValidIpv4(ipAddress)) {
    throw new PrinterValidationError('Invalid IPv4 address');
  }

  const port = input.port ?? DEFAULT_PRINTER_PORT;
  if (!isValidPort(port)) {
    throw new PrinterValidationError(`Port must be between ${MIN_PORT} and ${MAX_PORT}`);
  }

  const type = input.type?.trim().toLowerCase();
  if (!type || !isValidPrinterType(type)) {
    throw new PrinterValidationError(`Type must be one of: ${PRINTER_TYPES.join(', ')}`);
  }

  const locationId = (input.locationId?.trim() || 'default').slice(0, 64);
  return { name, ipAddress, port, type, locationId };
}

export function validateTestPrintInput(input: { ip?: string; port?: number }) {
  const ipAddress = input.ip?.trim();
  if (!ipAddress || !isValidIpv4(ipAddress)) {
    throw new PrinterValidationError('Invalid IPv4 address');
  }
  const port = input.port ?? DEFAULT_PRINTER_PORT;
  if (!isValidPort(port)) {
    throw new PrinterValidationError(`Port must be between ${MIN_PORT} and ${MAX_PORT}`);
  }
  return { ipAddress, port };
}
