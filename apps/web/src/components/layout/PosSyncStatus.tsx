'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { CapacitorBridge } from '@/lib/capacitor-bridge';
import { getOutboxEntries } from '@/lib/pos-offline-db';
import { flushOutbox } from '@/lib/pos-offline-sync';

export default function PosSyncStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    try {
      const entries = await getOutboxEntries();
      setPending(entries.length);
    } catch {
      setPending(0);
    }
  }, []);

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    CapacitorBridge.startNetworkListener(setOnline).then((h) => {
      removeListener = h.remove;
    });
    refreshPending().catch(console.error);
    const interval = setInterval(() => refreshPending().catch(console.error), 8000);
    return () => {
      removeListener?.();
      clearInterval(interval);
    };
  }, [refreshPending]);

  const handleSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await flushOutbox();
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  };

  const Icon = online ? Cloud : CloudOff;

  return (
    <button
      type="button"
      onClick={() => handleSync().catch(console.error)}
      disabled={!online || syncing}
      title={
        !online
          ? 'Offline'
          : pending > 0
            ? `${pending} change(s) waiting to sync — tap to sync`
            : 'All changes synced'
      }
      className={`bg-white rounded-full h-11 px-3 shadow-sm border border-gray-100 flex items-center gap-2 text-xs font-bold transition-opacity ${
        !online ? 'text-amber-700' : pending > 0 ? 'text-gray-800' : 'text-gray-500'
      } ${!online || syncing ? 'opacity-90 cursor-default' : 'hover:shadow-md cursor-pointer'}`}
      data-testid="pos-sync-status"
    >
      {syncing ? (
        <RefreshCw size={16} className="animate-spin shrink-0" />
      ) : (
        <Icon size={16} className="shrink-0" />
      )}
      <span className="hidden sm:inline">
        {!online ? 'Offline' : pending > 0 ? `Sync (${pending})` : 'Synced'}
      </span>
      {pending > 0 && online && (
        <span className="sm:hidden flex h-5 min-w-5 items-center justify-center rounded-full bg-corgi px-1 text-[10px] font-bold text-gray-900">
          {pending}
        </span>
      )}
    </button>
  );
}
