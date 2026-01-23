import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Storage } from 'expo-sqlite/kv-store';

const SHOW_FPS_KEY = 'showFrameRateOverlay';

// Load initial setting synchronously
function getInitialShowOverlay(): boolean {
  try {
    const saved = Storage.getItemSync(SHOW_FPS_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load frame rate overlay setting');
  }
  return false;
}

interface FrameRateContextType {
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  toggleOverlay: () => void;
}

const FrameRateContext = createContext<FrameRateContextType | null>(null);

export function FrameRateProvider({ children }: { children: ReactNode }) {
  const [showOverlay, setShowOverlayState] = useState(getInitialShowOverlay);

  const setShowOverlay = useCallback((show: boolean) => {
    setShowOverlayState(show);
    Storage.setItem(SHOW_FPS_KEY, String(show));
  }, []);

  const toggleOverlay = useCallback(() => {
    setShowOverlayState(prev => {
      const newValue = !prev;
      Storage.setItem(SHOW_FPS_KEY, String(newValue));
      return newValue;
    });
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
