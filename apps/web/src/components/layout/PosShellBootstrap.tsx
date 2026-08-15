'use client';

import { useEffect } from 'react';
import { getPrimaryStaffLocationId } from '@/lib/staff-location';
import { bootstrapPosOffline, startPosOfflineSync } from '@/lib/pos-offline-sync';

/** Warm offline cache when the native POS shell mounts. */
export default function PosShellBootstrap() {
  useEffect(() => {
    getPrimaryStaffLocationId()
      .then((locationId) => {
        startPosOfflineSync(locationId).catch(console.error);
        return bootstrapPosOffline(locationId);
      })
      .catch(console.error);
  }, []);

  return null;
}
