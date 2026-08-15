import { CapacitorBridge } from './capacitor-bridge.ts';

/** True in Capacitor native app or when NEXT_PUBLIC_POS_SHELL=true (local dev). */
export function isPosShellMode(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_POS_SHELL === 'true';
  }
  return (
    CapacitorBridge.isNative() || process.env.NEXT_PUBLIC_POS_SHELL === 'true'
  );
}

export function isPosShellAllowedPath(pathname: string): boolean {
  return pathname === '/orders' || pathname.startsWith('/orders/');
}

export function posShellDefaultPath(): string {
  return '/orders?tab=delivery';
}
