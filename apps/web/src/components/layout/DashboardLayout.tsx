'use client';

import React from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import AuthGate from '@/components/auth/AuthGate';
import PosShellLayout from '@/components/layout/PosShellLayout';
import PosShellGuard from '@/components/layout/PosShellGuard';
import { PosShellChromeProvider, usePosShellChrome } from '@/components/layout/pos-shell-context';
import { usePosShellMode } from '@/lib/use-pos-shell-mode';

function DashboardChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-ui-beige flex flex-col overflow-hidden" data-testid="dashboard-layout">
      <div className="w-full px-4 md:px-6">
        <Header />
      </div>

      <div className="flex-1 flex px-4 md:px-6 pb-4 md:pb-6 gap-4 md:gap-6 w-full min-w-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const posShell = usePosShellMode();
  const insidePosShell = usePosShellChrome();

  if (posShell) {
    if (insidePosShell) {
      return <>{children}</>;
    }

    return (
      <AuthGate>
        <PosShellChromeProvider>
          <PosShellGuard>
            <PosShellLayout>{children}</PosShellLayout>
          </PosShellGuard>
        </PosShellChromeProvider>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <DashboardChrome>{children}</DashboardChrome>
    </AuthGate>
  );
}
