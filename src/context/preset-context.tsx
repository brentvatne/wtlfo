import React, { createContext, useState, useCallback } from 'react';
import { Storage } from 'expo-sqlite/kv-store';
import { PRESETS, type LFOPreset } from '@/src/data/presets';

const STORAGE_KEY = 'activePreset';

// Load initial preset synchronously
function getInitialPreset(): number {
  try {
    const saved = Storage.getItemSync(STORAGE_KEY);
    if (saved !== null) {
      const index = parseInt(saved, 10);
      if (!isNaN(index) && index >= 0 && index < PRESETS.length) {
        return index;
      }
    }
  } catch {
    console.warn('Failed to load saved preset');
  }
  return 0;
}

interface PresetContextValue {
  activePreset: number;
  preset: LFOPreset;
  setActivePreset: (index: number) => void;
  presets: LFOPreset[];
}

const PresetContext = createContext<PresetContextValue | null>(null);

export function PresetProvider({ children }: { children: React.ReactNode }) {
  const [activePreset, setActivePresetState] = useState(getInitialPreset);

  const setActivePreset = useCallback((index: number) => {
    setActivePresetState(index);
    // Persist to storage synchronously
    try {
      Storage.setItemSync(STORAGE_KEY, String(index));
    } catch {
      console.warn('Failed to save preset');
    }
  }, []);

  const value: PresetContextValue = {
    activePreset,
    preset: PRESETS[activePreset],
    setActivePreset,
    presets: PRESETS,
  };

  return (
    <PresetContext value={value}>
      {children}
    </PresetContext>
  );
}

export function usePreset() {
  const context = React.use(PresetContext);
  if (!context) {
    throw new Error('usePreset must be used within a PresetProvider');
  }
  return context;
}
