import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Storage } from 'expo-sqlite/kv-store';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LFO } from 'elektron-lfo';
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

interface TimingInfo {
  cycleTimeMs: number;
  noteValue: string;
  steps: number; // Number of 1/16 steps in one cycle
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

  // LFO animation state - shared across tabs
  lfoPhase: SharedValue<number>;
  lfoOutput: SharedValue<number>;
  lfoRef: React.MutableRefObject<LFO | null>;
  timingInfo: TimingInfo;

  // LFO control methods
  triggerLFO: () => void;
  startLFO: () => void;
  stopLFO: () => void;
  isLFORunning: () => boolean;

  // Pause state for UI
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
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
  const [isPaused, setIsPaused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LFO animation state - persists across tab switches
  const lfoPhase = useSharedValue(0);
  const lfoOutput = useSharedValue(0);
  const lfoRef = useRef<LFO | null>(null);
  const animationRef = useRef<number>(0);
  const [timingInfo, setTimingInfo] = useState<TimingInfo>({ cycleTimeMs: 0, noteValue: '', steps: 0 });

  // Track whether we paused the animation due to app going to background
  // This is separate from user-initiated pause (isPaused state)
  const wasRunningBeforeBackgroundRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Ref to track isPaused for AppState handler (avoids stale closure issues)
  const isPausedRef = useRef(false);

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
    setCurrentConfig(prev => {
      // Skip update if value hasn't changed - avoids unnecessary debounce cycles
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const resetToPreset = useCallback(() => {
    setCurrentConfig({ ...PRESETS[activePreset].config });
  }, [activePreset]);

  // Keep isPausedRef in sync with isPaused state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Create/recreate LFO when debounced config changes
  useEffect(() => {
    lfoRef.current = new LFO(debouncedConfig, bpm);

    // Get timing info
    const info = lfoRef.current.getTimingInfo();
    // Calculate steps: one step = 1/16 note = (60000/bpm)/4 ms
    const msPerStep = 15000 / bpm;
    const steps = info.cycleTimeMs / msPerStep;
    setTimingInfo({
      cycleTimeMs: info.cycleTimeMs,
      noteValue: info.noteValue,
      steps,
    });

    // Reset phase to start phase for clean state on preset/config change
    const startPhaseNormalized = debouncedConfig.startPhase / 128;
    lfoPhase.value = startPhaseNormalized;
    lfoOutput.value = 0;

    // Auto-trigger for modes that need it (resets phase and starts running)
    if (debouncedConfig.mode === 'TRG' || debouncedConfig.mode === 'ONE' || debouncedConfig.mode === 'HLF') {
      lfoRef.current.trigger();
    }

    // Clear pause state when config changes
    setIsPaused(false);
  }, [debouncedConfig, bpm, lfoPhase, lfoOutput]);

  // Animation loop - runs at provider level, independent of tabs
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        lfoPhase.value = state.phase;
        lfoOutput.value = state.output;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [lfoPhase, lfoOutput]);

  // Pause animation loop when app goes to background to save battery
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;

      if (
        previousState === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // App is going to background
        // Remember if animation was running (and not user-paused)
        // Use ref to get current isPaused value (avoids stale closure)
        wasRunningBeforeBackgroundRef.current = !isPausedRef.current && (lfoRef.current?.isRunning() ?? false);

        // Stop the animation loop
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
        }
      } else if (
        (previousState === 'inactive' || previousState === 'background') &&
        nextAppState === 'active'
      ) {
        // App is coming back to foreground
        // Only resume if we were running before going to background
        // Don't resume if user had manually paused
        if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
          // Restart the animation loop
          const animate = (timestamp: number) => {
            if (lfoRef.current) {
              const state = lfoRef.current.update(timestamp);
              lfoPhase.value = state.phase;
              lfoOutput.value = state.output;
            }
            animationRef.current = requestAnimationFrame(animate);
          };
          animationRef.current = requestAnimationFrame(animate);
        }
        wasRunningBeforeBackgroundRef.current = false;
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [lfoPhase, lfoOutput]);

  // LFO control methods
  const triggerLFO = useCallback(() => lfoRef.current?.trigger(), []);
  const startLFO = useCallback(() => lfoRef.current?.start(), []);
  const stopLFO = useCallback(() => lfoRef.current?.stop(), []);
  const isLFORunning = useCallback(() => lfoRef.current?.isRunning() ?? false, []);

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
    // LFO animation state
    lfoPhase,
    lfoOutput,
    lfoRef,
    timingInfo,
    // LFO control
    triggerLFO,
    startLFO,
    stopLFO,
    isLFORunning,
    isPaused,
    setIsPaused,
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
