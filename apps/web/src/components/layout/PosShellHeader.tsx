'use client';

import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { getProfileAsync, PROFILE_UPDATED_EVENT, type Profile } from '@/lib/profile';
import PosSyncStatus from './PosSyncStatus';

export default function PosShellHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfileAsync()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {});
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Profile>).detail;
      if (detail) setProfile(detail);
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* proceed */
    }
    window.location.assign('/orders?tab=delivery');
  };

  return (
    <header className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-2">
      <div className="bg-white rounded-full h-14 px-3 pr-4 shadow-sm border border-gray-100 flex items-center gap-3 min-w-0">
        <img
          src="/media/image.png"
          alt="Corgi Cafe"
          className="w-10 h-10 object-contain shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-black leading-tight truncate">Corgi POS</p>
          <p className="text-[11px] text-gray-500 leading-tight truncate" data-testid="pos-shell-staff-name">
            {profile?.name ?? 'Staff'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <PosSyncStatus />
        <button
          type="button"
          onClick={() => handleLogout().catch(console.error)}
          className="bg-white rounded-full h-11 w-11 shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-corgi hover:border-corgi/30 transition-colors cursor-pointer"
          title="Log out"
          data-testid="pos-shell-logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
