export type LocationSummary = {
  id: string;
  name: string;
  address: string | null;
};

export async function getLocationsAsync(): Promise<LocationSummary[]> {
  const res = await fetch('/api/locations');
  if (!res.ok) {
    throw new Error('Failed to fetch locations');
  }
  return res.json();
}

let locationsCache: { data: LocationSummary[]; ts: number } | null = null;
const LOCATIONS_CLIENT_CACHE_MS = 60_000;

export async function getLocationsCachedAsync(): Promise<LocationSummary[]> {
  if (locationsCache && Date.now() - locationsCache.ts < LOCATIONS_CLIENT_CACHE_MS) {
    return locationsCache.data;
  }
  const data = await getLocationsAsync();
  locationsCache = { data, ts: Date.now() };
  return data;
}

export function prefetchLocations(): void {
  void getLocationsCachedAsync().catch(() => {});
}
