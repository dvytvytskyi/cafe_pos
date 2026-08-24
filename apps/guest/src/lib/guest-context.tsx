'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { GuestBootstrapResponse, GuestLocale, GuestMenuItem } from '@corgi/contracts';
import { getBootstrap, getProfile, type CartLine } from './api-client';
import { DEFAULT_GUEST_LOCATION_ID, GUEST_LOCATION_STORAGE_KEY } from './constants';
import { GUEST_STORE_LOCATIONS } from './locations';

function normalizeGuestLocationId(id: string | undefined | null): string {
  const raw = (id ?? '').trim();
  if (!raw || raw === 'default') return DEFAULT_GUEST_LOCATION_ID;
  if (GUEST_STORE_LOCATIONS.some((l) => l.id === raw)) return raw;
  return DEFAULT_GUEST_LOCATION_ID;
}

interface GuestContextValue {
  bootstrap: GuestBootstrapResponse | null;
  locationId: string;
  setLocationId: (id: string) => void;
  locale: GuestLocale;
  setLocale: (l: GuestLocale) => void;
  loading: boolean;
  isLoggedIn: boolean;
  profileName?: string;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
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
  showCartBarInsteadOfNav: boolean;
  setShowCartBarInsteadOfNav: (show: boolean) => void;
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
  initialLocation = DEFAULT_GUEST_LOCATION_ID,
  initialTable,
}: {
  children: React.ReactNode;
  initialLocation?: string;
  initialTable?: string;
}) {
  const [locationId, setLocationIdState] = useState(() => normalizeGuestLocationId(initialLocation));
  const [bootstrap, setBootstrap] = useState<GuestBootstrapResponse | null>(null);
  const [locale, setLocaleState] = useState<GuestLocale>('en');
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      const loggedOut = localStorage.getItem('corgi_logged_out');
      const token = localStorage.getItem('corgi_guest_session_token') || localStorage.getItem('guest_token');
      if (loggedOut === 'true') return false;
      return Boolean(token);
    }
    return false;
  });

  const [profileName, setProfileName] = useState<string | undefined>();
  const [foodCart, setFoodCart] = useState<CartLine[]>([]);
  const [merchCart, setMerchCart] = useState<CartLine[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [orderMode, setOrderMode] = useState<'store' | 'pickup' | 'delivery'>('store');
  const [showCartBarInsteadOfNav, setShowCartBarInsteadOfNav] = useState(true);

  const setLocale = useCallback((l: GuestLocale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('corgi_guest_locale', l);
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('corgi_logged_out', 'true');
      localStorage.removeItem('corgi_guest_session_token');
      localStorage.removeItem('guest_token');
    }
    setIsLoggedIn(false);
    setProfileName(undefined);
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const loggedOut = localStorage.getItem('corgi_logged_out');
        const token = localStorage.getItem('corgi_guest_session_token') || localStorage.getItem('guest_token');
        const savedName = localStorage.getItem('corgi_profile_name');
        if (loggedOut === 'true' || !token) {
          setIsLoggedIn(false);
          setProfileName(undefined);
          return;
        }
        if (token && savedName) {
          setIsLoggedIn(true);
          setProfileName(savedName);
        }
      }
      const profile = await getProfile();
      setIsLoggedIn(true);
      if (profile.name) {
        setProfileName(profile.name);
        if (typeof window !== 'undefined') {
          localStorage.setItem('corgi_profile_name', profile.name);
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('corgi_guest_session_token') || localStorage.getItem('guest_token');
        const savedName = localStorage.getItem('corgi_profile_name');
        if (token) {
          setIsLoggedIn(true);
          setProfileName(savedName || 'Friend');
          return;
        }
      }
      setIsLoggedIn(false);
      setProfileName(undefined);
    }
  }, []);

  const setLocationId = useCallback((id: string) => {
    const next = normalizeGuestLocationId(id);
    setLocationIdState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_LOCATION_STORAGE_KEY, next);
    }
  }, []);

  useEffect(() => {
    setLocationIdState(normalizeGuestLocationId(initialLocation));
  }, [initialLocation]);

  useEffect(() => {
    const savedLocale = localStorage.getItem('corgi_guest_locale') as GuestLocale | null;
    if (savedLocale) setLocaleState(savedLocale);
    setFoodCart(loadCart(CART_KEY));
    setMerchCart(loadCart(MERCH_KEY));
    const welcomeSeen = localStorage.getItem(WELCOME_KEY);
    setShowWelcome(!welcomeSeen);

    (async () => {
      try {
        const data = await getBootstrap(locationId, initialTable, savedLocale || 'en');
        setBootstrap(data);
        if (!savedLocale) setLocaleState(data.locale);
      } finally {
        setLoading(false);
      }
    })();

    refreshAuth();

    const onInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, [locationId, initialTable, refreshAuth]);

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
    const key = `${line.merchSkuId}-${JSON.stringify(line.modifiers)}`;
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

  const clearFoodCart = useCallback(() => setFoodCart([]), []);
  const clearMerchCart = useCallback(() => setMerchCart([]), []);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, 'true');
    setShowWelcome(false);
  }, []);

  const value = useMemo(
    () => ({
      bootstrap,
      locationId,
      setLocationId,
      locale,
      setLocale,
      loading,
      isLoggedIn,
      profileName,
      refreshAuth,
      logout,
      foodCart,
      merchCart,
      addFoodToCart,
      addMerchToCart,
      updateFoodQty,
      updateMerchQty,
      clearFoodCart,
      clearMerchCart,
      showWelcome,
      dismissWelcome,
      deferredInstall,
      setDeferredInstall,
      orderMode,
      setOrderMode,
      showCartBarInsteadOfNav,
      setShowCartBarInsteadOfNav,
    }),
    [
      bootstrap,
      locationId,
      setLocationId,
      locale,
      setLocale,
      loading,
      isLoggedIn,
      profileName,
      refreshAuth,
      logout,
      foodCart,
      merchCart,
      addFoodToCart,
      addMerchToCart,
      updateFoodQty,
      updateMerchQty,
      clearFoodCart,
      clearMerchCart,
      showWelcome,
      dismissWelcome,
      deferredInstall,
      orderMode,
      showCartBarInsteadOfNav,
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
