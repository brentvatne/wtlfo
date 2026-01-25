import React, { createContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Storage } from 'expo-sqlite/kv-store';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LFO, calculateTimingInfo } from 'elektron-lfo';
import { PRESETS, type LFOPreset, type LFOPresetConfig } from '@/src/data/presets';
import { useMidi } from '@/src/context/midi-context';

const ENGINE_DEBOUNCE_MS = 100;

const STORAGE_KEY = 'activePreset';
const CONFIG_STORAGE_KEY = 'currentConfig';
const BPM_STORAGE_KEY = 'bpm';
const HIDE_VALUES_KEY = 'hideValuesWhileEditing';
const SHOW_FILLS_KEY = 'showFillsWhenEditing';
const FADE_IN_KEY = 'fadeInOnOpen';
const VISUALIZATION_FADE_KEY = 'fadeInVisualization';
const RESET_LFO_KEY = 'resetLFOOnChange';
const FADE_IN_DURATION_KEY = 'fadeInDuration';
const VISUALIZATION_FADE_DURATION_KEY = 'visualizationFadeDuration';
const EDIT_FADE_OUT_KEY = 'editFadeOutDuration';
const EDIT_FADE_IN_KEY = 'editFadeInDuration';
const SHOW_FADE_ENVELOPE_KEY = 'showFadeEnvelope';
const DEPTH_ANIM_DURATION_KEY = 'depthAnimationDuration';
const SPLASH_FADE_DURATION_KEY = 'splashFadeDuration';
const SMOOTH_PHASE_ANIMATION_KEY = 'smoothPhaseAnimation';
const PHASE_ANIMATION_DURATION_KEY = 'phaseAnimationDuration';
const TAB_SWITCH_FADE_OPACITY_KEY = 'tabSwitchFadeOpacity';
const DEFAULT_BPM = 120;
export const DEFAULT_FADE_IN_DURATION = 752; // ms (47 frames @ 60fps)
export const DEFAULT_VISUALIZATION_FADE_DURATION = 448; // ms (28 frames @ 60fps)
export const DEFAULT_EDIT_FADE_OUT = 0; // ms
export const DEFAULT_EDIT_FADE_IN = 96; // ms (6 frames @ 60fps)
export const DEFAULT_DEPTH_ANIM_DURATION = 16; // ms (1 frame @ 60fps)
export const DEFAULT_SPLASH_FADE_DURATION = 144; // ms (9 frames @ 60fps)
export const DEFAULT_PHASE_ANIMATION_DURATION = 16; // ms (1 frame @ 60fps)
export const DEFAULT_TAB_SWITCH_FADE_OPACITY = 0.5; // Starting opacity for tab switch fade

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

// Load saved config or fall back to preset defaults
function getInitialConfig(presetIndex: number): LFOPresetConfig {
  try {
    const saved = Storage.getItemSync(CONFIG_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved) as LFOPresetConfig;
      // Validate the parsed config has all required fields
      if (
        typeof parsed.waveform === 'string' &&
        typeof parsed.speed === 'number' &&
        typeof parsed.depth === 'number' &&
        typeof parsed.fade === 'number'
      ) {
        return parsed;
      }
    }
  } catch {
    console.warn('Failed to load saved config');
  }
  return { ...PRESETS[presetIndex].config };
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

// Load initial show fills setting synchronously
function getInitialShowFills(): boolean {
  try {
    const saved = Storage.getItemSync(SHOW_FILLS_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load show fills setting');
  }
  return true; // Default to showing fills when editing
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
  return true; // Default to fading in on tab switch
}

// Load initial visualization fade setting synchronously
function getInitialVisualizationFade(): boolean {
  try {
    const saved = Storage.getItemSync(VISUALIZATION_FADE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load visualization fade setting');
  }
  return true; // Default to fading in visualization
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

// Load initial fade-in duration synchronously
function getInitialFadeInDuration(): number {
  try {
    const saved = Storage.getItemSync(FADE_IN_DURATION_KEY);
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 100 && value <= 2000) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load fade-in duration setting');
  }
  return DEFAULT_FADE_IN_DURATION;
}

// Load initial visualization fade duration synchronously
function getInitialVisualizationFadeDuration(): number {
  try {
    const saved = Storage.getItemSync(VISUALIZATION_FADE_DURATION_KEY);
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 100 && value <= 2000) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load visualization fade duration setting');
  }
  return DEFAULT_VISUALIZATION_FADE_DURATION;
}

// Load initial edit fade-out duration synchronously
function getInitialEditFadeOut(): number {
  try {
    const saved = Storage.getItemSync(EDIT_FADE_OUT_KEY);
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 0 && value <= 500) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load edit fade-out setting');
  }
  return DEFAULT_EDIT_FADE_OUT;
}

