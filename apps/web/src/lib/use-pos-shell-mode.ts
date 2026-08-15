'use client';

import { useSyncExternalStore } from 'react';
import { isPosShellMode } from './pos-shell';

function subscribe() {
  return () => {};
}

export function usePosShellMode(): boolean {
  return useSyncExternalStore(subscribe, isPosShellMode, () => false);
}
