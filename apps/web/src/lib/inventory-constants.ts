/** Main warehouse location id — must match seed / Location table. */
export const MAIN_WAREHOUSE_LOCATION_ID = 'loc-main-wh';

export const INVENTORY_CATEGORIES = ['merch', 'kitchen', 'bar'] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];
