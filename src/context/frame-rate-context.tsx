import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FrameRateContextType {
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  toggleOverlay: () => void;
}

const FrameRateContext = createContext<FrameRateContextType | null>(null);

export function FrameRateProvider({ children }: { children: ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(false);

  const toggleOverlay = useCallback(() => {
    setShowOverlay(prev => !prev);
  }, []);

  return (
    <FrameRateContext.Provider value={{ showOverlay, setShowOverlay, toggleOverlay }}>
      {children}
    </FrameRateContext.Provider>
  );
}

export function useFrameRate() {
  const context = useContext(FrameRateContext);
  if (!context) {
    throw new Error('useFrameRate must be used within a FrameRateProvider');
  }
  return context;
}
