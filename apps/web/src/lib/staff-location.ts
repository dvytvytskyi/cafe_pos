import { DEFAULT_LOCATION_ID } from './constants.ts';
import { getLocationsCachedAsync, type LocationSummary } from './locations.ts';

export function pickPrimaryLocationId(locations: LocationSummary[]): string {
  if (locations.length === 0) return DEFAULT_LOCATION_ID;
  const preferred = locations.find((l) => l.id === DEFAULT_LOCATION_ID);
  return preferred?.id ?? locations[0]!.id;
}

/** First location the current staff session may access (from /api/locations). */
export async function getPrimaryStaffLocationId(): Promise<string> {
  try {
    const locations = await getLocationsCachedAsync();
    return pickPrimaryLocationId(locations);
  } catch {
    return DEFAULT_LOCATION_ID;
  }
}
