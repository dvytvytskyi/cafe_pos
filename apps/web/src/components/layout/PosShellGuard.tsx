'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isPosShellAllowedPath, posShellDefaultPath } from '@/lib/pos-shell';

export default function PosShellGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isPosShellAllowedPath(pathname)) {
      router.replace(posShellDefaultPath());
    }
  }, [pathname, router]);

  if (!isPosShellAllowedPath(pathname)) {
    return (
      <div className="h-screen bg-ui-beige flex items-center justify-center" data-testid="pos-shell-redirect">
        <div className="text-sm font-semibold text-gray-500">Loading POS…</div>
      </div>
    );
  }

  return <>{children}</>;
}
