import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { Storage } from 'expo-sqlite/kv-store';
import { PRESETS, type LFOPreset, type LFOPresetConfig } from '@/src/data/presets';

const ENGINE_DEBOUNCE_MS = 100;

const STORAGE_KEY = 'activePreset';
const BPM_STORAGE_KEY = 'bpm';
const DEFAULT_BPM = 120;

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

// Load initial BPM synchronously
function getInitialBPM(): number {
  try {
    const saved = Storage.getItemSync(BPM_STORAGE_KEY);
    if (saved !== null) {
      const bpm = parseInt(saved, 10);
      if (!isNaN(bpm) && bpm >= 20 && bpm <= 300) {
        return bpm;
      }
    }
  } catch {
    console.warn('Failed to load saved BPM');
  }
  return DEFAULT_BPM;
}

interface PresetContextValue {
  activePreset: number;
  preset: LFOPreset;
  setActivePreset: (index: number) => void;
  presets: LFOPreset[];
  /** Immediate config - updates instantly for UI display */
  currentConfig: LFOPresetConfig;
  /** Debounced config - updates 100ms after last change, use for engine creation */
  debouncedConfig: LFOPresetConfig;
  /** True while user is actively editing (before debounce settles) */
  isEditing: boolean;
  updateParameter: <K extends keyof LFOPresetConfig>(key: K, value: LFOPresetConfig[K]) => void;
  resetToPreset: () => void;
  bpm: number;
  setBPM: (bpm: number) => void;
}

const PresetContext = createContext<PresetContextValue | null>(null);

export function PresetProvider({ children }: { children: React.ReactNode }) {
  const [activePreset, setActivePresetState] = useState(getInitialPreset);
  const [currentConfig, setCurrentConfig] = useState<LFOPresetConfig>(
    () => ({ ...PRESETS[getInitialPreset()].config })
  );
  const [debouncedConfig, setDebouncedConfig] = useState<LFOPresetConfig>(
    () => ({ ...PRESETS[getInitialPreset()].config })
  );
  const [bpm, setBPMState] = useState(getInitialBPM);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce config changes for engine restart
  useEffect(() => {
    // Mark as editing when config changes
    setIsEditing(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedConfig({ ...currentConfig });
      setIsEditing(false);
    }, ENGINE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [currentConfig]);

  const setActivePreset = useCallback((index: number) => {
    setActivePresetState(index);
    // Persist to storage synchronously
    try {
      Storage.setItemSync(STORAGE_KEY, String(index));
    } catch {
      console.warn('Failed to save preset');
    }
  }, []);

  const setBPM = useCallback((newBPM: number) => {
    const clampedBPM = Math.max(20, Math.min(300, Math.round(newBPM)));
    setBPMState(clampedBPM);
    try {
      Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM));
    } catch {
      console.warn('Failed to save BPM');
    }
  }, []);

  // Sync currentConfig when activePreset changes
  useEffect(() => {
    setCurrentConfig({ ...PRESETS[activePreset].config });
  }, [activePreset]);

  const updateParameter = useCallback(<K extends keyof LFOPresetConfig>(
    key: K,
    value: LFOPresetConfig[K]
  ) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToPreset = useCallback(() => {
    setCurrentConfig({ ...PRESETS[activePreset].config });
  }, [activePreset]);

  const value: PresetContextValue = {
    activePreset,
    preset: PRESETS[activePreset],
    setActivePreset,
    presets: PRESETS,
    currentConfig,
    debouncedConfig,
    isEditing,
    updateParameter,
    resetToPreset,
    bpm,
    setBPM,
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
