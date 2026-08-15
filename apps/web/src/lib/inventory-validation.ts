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

export function validateNonNegativeInt(value: unknown, field: string): number {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new InventoryValidationError(`${field} must be a non-negative integer`);
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

export function validateOptionalSku(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new InventoryValidationError('sku must be a string');
  }
  return value.trim().toUpperCase();
}

export function parseLocationStocks(
  body: unknown
): Record<string, number> | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new InventoryValidationError('locationStocks must be an object');
  }
  const result: Record<string, number> = {};
  for (const [locationId, qty] of Object.entries(body as Record<string, unknown>)) {
    if (!locationId.trim()) continue;
    result[locationId.trim()] = validateNonNegativeInt(qty, `locationStocks.${locationId}`);
  }
  return result;
}

function validateCategory(value: unknown): 'merch' | 'kitchen' | 'bar' {
  if (value === undefined || value === null || value === '') return 'merch';
  if (value !== 'merch' && value !== 'kitchen' && value !== 'bar') {
    throw new InventoryValidationError('category must be merch, kitchen, or bar');
  }
  return value;
}

export function validateCreateItemInput(body: {
  name?: unknown;
  sku?: unknown;
  price?: unknown;
  initialStock?: unknown;
  minStockLevel?: unknown;
  category?: unknown;
  unit?: unknown;
  locationStocks?: unknown;
}) {
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw new InventoryValidationError('name is required');
  }

  const sku = validateSku(body.sku);
  const category = validateCategory(body.category);
  const unit =
    typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'pcs';

  const price = typeof body.price === 'string' ? Number.parseFloat(body.price) : Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new InventoryValidationError('price must be a non-negative number');
  }

  const locationStocks = parseLocationStocks(body.locationStocks);
  let initialStock = 0;
  if (locationStocks && Object.keys(locationStocks).length > 0) {
    initialStock = Object.values(locationStocks).reduce((sum, n) => sum + n, 0);
  } else if (body.initialStock !== undefined && body.initialStock !== null && body.initialStock !== '') {
    initialStock = validateNonNegativeInt(body.initialStock, 'initialStock');
  }

  let minStockLevel = 10;
  if (body.minStockLevel !== undefined && body.minStockLevel !== null && body.minStockLevel !== '') {
    minStockLevel = validateNonNegativeInt(body.minStockLevel, 'minStockLevel');
  }

  return {
    name: body.name.trim(),
    sku,
    price,
    initialStock,
    minStockLevel,
    category,
    unit,
    locationStocks,
  };
}

export function validateUpdateItemInput(body: {
  name?: unknown;
  sku?: unknown;
  price?: unknown;
  minStockLevel?: unknown;
  category?: unknown;
  unit?: unknown;
  locationStocks?: unknown;
}) {
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw new InventoryValidationError('name is required');
  }

  const sku = validateOptionalSku(body.sku);
  const category = validateCategory(body.category);
  const unit =
    typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'pcs';

  const price = typeof body.price === 'string' ? Number.parseFloat(body.price) : Number(body.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    throw new InventoryValidationError('price must be a non-negative number');
  }

  const locationStocks = parseLocationStocks(body.locationStocks);
  if (!locationStocks || Object.keys(locationStocks).length === 0) {
    throw new InventoryValidationError('locationStocks is required');
  }

  const minStockLevel = validateNonNegativeInt(body.minStockLevel ?? 10, 'minStockLevel');

  return {
    name: body.name.trim(),
    sku,
    price,
    minStockLevel,
    category,
    unit,
    locationStocks,
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
      : 'loc-main-wh';

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
