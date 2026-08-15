'use client';

import React, { createContext, useContext } from 'react';

const PosShellChromeContext = createContext(false);

export function PosShellChromeProvider({ children }: { children: React.ReactNode }) {
  return (
    <PosShellChromeContext.Provider value={true}>{children}</PosShellChromeContext.Provider>
  );
}

export function usePosShellChrome(): boolean {
  return useContext(PosShellChromeContext);
}