// Load initial edit fade-in duration synchronously
function getInitialEditFadeIn(): number {
  try {
    const saved = Storage.getItemSync(EDIT_FADE_IN_KEY);
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 100 && value <= 1000) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load edit fade-in setting');
  }
  return DEFAULT_EDIT_FADE_IN;
}

// Load initial show fade envelope setting synchronously
function getInitialShowFadeEnvelope(): boolean {
  try {
    const saved = Storage.getItemSync(SHOW_FADE_ENVELOPE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load show fade envelope setting');
  }
  return true; // Default to showing fade envelope
}

// Load initial depth animation duration synchronously
function getInitialDepthAnimDuration(): number {
  try {
    const saved = Storage.getItemSync(DEPTH_ANIM_DURATION_KEY);
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 0 && value <= 200) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load depth animation duration setting');
  }
  return DEFAULT_DEPTH_ANIM_DURATION;
}

// Load initial splash fade duration synchronously
function getInitialSplashFadeDuration(): number {
  try {
    const saved = Storage.getItemSync(SPLASH_FADE_DURATION_KEY);
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 0 && value <= 1000) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load splash fade duration setting');
  }
  return DEFAULT_SPLASH_FADE_DURATION;
}

// Load initial smooth phase animation setting synchronously
function getInitialSmoothPhaseAnimation(): boolean {
  try {
    const saved = Storage.getItemSync(SMOOTH_PHASE_ANIMATION_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    console.warn('Failed to load smooth phase animation setting');
  }
  return true; // Default to enabled - smooth phase interpolation
}

// Load initial phase animation duration synchronously
function getInitialPhaseAnimationDuration(): number {
  try {
    const saved = Storage.getItemSync(PHASE_ANIMATION_DURATION_KEY);
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load phase animation duration setting');
  }
  return DEFAULT_PHASE_ANIMATION_DURATION;
}

// Load initial tab switch fade opacity synchronously
function getInitialTabSwitchFadeOpacity(): number {
  try {
    const saved = Storage.getItemSync(TAB_SWITCH_FADE_OPACITY_KEY);
    if (saved !== null) {
      const value = parseFloat(saved);
      if (!isNaN(value) && value >= 0 && value <= 1) {
        return value;
      }
    }
  } catch {
    console.warn('Failed to load tab switch fade opacity setting');
  }
  return DEFAULT_TAB_SWITCH_FADE_OPACITY;
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
  /** Effective BPM - uses external MIDI clock when enabled, otherwise user BPM */
  effectiveBpm: number;
  /** True when using external MIDI clock for tempo */
  usingMidiClock: boolean;
  /** True when MIDI transport is controlling playback */
  usingMidiTransport: boolean;

  // LFO animation state - shared across tabs
  lfoPhase: SharedValue<number>;
  lfoOutput: SharedValue<number>;
  lfoFadeMultiplier: SharedValue<number>;
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
  showFillsWhenEditing: boolean;
  setShowFillsWhenEditing: (show: boolean) => void;
  fadeInOnOpen: boolean;
  setFadeInOnOpen: (fade: boolean) => void;
  fadeInVisualization: boolean;
  setFadeInVisualization: (fade: boolean) => void;
  resetLFOOnChange: boolean;
  setResetLFOOnChange: (reset: boolean) => void;

  // Animation timing settings
  fadeInDuration: number;
  setFadeInDuration: (duration: number) => void;
  visualizationFadeDuration: number;
  setVisualizationFadeDuration: (duration: number) => void;
  editFadeOutDuration: number;
  setEditFadeOutDuration: (duration: number) => void;
  editFadeInDuration: number;
  setEditFadeInDuration: (duration: number) => void;

  // Visualization settings
  showFadeEnvelope: boolean;
  setShowFadeEnvelope: (show: boolean) => void;
  depthAnimationDuration: number;
  setDepthAnimationDuration: (duration: number) => void;
  splashFadeDuration: number;
  setSplashFadeDuration: (duration: number) => void;
  smoothPhaseAnimation: boolean;
  setSmoothPhaseAnimation: (enabled: boolean) => void;
  phaseAnimationDuration: number;
  setPhaseAnimationDuration: (duration: number) => void;
  tabSwitchFadeOpacity: number;
  setTabSwitchFadeOpacity: (opacity: number) => void;
}

const PresetContext = createContext<PresetContextValue | null>(null);

// Compute initial values ONCE, outside the component, to ensure consistency
const INITIAL_PRESET_INDEX = getInitialPreset();
const INITIAL_CONFIG = getInitialConfig(INITIAL_PRESET_INDEX);
const INITIAL_BPM = getInitialBPM();
const INITIAL_START_PHASE = INITIAL_CONFIG.startPhase / 128;
const INITIAL_HIDE_VALUES = getInitialHideValues();
const INITIAL_SHOW_FILLS = getInitialShowFills();
const INITIAL_FADE_IN = getInitialFadeIn();
const INITIAL_VISUALIZATION_FADE = getInitialVisualizationFade();
const INITIAL_RESET_LFO = getInitialResetLFO();
const INITIAL_FADE_IN_DURATION = getInitialFadeInDuration();
const INITIAL_VISUALIZATION_FADE_DURATION = getInitialVisualizationFadeDuration();
const INITIAL_EDIT_FADE_OUT = getInitialEditFadeOut();
const INITIAL_EDIT_FADE_IN = getInitialEditFadeIn();
const INITIAL_SHOW_FADE_ENVELOPE = getInitialShowFadeEnvelope();
const INITIAL_DEPTH_ANIM_DURATION = getInitialDepthAnimDuration();
const INITIAL_SPLASH_FADE_DURATION = getInitialSplashFadeDuration();
const INITIAL_SMOOTH_PHASE_ANIMATION = getInitialSmoothPhaseAnimation();
const INITIAL_PHASE_ANIMATION_DURATION = getInitialPhaseAnimationDuration();
const INITIAL_TAB_SWITCH_FADE_OPACITY = getInitialTabSwitchFadeOpacity();

// Check if auto-connect is enabled - if so, start LFO paused
// (waiting for MIDI transport start or user tap)
const AUTO_CONNECT_KEY = 'midi_auto_connect';
function getInitialPaused(): boolean {
  try {
    const autoConnect = Storage.getItemSync(AUTO_CONNECT_KEY);
    return autoConnect === 'true';
  } catch {
    return false;
  }
}
const INITIAL_PAUSED = getInitialPaused();

export function PresetProvider({ children }: { children: React.ReactNode }) {
  // MIDI sync state
  const {
    transportRunning,
    lastTransportMessage,
    externalBpm,
    receiveTransport,
    receiveClock,
    connected: midiConnected,
    initialCheckComplete: midiInitialCheckComplete,
    digitaktAvailable,
    autoConnect,
  } = useMidi();

  const [activePreset, setActivePresetState] = useState(INITIAL_PRESET_INDEX);
  const [currentConfig, setCurrentConfig] = useState<LFOPresetConfig>(() => ({ ...INITIAL_CONFIG }));
  const [debouncedConfig, setDebouncedConfig] = useState<LFOPresetConfig>(() => ({ ...INITIAL_CONFIG }));
  const [bpm, setBPMState] = useState(INITIAL_BPM);

  // Effective BPM: use external MIDI clock when enabled and available
  const effectiveBpm = receiveClock && externalBpm > 0 ? Math.round(externalBpm) : bpm;
  const [isEditing, setIsEditing] = useState(false);
  const [isPaused, setIsPaused] = useState(INITIAL_PAUSED);
  const [hideValuesWhileEditing, setHideValuesWhileEditingState] = useState(INITIAL_HIDE_VALUES);
  const [showFillsWhenEditing, setShowFillsWhenEditingState] = useState(INITIAL_SHOW_FILLS);
  const [fadeInOnOpen, setFadeInOnOpenState] = useState(INITIAL_FADE_IN);
  const [fadeInVisualization, setFadeInVisualizationState] = useState(INITIAL_VISUALIZATION_FADE);
  const [resetLFOOnChange, setResetLFOOnChangeState] = useState(INITIAL_RESET_LFO);
  const [fadeInDuration, setFadeInDurationState] = useState(INITIAL_FADE_IN_DURATION);
  const [visualizationFadeDuration, setVisualizationFadeDurationState] = useState(INITIAL_VISUALIZATION_FADE_DURATION);
  const [editFadeOutDuration, setEditFadeOutDurationState] = useState(INITIAL_EDIT_FADE_OUT);
  const [editFadeInDuration, setEditFadeInDurationState] = useState(INITIAL_EDIT_FADE_IN);
  const [showFadeEnvelope, setShowFadeEnvelopeState] = useState(INITIAL_SHOW_FADE_ENVELOPE);
  const [depthAnimationDuration, setDepthAnimationDurationState] = useState(INITIAL_DEPTH_ANIM_DURATION);
  const [splashFadeDuration, setSplashFadeDurationState] = useState(INITIAL_SPLASH_FADE_DURATION);
  const [smoothPhaseAnimation, setSmoothPhaseAnimationState] = useState(INITIAL_SMOOTH_PHASE_ANIMATION);
  const [phaseAnimationDuration, setPhaseAnimationDurationState] = useState(INITIAL_PHASE_ANIMATION_DURATION);
  const [tabSwitchFadeOpacity, setTabSwitchFadeOpacityState] = useState(INITIAL_TAB_SWITCH_FADE_OPACITY);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LFO animation state - persists across tab switches
  // Initialize phase to match the preset's startPhase to avoid first-frame jump
  const lfoPhase = useSharedValue(INITIAL_START_PHASE);
  const lfoOutput = useSharedValue(0);
  const lfoFadeMultiplier = useSharedValue(1);
  // Create LFO engine immediately (not after debounce) to avoid jitter on app start
  const lfoRef = useRef<LFO | null>(null);
  // Synchronously initialize LFO on first render
  if (lfoRef.current === null) {
    lfoRef.current = new LFO(INITIAL_CONFIG, INITIAL_BPM);
    // Auto-trigger for modes that need it, but only if not starting paused (auto-connect enabled)
    if (!INITIAL_PAUSED && (INITIAL_CONFIG.mode === 'TRG' || INITIAL_CONFIG.mode === 'ONE' || INITIAL_CONFIG.mode === 'HLF')) {
      lfoRef.current.trigger();
    }
    // If starting paused (auto-connect enabled), stop the LFO engine
    if (INITIAL_PAUSED) {
      lfoRef.current.stop();
    }
  }
  const animationRef = useRef<number>(0);
  // Compute timing info live from currentConfig (no debounce delay)
  // This ensures timing values update immediately when parameters change
  const timingInfo = useMemo<TimingInfo>(() => {
    const info = calculateTimingInfo(currentConfig, effectiveBpm);
    // Calculate steps: one step = 1/16 note = (60000/bpm)/4 ms = 15000/bpm ms
    const msPerStep = 15000 / effectiveBpm;
    const steps = info.cycleTimeMs / msPerStep;
    return {
      cycleTimeMs: info.cycleTimeMs,
      noteValue: info.noteValue,
      steps,
    };
  }, [currentConfig, effectiveBpm]);

  // Track whether we paused the animation due to app going to background
  // This is separate from user-initiated pause (isPaused state)
  const wasRunningBeforeBackgroundRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Ref to track isPaused for AppState handler (avoids stale closure issues)
  const isPausedRef = useRef(false);
  // Refs for smooth phase animation settings (to access in animation callbacks)
  const smoothPhaseAnimationRef = useRef(INITIAL_SMOOTH_PHASE_ANIMATION);
  const phaseAnimationDurationRef = useRef(INITIAL_PHASE_ANIMATION_DURATION);
  // Track last target phase for wrap-around detection
  const lastTargetPhaseRef = useRef(INITIAL_START_PHASE);
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

  // Persist config to storage during idle time
  // Uses requestIdleCallback to avoid blocking UI during animations/interactions
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistIdleRef = useRef<number | null>(null);
  const isFirstPersist = useRef(true);
  useEffect(() => {
    // Skip on first render - config is already loaded from storage
    if (isFirstPersist.current) {
      isFirstPersist.current = false;
      return;
    }

    // Clear any pending persist operations
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
    if (persistIdleRef.current !== null) {
      cancelIdleCallback(persistIdleRef.current);
    }

    // Debounce persistence (500ms) then schedule for idle time
    persistTimeoutRef.current = setTimeout(() => {
      persistIdleRef.current = requestIdleCallback(() => {
        try {
          Storage.setItemSync(CONFIG_STORAGE_KEY, JSON.stringify(currentConfig));
        } catch {
          console.warn('Failed to persist config');
        }
      });
    }, 500);

    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
      if (persistIdleRef.current !== null) {
        cancelIdleCallback(persistIdleRef.current);
      }
    };
  }, [currentConfig]);

  const setActivePreset = useCallback((index: number) => {
    setActivePresetState(index);
    // Persist to storage synchronously
    try {
      Storage.setItemSync(STORAGE_KEY, String(index));
      // Clear saved config so preset defaults are used on next load
      Storage.removeItem(CONFIG_STORAGE_KEY);
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

  const setShowFillsWhenEditing = useCallback((show: boolean) => {
    setShowFillsWhenEditingState(show);
    try {
      Storage.setItemSync(SHOW_FILLS_KEY, String(show));
    } catch {
      console.warn('Failed to save show fills setting');
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

  const setFadeInVisualization = useCallback((fade: boolean) => {
    setFadeInVisualizationState(fade);
    try {
      Storage.setItemSync(VISUALIZATION_FADE_KEY, String(fade));
    } catch {
      console.warn('Failed to save visualization fade setting');
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

  const setFadeInDuration = useCallback((duration: number) => {
    setFadeInDurationState(duration);
    try {
      Storage.setItemSync(FADE_IN_DURATION_KEY, String(duration));
    } catch {
      console.warn('Failed to save fade-in duration setting');
    }
  }, []);

  const setVisualizationFadeDuration = useCallback((duration: number) => {
    setVisualizationFadeDurationState(duration);
    try {
      Storage.setItemSync(VISUALIZATION_FADE_DURATION_KEY, String(duration));
    } catch {
      console.warn('Failed to save visualization fade duration setting');
    }
  }, []);

  const setEditFadeOutDuration = useCallback((duration: number) => {
    setEditFadeOutDurationState(duration);
    try {
      Storage.setItemSync(EDIT_FADE_OUT_KEY, String(duration));
    } catch {
      console.warn('Failed to save edit fade-out setting');
    }
  }, []);

  const setEditFadeInDuration = useCallback((duration: number) => {
    setEditFadeInDurationState(duration);
    try {
      Storage.setItemSync(EDIT_FADE_IN_KEY, String(duration));
    } catch {
      console.warn('Failed to save edit fade-in setting');
    }
  }, []);

  const setShowFadeEnvelope = useCallback((show: boolean) => {
    setShowFadeEnvelopeState(show);
    try {
      Storage.setItemSync(SHOW_FADE_ENVELOPE_KEY, String(show));
    } catch {
      console.warn('Failed to save show fade envelope setting');
    }
  }, []);

  const setDepthAnimationDuration = useCallback((duration: number) => {
    setDepthAnimationDurationState(duration);
    try {
      Storage.setItemSync(DEPTH_ANIM_DURATION_KEY, String(duration));
    } catch {
      console.warn('Failed to save depth animation duration setting');
    }
  }, []);

  const setSplashFadeDuration = useCallback((duration: number) => {
    setSplashFadeDurationState(duration);
    try {
      Storage.setItemSync(SPLASH_FADE_DURATION_KEY, String(duration));
    } catch {
      console.warn('Failed to save splash fade duration setting');
    }
  }, []);

  const setSmoothPhaseAnimation = useCallback((enabled: boolean) => {
    setSmoothPhaseAnimationState(enabled);
    try {
      Storage.setItemSync(SMOOTH_PHASE_ANIMATION_KEY, String(enabled));
    } catch {
      console.warn('Failed to save smooth phase animation setting');
    }
  }, []);

  const setPhaseAnimationDuration = useCallback((duration: number) => {
    setPhaseAnimationDurationState(duration);
    try {
      Storage.setItemSync(PHASE_ANIMATION_DURATION_KEY, String(duration));
    } catch {
      console.warn('Failed to save phase animation duration setting');
    }
  }, []);

  const setTabSwitchFadeOpacity = useCallback((opacity: number) => {
    setTabSwitchFadeOpacityState(opacity);
    try {
      Storage.setItemSync(TAB_SWITCH_FADE_OPACITY_KEY, String(opacity));
    } catch {
      console.warn('Failed to save tab switch fade opacity setting');
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

  // Keep smooth phase animation refs in sync with state
  useEffect(() => {
    smoothPhaseAnimationRef.current = smoothPhaseAnimation;
  }, [smoothPhaseAnimation]);

  useEffect(() => {
    phaseAnimationDurationRef.current = phaseAnimationDuration;
  }, [phaseAnimationDuration]);

  // Helper to update phase with optional smooth animation
  // Handles wrap-around by setting directly when phase wraps from ~1 to ~0
  const updatePhaseRef = useRef((newPhase: number) => {
    const oldPhase = lastTargetPhaseRef.current;
    const phaseDiff = newPhase - oldPhase;

    // Detect wrap-around: if the phase jumped backwards by more than 0.5,
    // it means we wrapped from ~1 to ~0, so set directly without animation
    const wrapped = phaseDiff < -0.5;

    // Update the last target phase ref
    lastTargetPhaseRef.current = newPhase;

    if (wrapped || !smoothPhaseAnimationRef.current || phaseAnimationDurationRef.current === 0) {
      // Direct set: wrap-around, animation disabled, or zero duration
      lfoPhase.value = newPhase;
    } else {
      // Smooth animation to new phase
      lfoPhase.value = withTiming(newPhase, {
        duration: phaseAnimationDurationRef.current,
        easing: Easing.linear,
      });
    }
  });

  // Ref to track isEditing for coordination (avoids stale closure issues)
  const isEditingRef = useRef(false);
  // Ref for fade-out timeout
  const fadeOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coordinate LFO stop/start with editing fade animations
  // Flow: fade out → stop LFO → (editing happens) → reset LFO → start LFO → fade in
  useEffect(() => {
    isEditingRef.current = isEditing;

    if (isEditing && hideValuesWhileEditing) {
      // Editing started: wait for fade-out to complete, then stop LFO
      fadeOutTimeoutRef.current = setTimeout(() => {
        // Stop the animation loop after fade-out completes
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
        }
      }, editFadeOutDuration);
    } else if (!isEditing && hideValuesWhileEditing) {
      // Editing ended: flush debounce, recreate LFO synchronously, restart animation
      if (fadeOutTimeoutRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
        fadeOutTimeoutRef.current = null;
      }

      // Clear any pending debounce - we're going to apply the config immediately
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      // CRITICAL: Recreate the LFO synchronously with currentConfig BEFORE restarting
      // the animation loop. This ensures the LFO engine uses the same config as the
      // visualizers. If we use setDebouncedConfig (async), there's a timing gap where
      // the animation runs with the old LFO before React re-renders.
      lfoRef.current = new LFO(currentConfig, effectiveBpm);

      // Reset and get the correct initial state
      if (resetLFOOnChange) {
        // Trigger resets to startPhase
        lfoRef.current.trigger();
        // Get the actual initial state from the new LFO
        const initialState = lfoRef.current.update(performance.now());
        // Direct assignment for initialization (also resets lastTargetPhaseRef)
        lastTargetPhaseRef.current = initialState.phase;
        lfoPhase.value = initialState.phase;
        lfoOutput.value = initialState.output;
        lfoFadeMultiplier.value = initialState.fadeMultiplier ?? 1;
      }

      // Sync debouncedConfig to prevent the recreation effect from running again
      setDebouncedConfig({ ...currentConfig });

      // Restart animation loop if it was stopped
      if (animationRef.current === 0 && hasMainLoopStarted.current && !isPausedRef.current) {
        const animate = (timestamp: number) => {
          if (lfoRef.current) {
            const state = lfoRef.current.update(timestamp);
            updatePhaseRef.current(state.phase);
            lfoOutput.value = state.output;
            lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    return () => {
      if (fadeOutTimeoutRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
      }
    };
  }, [isEditing, hideValuesWhileEditing, editFadeOutDuration, resetLFOOnChange, currentConfig.startPhase, currentConfig.mode, lfoPhase, lfoOutput]);

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
          updatePhaseRef.current(state.phase);
          lfoOutput.value = state.output;
          lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isPaused, lfoPhase, lfoOutput, lfoFadeMultiplier]);

  // Recreate LFO when debounced config changes (after initial creation)
  // Skip on first render - LFO is already created synchronously above
  useEffect(() => {
    // Skip on first render - LFO already exists
    if (isInitialLFOCreation.current) {
      isInitialLFOCreation.current = false;
      return;
    }

    lfoRef.current = new LFO(debouncedConfig, effectiveBpm);

    // Note: timing info is now computed live from currentConfig via useMemo,
    // so no need to update it here

    // Only reset phase/output and trigger if resetLFOOnChange is enabled
    if (resetLFOOnChange) {
      // Trigger resets to startPhase
      lfoRef.current.trigger();
      // Get the actual initial state (don't assume output is 0 - it depends on waveform)
      const initialState = lfoRef.current.update(performance.now());
      // Direct assignment for initialization (also resets lastTargetPhaseRef)
      lastTargetPhaseRef.current = initialState.phase;
      lfoPhase.value = initialState.phase;
      lfoOutput.value = initialState.output;
      lfoFadeMultiplier.value = initialState.fadeMultiplier ?? 1;
      // Clear pause state when config changes
      setIsPaused(false);
    }
  }, [debouncedConfig, effectiveBpm, lfoPhase, lfoOutput, lfoFadeMultiplier, resetLFOOnChange]);

  // Animation loop - runs at provider level, independent of tabs
  // Only starts if not initially paused (auto-connect enabled = start paused)
  useEffect(() => {
    hasMainLoopStarted.current = true;

    // Don't start animation loop if we're starting paused (waiting for MIDI transport or user tap)
    if (INITIAL_PAUSED) {
      return;
    }

    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        updatePhaseRef.current(state.phase);
        lfoOutput.value = state.output;
        lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [lfoPhase, lfoOutput, lfoFadeMultiplier]);

  // Pause animation loop when app goes to background to save battery
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;

      if (
        previousState === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // App is going to background
        // Remember if animation was ACTIVELY running (not paused)
        // Check both: isPaused state AND whether animation loop is actually running
        // This ensures we only auto-resume if LFO was truly active
        const animationWasRunning = animationRef.current !== 0;
        const lfoWasRunning = lfoRef.current?.isRunning() ?? false;
        wasRunningBeforeBackgroundRef.current = !isPausedRef.current && animationWasRunning && lfoWasRunning;

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
        // Reset timing to avoid large phase jump (time passed while backgrounded)
        lfoRef.current?.resetTiming();

        // Only resume if:
        // 1. We were actively running before going to background
        // 2. We're still not in a paused state (in case state changed while backgrounded)
        if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
          // Delay animation restart to let UI fades set up first
          // This ensures visualization is hidden before LFO starts moving
          setTimeout(() => {
            // Check again in case state changed during delay
            if (!isPausedRef.current && animationRef.current === 0) {
              // Reset timing again right before restart for accurate delta
              lfoRef.current?.resetTiming();
              // Restart the animation loop
              const animate = (timestamp: number) => {
                if (lfoRef.current) {
                  const state = lfoRef.current.update(timestamp);
                  updatePhaseRef.current(state.phase);
                  lfoOutput.value = state.output;
                  lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
                }
                animationRef.current = requestAnimationFrame(animate);
              };
              animationRef.current = requestAnimationFrame(animate);
            }
          }, 50);
        }
        wasRunningBeforeBackgroundRef.current = false;
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [lfoPhase, lfoOutput, lfoFadeMultiplier]);

  // MIDI auto-connect startup flow: Wait for initial device check, then decide whether to stay paused
  // If auto-connect is enabled but no Digitakt found after initial check, start running
  const hasHandledInitialCheckRef = useRef(false);
  useEffect(() => {
    // Only run once after initial check completes
    if (!midiInitialCheckComplete || hasHandledInitialCheckRef.current) return;
    hasHandledInitialCheckRef.current = true;

    // If auto-connect is enabled but no Digitakt available, start running
    if (autoConnect && !digitaktAvailable && !midiConnected) {
      console.log('[LFO] Auto-connect enabled but no Digitakt found - starting LFO');

      // Start the LFO engine
      lfoRef.current?.trigger();
      lfoRef.current?.resetTiming();
      lfoRef.current?.start();

      // Immediately update shared values
      if (lfoRef.current) {
        const initialState = lfoRef.current.update(performance.now());
        lastTargetPhaseRef.current = initialState.phase;
        lfoPhase.value = initialState.phase;
        lfoOutput.value = initialState.output;
        lfoFadeMultiplier.value = initialState.fadeMultiplier ?? 1;
      }

      setIsPaused(false);

      // Start animation loop if not running
      if (animationRef.current === 0 && hasMainLoopStarted.current) {
        const animate = (timestamp: number) => {
          if (lfoRef.current) {
            const state = lfoRef.current.update(timestamp);
            updatePhaseRef.current(state.phase);
            lfoOutput.value = state.output;
            lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    } else if (autoConnect && digitaktAvailable) {
      console.log('[LFO] Digitakt found - waiting for MIDI transport or user tap');
    }
  }, [midiInitialCheckComplete, autoConnect, digitaktAvailable, midiConnected, lfoPhase, lfoOutput, lfoFadeMultiplier]);

  // MIDI Transport sync - react to external transport start/stop
  const prevTransportRunningRef = useRef<boolean | null>(null);
  const prevMidiConnectedRef = useRef<boolean>(false);
  useEffect(() => {
    // Skip if transport receive is disabled or not connected
    if (!receiveTransport || !midiConnected) {
      prevTransportRunningRef.current = null;
      prevMidiConnectedRef.current = midiConnected;
      return;
    }

    // Handle initial connection - always start paused, wait for transport start or user tap
    const justConnected = midiConnected && !prevMidiConnectedRef.current;
    prevMidiConnectedRef.current = midiConnected;

    if (justConnected) {
      // When MIDI connects, pause the LFO and wait for transport start or user interaction
      console.log('[MIDI] Connected - pausing LFO until transport start or user tap');
      lfoRef.current?.stop();
      setIsPaused(true);
      prevTransportRunningRef.current = transportRunning;
      return;
    }

    if (prevTransportRunningRef.current === null) {
      // First time seeing transport state - just track it, don't change pause state
      prevTransportRunningRef.current = transportRunning;
      return;
    }

    // Detect transport state changes
    if (transportRunning && !prevTransportRunningRef.current) {
      // Transport started - check if it's Start (reset to beginning) or Continue (resume)
      if (lastTransportMessage === 'start') {
        // MIDI Start: Reset LFO to startPhase and start from beginning
        console.log('[MIDI] Start received - resetting LFO to beginning');
        lfoRef.current?.reset();
      } else {
        // MIDI Continue: Resume from current position
        console.log('[MIDI] Continue received - resuming LFO from current position');
      }
      lfoRef.current?.resetTiming(); // Reset timing so next update has deltaMs=0
      lfoRef.current?.start();

      // Immediately update shared values so visualization syncs without waiting for next frame
      if (lfoRef.current) {
        const initialState = lfoRef.current.update(performance.now());
        // Direct assignment for initialization (also resets lastTargetPhaseRef)
        lastTargetPhaseRef.current = initialState.phase;
        lfoPhase.value = initialState.phase;
        lfoOutput.value = initialState.output;
        lfoFadeMultiplier.value = initialState.fadeMultiplier ?? 1;
      }

      setIsPaused(false);

      // Restart animation loop if it was stopped
      if (animationRef.current === 0 && hasMainLoopStarted.current) {
        const animate = (timestamp: number) => {
          if (lfoRef.current) {
            const state = lfoRef.current.update(timestamp);
            updatePhaseRef.current(state.phase);
            lfoOutput.value = state.output;
            lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    } else if (!transportRunning && prevTransportRunningRef.current) {
      // Transport stopped (Stop message received)
      lfoRef.current?.stop();
      setIsPaused(true);
    }

    prevTransportRunningRef.current = transportRunning;
  }, [transportRunning, lastTransportMessage, receiveTransport, midiConnected, lfoPhase, lfoOutput, lfoFadeMultiplier]);

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
    effectiveBpm,
    usingMidiClock: receiveClock && externalBpm > 0,
    usingMidiTransport: receiveTransport && midiConnected,
    // LFO animation state
    lfoPhase,
    lfoOutput,
    lfoFadeMultiplier,
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
    showFillsWhenEditing,
    setShowFillsWhenEditing,
    fadeInOnOpen,
    setFadeInOnOpen,
    fadeInVisualization,
    setFadeInVisualization,
    resetLFOOnChange,
    setResetLFOOnChange,
    // Animation timing settings
    fadeInDuration,
    setFadeInDuration,
    visualizationFadeDuration,
    setVisualizationFadeDuration,
    editFadeOutDuration,
    setEditFadeOutDuration,
    editFadeInDuration,
    setEditFadeInDuration,
    // Visualization settings
    showFadeEnvelope,
    setShowFadeEnvelope,
    depthAnimationDuration,
    setDepthAnimationDuration,
    splashFadeDuration,
    setSplashFadeDuration,
    smoothPhaseAnimation,
    setSmoothPhaseAnimation,
    phaseAnimationDuration,
    setPhaseAnimationDuration,
    tabSwitchFadeOpacity,
    setTabSwitchFadeOpacity,
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
