'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { GuestBootstrapResponse, GuestLocale, GuestMenuItem } from '@corgi/contracts';
import { getBootstrap, getProfile, type CartLine } from './api-client';

interface GuestContextValue {
  bootstrap: GuestBootstrapResponse | null;
  locale: GuestLocale;
  setLocale: (l: GuestLocale) => void;
  loading: boolean;
  isLoggedIn: boolean;
  profileName?: string;
  refreshAuth: () => Promise<void>;
  foodCart: CartLine[];
  merchCart: CartLine[];
  addFoodToCart: (line: Omit<CartLine, 'key'>) => void;
  addMerchToCart: (line: Omit<CartLine, 'key'>) => void;
  updateFoodQty: (key: string, delta: number) => void;
  updateMerchQty: (key: string, delta: number) => void;
  clearFoodCart: () => void;
  clearMerchCart: () => void;
  showWelcome: boolean;
  dismissWelcome: () => void;
  deferredInstall: BeforeInstallPromptEvent | null;
  setDeferredInstall: (e: BeforeInstallPromptEvent | null) => void;
  orderMode: 'store' | 'pickup' | 'delivery';
  setOrderMode: (mode: 'store' | 'pickup' | 'delivery') => void;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const GuestContext = createContext<GuestContextValue | null>(null);

const CART_KEY = 'corgi_guest_food_cart';
const MERCH_KEY = 'corgi_guest_merch_cart';
const WELCOME_KEY = 'corgi_guest_welcome_seen';

function loadCart(key: string): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function GuestProvider({
  children,
  initialLocation = 'default',
  initialTable,
}: {
  children: React.ReactNode;
  initialLocation?: string;
  initialTable?: string;
}) {
  const [bootstrap, setBootstrap] = useState<GuestBootstrapResponse | null>(null);
  const [locale, setLocaleState] = useState<GuestLocale>('en');
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileName, setProfileName] = useState<string>();
  const [foodCart, setFoodCart] = useState<CartLine[]>([]);
  const [merchCart, setMerchCart] = useState<CartLine[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [orderMode, setOrderMode] = useState<'store' | 'pickup' | 'delivery'>('store');

  const setLocale = useCallback((l: GuestLocale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('corgi_guest_locale', l);
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const mockUser = localStorage.getItem('corgi_mock_user');
        if (mockUser) {
          setIsLoggedIn(true);
          setProfileName(mockUser);
          return;
        }
      }
      const profile = await getProfile();
      setIsLoggedIn(true);
      setProfileName(profile.name);
    } catch {
      setIsLoggedIn(false);
      setProfileName(undefined);
    }
  }, []);

  useEffect(() => {
    const savedLocale = localStorage.getItem('corgi_guest_locale') as GuestLocale | null;
    if (savedLocale) setLocaleState(savedLocale);
    setFoodCart(loadCart(CART_KEY));
    setMerchCart(loadCart(MERCH_KEY));
    const welcomeSeen = localStorage.getItem(WELCOME_KEY);
    setShowWelcome(!welcomeSeen);

    (async () => {
      try {
        const data = await getBootstrap(initialLocation, initialTable, savedLocale || 'en');
        setBootstrap(data);
        if (!savedLocale) setLocaleState(data.locale);
      } finally {
        setLoading(false);
      }
    })();

    refreshAuth();

    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker.register('/sw.js').catch(() => {});
    // }

    const onInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, [initialLocation, initialTable, refreshAuth]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(foodCart));
  }, [foodCart]);

  useEffect(() => {
    localStorage.setItem(MERCH_KEY, JSON.stringify(merchCart));
  }, [merchCart]);

  const addFoodToCart = useCallback((line: Omit<CartLine, 'key'>) => {
    const key = `${line.menuItemId}-${JSON.stringify(line.modifiers)}-${line.comments || ''}`;
    setFoodCart((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) => (p.key === key ? { ...p, quantity: p.quantity + line.quantity } : p));
      }
      return [...prev, { ...line, key }];
    });
  }, []);

  const addMerchToCart = useCallback((line: Omit<CartLine, 'key'>) => {
    const key = line.merchSkuId || line.name;
    setMerchCart((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) => (p.key === key ? { ...p, quantity: p.quantity + line.quantity } : p));
      }
      return [...prev, { ...line, key }];
    });
  }, []);

  const updateFoodQty = useCallback((key: string, delta: number) => {
    setFoodCart((prev) =>
      prev
        .map((p) => (p.key === key ? { ...p, quantity: p.quantity + delta } : p))
        .filter((p) => p.quantity > 0)
    );
  }, []);

  const updateMerchQty = useCallback((key: string, delta: number) => {
    setMerchCart((prev) =>
      prev
        .map((p) => (p.key === key ? { ...p, quantity: p.quantity + delta } : p))
        .filter((p) => p.quantity > 0)
    );
  }, []);

  const value = useMemo(
    () => ({
      bootstrap,
      locale,
      setLocale,
      loading,
      isLoggedIn,
      profileName,
      refreshAuth,
      foodCart,
      merchCart,
      addFoodToCart,
      addMerchToCart,
      updateFoodQty,
      updateMerchQty,
      clearFoodCart: () => setFoodCart([]),
      clearMerchCart: () => setMerchCart([]),
      showWelcome,
      dismissWelcome: () => {
        localStorage.setItem(WELCOME_KEY, '1');
        setShowWelcome(false);
      },
      deferredInstall,
      setDeferredInstall,
      orderMode,
      setOrderMode,
    }),
    [
      bootstrap,
      locale,
      setLocale,
      loading,
      isLoggedIn,
      profileName,
      refreshAuth,
      foodCart,
      merchCart,
      addFoodToCart,
      addMerchToCart,
      updateFoodQty,
      updateMerchQty,
      showWelcome,
      deferredInstall,
      orderMode,
    ]
  );

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be used within GuestProvider');
  return ctx;
}

export type { GuestMenuItem };
