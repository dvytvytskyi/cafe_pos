'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import PinLoginScreen from './PinLoginScreen';
import { setCurrentUserId } from '@/lib/current-user';
import { putStaffSession, getStaffSession } from '@/lib/pos-offline-db';

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [offlineResume, setOfflineResume] = useState(false);

  const cacheSession = useCallback(async (user: {
    id: string;
    name: string;
    role: { id: string; name: string; permissions: Record<string, string[]> };
    locations: { id: string }[];
  }) => {
    try {
      await putStaffSession({
        userId: user.id,
        name: user.name,
        roleId: user.role.id,
        roleName: user.role.name,
        locationIds: user.locations.map((l) => l.id),
        permissions: user.role.permissions,
        cachedAt: new Date().toISOString(),
      });
    } catch {
      // IDB may be unavailable
    }
  }, []);

  const checkSession = useCallback(async () => {
    setChecking(true);
    setOfflineResume(false);
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user?.id) {
          setCurrentUserId(data.user.id);
          await cacheSession(data.user);
        }
        setAuthenticated(true);
      } else {
        const cached = await getStaffSession();
        if (cached && typeof navigator !== 'undefined' && !navigator.onLine) {
          setCurrentUserId(cached.userId);
          setAuthenticated(true);
          setOfflineResume(true);
        } else {
          setAuthenticated(false);
        }
      }
    } catch {
      const cached = await getStaffSession();
      if (cached) {
        setCurrentUserId(cached.userId);
        setAuthenticated(true);
        setOfflineResume(true);
      } else {
        setAuthenticated(false);
      }
    } finally {
      setChecking(false);
    }
  }, [cacheSession]);

  useEffect(() => {
    checkSession().catch(console.error);
  }, [checkSession]);

  if (checking) {
    return (
      <div className="h-screen bg-ui-beige flex items-center justify-center" data-testid="auth-loading">
        <Loader2 className="animate-spin text-corgi" size={32} />
      </div>
    );
  }

  if (!authenticated) {
    return <PinLoginScreen onSuccess={() => checkSession()} />;
  }

  return (
    <>
      {offlineResume && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-[13px] font-medium text-amber-800">
          Offline mode — using cached session
        </div>
      )}
      {children}
    </>
  );
}
