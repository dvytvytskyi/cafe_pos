export type ChecklistShiftType = 'opening' | 'closing';

export type LocationKey = 'gotico' | 'sagrada' | 'eixample' | 'gracia' | 'arc' | 'main';

export const CHECKLIST_LOCATION_KEYS: LocationKey[] = [
  'gotico',
  'sagrada',
  'eixample',
  'gracia',
  'arc',
  'main',
];

export const CHECKLIST_LOCATION_NAMES: Record<LocationKey, string> = {
  gotico: 'Gótico',
  sagrada: 'Sagrada',
  eixample: 'Eixample',
  gracia: 'Gracia',
  arc: 'Arc de Triumph',
  main: 'Main WH',
};

/** Cash-shift lookup uses default location for all checklist locales (phase 1). */
export function locationKeyToLocationId(_key: LocationKey): string {
  return 'default';
}

export function isValidShiftType(value: string): value is ChecklistShiftType {
  return value === 'opening' || value === 'closing';
}

export function isValidLocationKey(value: string): value is LocationKey {
  return CHECKLIST_LOCATION_KEYS.includes(value as LocationKey);
}
