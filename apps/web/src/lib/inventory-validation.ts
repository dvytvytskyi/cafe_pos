export const SKU_REGEX = /^INV-[A-Z]{3}-\d{4}$/;

export class InventoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryValidationError';
  }
}

export function validateStockQuantity(value: unknown, field = 'quantity'): number {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new InventoryValidationError(`${field} must be a positive integer`);
  }
  return num;
}

export function validateSku(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InventoryValidationError('sku must be a string');
  }
  const trimmed = value.trim().toUpperCase();
  if (!SKU_REGEX.test(trimmed)) {
    throw new InventoryValidationError('sku must match format INV-XXX-0000 (e.g. INV-MER-0001)');
  }
  return trimmed;
}

export function validateCreateItemInput(body: {
  name?: unknown;
  sku?: unknown;
  price?: unknown;
  initialStock?: unknown;
  minStockLevel?: unknown;
}) {
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw new InventoryValidationError('name is required');
  }

  const sku = validateSku(body.sku);

  const price = typeof body.price === 'string' ? Number.parseFloat(body.price) : Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new InventoryValidationError('price must be a non-negative number');
  }

  let initialStock = 0;
  if (body.initialStock !== undefined && body.initialStock !== null && body.initialStock !== '') {
    initialStock = validateStockQuantity(body.initialStock, 'initialStock');
  }

  let minStockLevel = 10;
  if (body.minStockLevel !== undefined && body.minStockLevel !== null && body.minStockLevel !== '') {
    const parsed =
      typeof body.minStockLevel === 'string'
        ? Number.parseInt(body.minStockLevel, 10)
        : Number(body.minStockLevel);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new InventoryValidationError('minStockLevel must be a non-negative integer');
    }
    minStockLevel = parsed;
  }

  return {
    name: body.name.trim(),
    sku,
    price,
    initialStock,
    minStockLevel,
  };
}

export const STOCK_TRANSFER_STATUSES = ['pending', 'in_transit', 'completed'] as const;
export type StockTransferStatus = (typeof STOCK_TRANSFER_STATUSES)[number];

export function validateTransferInput(body: {
  itemId?: unknown;
  quantity?: unknown;
  sourceLocationId?: unknown;
  targetLocationId?: unknown;
  createdByName?: unknown;
}) {
  if (typeof body.itemId !== 'string' || body.itemId.trim().length === 0) {
    throw new InventoryValidationError('itemId is required');
  }

  const quantity = validateStockQuantity(body.quantity);

  const sourceLocationId =
    typeof body.sourceLocationId === 'string' && body.sourceLocationId.trim()
      ? body.sourceLocationId.trim()
      : 'main';

  if (typeof body.targetLocationId !== 'string' || body.targetLocationId.trim().length === 0) {
    throw new InventoryValidationError('targetLocationId is required');
  }

  const targetLocationId = body.targetLocationId.trim();
  if (sourceLocationId === targetLocationId) {
    throw new InventoryValidationError('source and target locations must differ');
  }

  const createdByName =
    typeof body.createdByName === 'string' && body.createdByName.trim()
      ? body.createdByName.trim()
      : undefined;

  return {
    itemId: body.itemId.trim(),
    quantity,
    sourceLocationId,
    targetLocationId,
    createdByName,
  };
}

export function validateTransferStatus(value: unknown): StockTransferStatus {
  if (typeof value !== 'string' || !(STOCK_TRANSFER_STATUSES as readonly string[]).includes(value)) {
    throw new InventoryValidationError(
      `status must be one of: ${STOCK_TRANSFER_STATUSES.join(', ')}`
    );
  }
  return value as StockTransferStatus;
}
