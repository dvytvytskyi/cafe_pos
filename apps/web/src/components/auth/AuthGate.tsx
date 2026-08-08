'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import PinLoginScreen from './PinLoginScreen';
import { setCurrentUserId } from '@/lib/current-user';

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const checkSession = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user?.id) setCurrentUserId(data.user.id);
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

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

  return <>{children}</>;
}
