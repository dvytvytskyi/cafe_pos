'use client';

import React, { Suspense } from 'react';
import PosShellHeader from './PosShellHeader';
import PosBottomNav from './PosBottomNav';
import PosShellBootstrap from './PosShellBootstrap';

export default function PosShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-screen bg-ui-beige flex flex-col overflow-hidden"
      data-testid="pos-shell-layout"
    >
      <PosShellBootstrap />
      <PosShellHeader />
      <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col px-4">{children}</main>
      <Suspense fallback={null}>
        <PosBottomNav />
      </Suspense>
    </div>
  );
}
