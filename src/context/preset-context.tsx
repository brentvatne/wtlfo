import React, { createContext, useState, useCallback } from 'react';
import { PRESETS, type LFOPreset } from '@/src/data/presets';

interface PresetContextValue {
  activePreset: number;
  preset: LFOPreset;
  setActivePreset: (index: number) => void;
  presets: LFOPreset[];
}

const PresetContext = createContext<PresetContextValue | null>(null);

export function PresetProvider({ children }: { children: React.ReactNode }) {
  const [activePreset, setActivePresetState] = useState(0);

  const setActivePreset = useCallback((index: number) => {
    setActivePresetState(index);
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
