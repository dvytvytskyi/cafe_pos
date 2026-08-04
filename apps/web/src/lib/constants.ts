/** Default location ID used across POS layout and orders. */
export const DEFAULT_LOCATION_ID = 'default';

export const TABLE_STATUSES = ['available', 'occupied', 'billed', 'dirty'] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];
