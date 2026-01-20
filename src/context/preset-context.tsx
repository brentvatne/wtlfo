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
const HIDE_VALUES_KEY = 'hideValuesWhileEditing';
const FADE_IN_KEY = 'fadeInOnOpen';
const RESET_LFO_KEY = 'resetLFOOnChange';
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
      if (!isNaN(bpm) && bpm >= 30 && bpm <= 300) {
        return bpm;
      }
    }
  } catch {
    console.warn('Failed to load saved BPM');
  }
  return DEFAULT_BPM;
}

// Load initial hide values setting synchronously
function getInitialHideValues(): boolean {
  try {
    const saved = Storage.getItemSync(HIDE_VALUES_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load hide values setting');
  }
  return true; // Default to hiding values while editing
}

// Load initial fade-in setting synchronously
function getInitialFadeIn(): boolean {
  try {
    const saved = Storage.getItemSync(FADE_IN_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load fade-in setting');
  }
  return true; // Default to fading in on open
}

// Load initial reset LFO setting synchronously
function getInitialResetLFO(): boolean {
  try {
    const saved = Storage.getItemSync(RESET_LFO_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load reset LFO setting');
  }
  return true; // Default to resetting LFO on parameter changes
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
  /** True while user is actively interacting with a control */
  isEditing: boolean;
  /** Set editing state - call with true when interaction starts, false when it ends */
  setIsEditing: (editing: boolean) => void;
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

  // Settings
  hideValuesWhileEditing: boolean;
  setHideValuesWhileEditing: (hide: boolean) => void;
  fadeInOnOpen: boolean;
  setFadeInOnOpen: (fade: boolean) => void;
  resetLFOOnChange: boolean;
  setResetLFOOnChange: (reset: boolean) => void;
}

const PresetContext = createContext<PresetContextValue | null>(null);

// Compute initial values ONCE, outside the component, to ensure consistency
const INITIAL_PRESET_INDEX = getInitialPreset();
const INITIAL_CONFIG = { ...PRESETS[INITIAL_PRESET_INDEX].config };
const INITIAL_BPM = getInitialBPM();
const INITIAL_START_PHASE = INITIAL_CONFIG.startPhase / 128;
const INITIAL_HIDE_VALUES = getInitialHideValues();
const INITIAL_FADE_IN = getInitialFadeIn();
const INITIAL_RESET_LFO = getInitialResetLFO();

export function PresetProvider({ children }: { children: React.ReactNode }) {
  const [activePreset, setActivePresetState] = useState(INITIAL_PRESET_INDEX);
  const [currentConfig, setCurrentConfig] = useState<LFOPresetConfig>(() => ({ ...INITIAL_CONFIG }));
  const [debouncedConfig, setDebouncedConfig] = useState<LFOPresetConfig>(() => ({ ...INITIAL_CONFIG }));
  const [bpm, setBPMState] = useState(INITIAL_BPM);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hideValuesWhileEditing, setHideValuesWhileEditingState] = useState(INITIAL_HIDE_VALUES);
  const [fadeInOnOpen, setFadeInOnOpenState] = useState(INITIAL_FADE_IN);
  const [resetLFOOnChange, setResetLFOOnChangeState] = useState(INITIAL_RESET_LFO);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LFO animation state - persists across tab switches
  // Initialize phase to match the preset's startPhase to avoid first-frame jump
  const lfoPhase = useSharedValue(INITIAL_START_PHASE);
  const lfoOutput = useSharedValue(0);
  // Create LFO engine immediately (not after debounce) to avoid jitter on app start
  const lfoRef = useRef<LFO | null>(null);
  // Synchronously initialize LFO on first render
  if (lfoRef.current === null) {
    lfoRef.current = new LFO(INITIAL_CONFIG, INITIAL_BPM);
    // Auto-trigger for modes that need it
    if (INITIAL_CONFIG.mode === 'TRG' || INITIAL_CONFIG.mode === 'ONE' || INITIAL_CONFIG.mode === 'HLF') {
      lfoRef.current.trigger();
    }
  }
  const animationRef = useRef<number>(0);
  // Initialize timing info from the LFO we just created
  const [timingInfo, setTimingInfo] = useState<TimingInfo>(() => {
    if (lfoRef.current) {
      const info = lfoRef.current.getTimingInfo();
      const msPerStep = 15000 / INITIAL_BPM;
      return {
        cycleTimeMs: info.cycleTimeMs,
        noteValue: info.noteValue,
        steps: info.cycleTimeMs / msPerStep,
      };
    }
    return { cycleTimeMs: 0, noteValue: '', steps: 0 };
  });

  // Track whether we paused the animation due to app going to background
  // This is separate from user-initiated pause (isPaused state)
  const wasRunningBeforeBackgroundRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Ref to track isPaused for AppState handler (avoids stale closure issues)
  const isPausedRef = useRef(false);
  // Track if this is the initial LFO creation (to avoid phase reset on mount)
  const isInitialLFOCreation = useRef(true);
  // Track if the main animation loop has started (to prevent duplicate loops)
  const hasMainLoopStarted = useRef(false);

  // Debounce config changes for engine restart
  // Skip the initial render - LFO is already created synchronously above
  // Note: isEditing is now controlled externally by slider interactions
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Skip debounce on first render - LFO is already initialized
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedConfig({ ...currentConfig });
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
    const clampedBPM = Math.max(30, Math.min(300, Math.round(newBPM)));
    setBPMState(clampedBPM);
    try {
      Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM));
    } catch {
      console.warn('Failed to save BPM');
    }
  }, []);

  const setHideValuesWhileEditing = useCallback((hide: boolean) => {
    setHideValuesWhileEditingState(hide);
    try {
      Storage.setItemSync(HIDE_VALUES_KEY, String(hide));
    } catch {
      console.warn('Failed to save hide values setting');
    }
  }, []);

  const setFadeInOnOpen = useCallback((fade: boolean) => {
    setFadeInOnOpenState(fade);
    try {
      Storage.setItemSync(FADE_IN_KEY, String(fade));
    } catch {
      console.warn('Failed to save fade-in setting');
    }
  }, []);

  const setResetLFOOnChange = useCallback((reset: boolean) => {
    setResetLFOOnChangeState(reset);
    try {
      Storage.setItemSync(RESET_LFO_KEY, String(reset));
    } catch {
      console.warn('Failed to save reset LFO setting');
    }
  }, []);

  // Sync currentConfig when activePreset changes
  // Skip on first render - config is already initialized to match activePreset
  const isFirstPresetSync = useRef(true);
  useEffect(() => {
    if (isFirstPresetSync.current) {
      isFirstPresetSync.current = false;
      return;
    }
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

  // Restart animation loop when user unpauses after returning from background
  // This handles the case where:
  // 1. User pauses visualization
  // 2. App goes to background (animation loop cancelled)
  // 3. App returns to foreground (loop not restarted because user was paused)
  // 4. User taps to unpause - this effect restarts the loop
  // NOTE: We check hasMainLoopStarted to avoid starting a duplicate loop on mount
  useEffect(() => {
    if (!isPaused && animationRef.current === 0 && hasMainLoopStarted.current) {
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
  }, [isPaused, lfoPhase, lfoOutput]);

  // Recreate LFO when debounced config changes (after initial creation)
  // Skip on first render - LFO is already created synchronously above
  useEffect(() => {
    // Skip on first render - LFO already exists
    if (isInitialLFOCreation.current) {
      isInitialLFOCreation.current = false;
      return;
    }

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

    // Only reset phase/output and trigger if resetLFOOnChange is enabled
    if (resetLFOOnChange) {
      // Reset phase to start phase for clean state on preset/config change
      const startPhaseNormalized = debouncedConfig.startPhase / 128;
      lfoPhase.value = startPhaseNormalized;
      lfoOutput.value = 0;
      // Clear pause state when config changes
      setIsPaused(false);

      // Auto-trigger for modes that need it (resets phase and starts running)
      if (debouncedConfig.mode === 'TRG' || debouncedConfig.mode === 'ONE' || debouncedConfig.mode === 'HLF') {
        lfoRef.current.trigger();
      }
    }
  }, [debouncedConfig, bpm, lfoPhase, lfoOutput, resetLFOOnChange]);

  // Animation loop - runs at provider level, independent of tabs
  useEffect(() => {
    hasMainLoopStarted.current = true;
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
    setIsEditing,
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
    // Settings
    hideValuesWhileEditing,
    setHideValuesWhileEditing,
    fadeInOnOpen,
    setFadeInOnOpen,
    resetLFOOnChange,
    setResetLFOOnChange,
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
