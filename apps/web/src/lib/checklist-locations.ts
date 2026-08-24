import { DEFAULT_CORGI_LOCATION_ID } from './corgi-locations.ts';

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

const LOCATION_KEY_TO_ID: Record<LocationKey, string> = {
  gotico: 'loc-gotico',
  sagrada: 'loc-sagrada',
  eixample: 'loc-muntaner',
  gracia: 'loc-gracia',
  arc: 'loc-arc',
  main: DEFAULT_CORGI_LOCATION_ID,
};

export function locationKeyToLocationId(key: LocationKey): string {
  return LOCATION_KEY_TO_ID[key];
}

export function isValidShiftType(value: string): value is ChecklistShiftType {
  return value === 'opening' || value === 'closing';
}

export function isValidLocationKey(value: string): value is LocationKey {
  return CHECKLIST_LOCATION_KEYS.includes(value as LocationKey);
}
