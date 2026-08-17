'use client';

import React, { Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { GuestProvider } from '@/lib/guest-context';
import { BottomNav } from '@/components/BottomNav';
import './globals.css';

function GuestProviderWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locationId = searchParams.get('locationId') || 'default';
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
