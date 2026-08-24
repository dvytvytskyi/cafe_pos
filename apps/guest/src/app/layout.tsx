'use client';

import React, { Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { GuestProvider } from '@/lib/guest-context';
import { BottomNav } from '@/components/BottomNav';
import { DEFAULT_GUEST_LOCATION_ID, GUEST_LOCATION_STORAGE_KEY } from '@/lib/constants';
import { GUEST_STORE_LOCATIONS } from '@/lib/locations';
import './globals.css';

function resolveLocationId(searchParams: URLSearchParams): string {
  const fromUrl = searchParams.get('locationId');
  if (fromUrl && fromUrl !== 'default' && GUEST_STORE_LOCATIONS.some((l) => l.id === fromUrl)) {
    return fromUrl;
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(GUEST_LOCATION_STORAGE_KEY);
    if (saved && saved !== 'default' && GUEST_STORE_LOCATIONS.some((l) => l.id === saved)) {
      return saved;
    }
  }
  return DEFAULT_GUEST_LOCATION_ID;
}

function GuestProviderWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locationId = resolveLocationId(searchParams);
  const table = searchParams.get('table') || undefined;

  const showNav = pathname !== '/';

  return (
    <GuestProvider initialLocation={locationId} initialTable={table}>
      <main style={{ paddingBottom: showNav ? '80px' : '0', minHeight: '100vh' }}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </GuestProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div>Loading app...</div>}>
          <GuestProviderWrapper>{children}</GuestProviderWrapper>
        </Suspense>
      </body>
    </html>
  );
}
