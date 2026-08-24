import { DEFAULT_CORGI_LOCATION_ID } from './corgi-locations.ts';

/** Default location ID used across POS layout and orders (Gótico). */
export const DEFAULT_LOCATION_ID = DEFAULT_CORGI_LOCATION_ID;

export const TABLE_STATUSES = ['available', 'occupied', 'billed', 'dirty'] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];
