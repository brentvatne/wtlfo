import React, { createContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSharedValue, useFrameCallback, Easing, cancelAnimation, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LFO, calculateTimingInfo } from 'elektron-lfo';
import { PRESETS, type LFOPreset, type LFOPresetConfig } from '@/src/data/presets';
import { useMidi } from '@/src/context/midi-context';
import * as Settings from '@/src/services/settings';

const ENGINE_DEBOUNCE_MS = 100;

// Re-export defaults for use in settings screen reset logic
export const DEFAULT_FADE_IN_DURATION = Settings.DEFAULTS.fadeInDuration;
export const DEFAULT_VISUALIZATION_FADE_DURATION = Settings.DEFAULTS.visualizationFadeDuration;
export const DEFAULT_EDIT_FADE_OUT = Settings.DEFAULTS.editFadeOutDuration;
export const DEFAULT_EDIT_FADE_IN = Settings.DEFAULTS.editFadeInDuration;
export const DEFAULT_DEPTH_ANIM_DURATION = Settings.DEFAULTS.depthAnimationDuration;
export const DEFAULT_PRESET_SWITCH_DURATION = Settings.DEFAULTS.presetSwitchDuration;
export const DEFAULT_PHASE_ANIMATION_DURATION = Settings.DEFAULTS.phaseAnimationDuration;
export const DEFAULT_TAB_SWITCH_FADE_OPACITY = Settings.DEFAULTS.tabSwitchFadeOpacity;

// Load saved config or fall back to preset defaults
function getInitialConfig(presetIndex: number): LFOPresetConfig {
  const saved = Settings.getJSON<LFOPresetConfig | null>('currentConfig', null);
  if (saved !== null) {
    // Validate the parsed config has all required fields
    if (
      typeof saved.waveform === 'string' &&
      typeof saved.speed === 'number' &&
      typeof saved.depth === 'number' &&
      typeof saved.fade === 'number'
    ) {
      return saved;
    }
  }
  return { ...PRESETS[presetIndex].config };
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

  // LFO animation state - shared across tabs
  lfoPhase: SharedValue<number>;
  lfoOutput: SharedValue<number>;
  lfoFadeMultiplier: SharedValue<number>;
  lfoCycleCount: SharedValue<number>;
  lfoRef: React.MutableRefObject<LFO | null>;
  timingInfo: TimingInfo;

  // LFO control methods
  triggerLFO: () => void;
  startLFO: () => void;
  stopLFO: () => void;
  resetLFOTiming: () => void;
  isLFORunning: () => boolean;

  // Pause state for UI
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;

  // Settings
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
  presetSwitchDuration: number;
  setPresetSwitchDuration: (duration: number) => void;
  smoothPhaseAnimation: boolean;
  setSmoothPhaseAnimation: (enabled: boolean) => void;
  phaseAnimationDuration: number;
  setPhaseAnimationDuration: (duration: number) => void;
  tabSwitchFadeOpacity: number;
  setTabSwitchFadeOpacity: (opacity: number) => void;

  // Preset transition state
  isChangingPreset: boolean;
  /** Change preset with crossfade transition */
  changePresetWithTransition: (index: number) => void;
  /** Previous config for crossfade - null when not transitioning */
  previousConfig: LFOPresetConfig | null;
  /** Crossfade opacity (1 = showing old, 0 = showing new) */
  crossfadeOpacity: SharedValue<number>;
  /** Signal that crossfade animation has completed */
  finishPresetTransition: () => void;
}

const PresetContext = createContext<PresetContextValue | null>(null);

// Compute initial values ONCE, outside the component, to ensure consistency
// Settings are pre-cached at module load by the settings service
function getInitialPresetIndex(): number {
  const saved = Settings.getNumber('activePreset', 0);
  if (saved >= 0 && saved < PRESETS.length) {
    return saved;
  }
  return 0;
}

const INITIAL_PRESET_INDEX = getInitialPresetIndex();
const INITIAL_CONFIG = getInitialConfig(INITIAL_PRESET_INDEX);
const INITIAL_BPM = Settings.getNumber('bpm', Settings.DEFAULTS.bpm);
const INITIAL_START_PHASE = INITIAL_CONFIG.startPhase / 128;
const INITIAL_SHOW_FILLS = Settings.getBoolean('showFillsWhenEditing', Settings.DEFAULTS.showFillsWhenEditing);
const INITIAL_FADE_IN = Settings.getBoolean('fadeInOnOpen', Settings.DEFAULTS.fadeInOnOpen);
const INITIAL_VISUALIZATION_FADE = Settings.getBoolean('fadeInVisualization', Settings.DEFAULTS.fadeInVisualization);
const INITIAL_RESET_LFO = Settings.getBoolean('resetLFOOnChange', Settings.DEFAULTS.resetLFOOnChange);
const INITIAL_FADE_IN_DURATION = Settings.getNumber('fadeInDuration', Settings.DEFAULTS.fadeInDuration);
const INITIAL_VISUALIZATION_FADE_DURATION = Settings.getNumber('visualizationFadeDuration', Settings.DEFAULTS.visualizationFadeDuration);
const INITIAL_EDIT_FADE_OUT = Settings.getNumber('editFadeOutDuration', Settings.DEFAULTS.editFadeOutDuration);
const INITIAL_EDIT_FADE_IN = Settings.getNumber('editFadeInDuration', Settings.DEFAULTS.editFadeInDuration);
const INITIAL_SHOW_FADE_ENVELOPE = Settings.getBoolean('showFadeEnvelope', Settings.DEFAULTS.showFadeEnvelope);
const INITIAL_DEPTH_ANIM_DURATION = Settings.getNumber('depthAnimationDuration', Settings.DEFAULTS.depthAnimationDuration);
const INITIAL_PRESET_SWITCH_DURATION = Settings.getNumber('presetSwitchDuration', Settings.DEFAULTS.presetSwitchDuration);
const INITIAL_SMOOTH_PHASE_ANIMATION = Settings.getBoolean('smoothPhaseAnimation', Settings.DEFAULTS.smoothPhaseAnimation);
const INITIAL_PHASE_ANIMATION_DURATION = Settings.getNumber('phaseAnimationDuration', Settings.DEFAULTS.phaseAnimationDuration);
const INITIAL_TAB_SWITCH_FADE_OPACITY = Settings.getFloat('tabSwitchFadeOpacity', Settings.DEFAULTS.tabSwitchFadeOpacity);

export function PresetProvider({ children }: { children: React.ReactNode }) {
  // MIDI clock sync - only use external BPM when connected and enabled
  const { externalBpm, receiveClock } = useMidi();

  const [activePreset, setActivePresetState] = useState(INITIAL_PRESET_INDEX);
  const [currentConfig, setCurrentConfig] = useState<LFOPresetConfig>(() => ({ ...INITIAL_CONFIG }));
  const [debouncedConfig, setDebouncedConfig] = useState<LFOPresetConfig>(() => ({ ...INITIAL_CONFIG }));
  const [bpm, setBPMState] = useState(INITIAL_BPM);

  // Effective BPM: use external MIDI clock when enabled and available
  const effectiveBpm = receiveClock && externalBpm > 0 ? Math.round(externalBpm) : bpm;
  const [isEditing, setIsEditing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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
  const [presetSwitchDuration, setPresetSwitchDurationState] = useState(INITIAL_PRESET_SWITCH_DURATION);
  const [smoothPhaseAnimation, setSmoothPhaseAnimationState] = useState(INITIAL_SMOOTH_PHASE_ANIMATION);
  const [phaseAnimationDuration, setPhaseAnimationDurationState] = useState(INITIAL_PHASE_ANIMATION_DURATION);
  const [tabSwitchFadeOpacity, setTabSwitchFadeOpacityState] = useState(INITIAL_TAB_SWITCH_FADE_OPACITY);
  const [isChangingPreset, setIsChangingPreset] = useState(false);
  const [previousConfig, setPreviousConfig] = useState<LFOPresetConfig | null>(null);
  const crossfadeOpacity = useSharedValue(0); // 0 = showing new, 1 = showing old
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LFO animation state - persists across tab switches
  // Initialize phase to match the preset's startPhase to avoid first-frame jump
  const lfoPhase = useSharedValue(INITIAL_START_PHASE);
  const lfoOutput = useSharedValue(0);
  const lfoFadeMultiplier = useSharedValue(1);
  const lfoCycleCount = useSharedValue(0);

  // Phase animation state for precomputed UI-thread animation
  // These SharedValues control the phase animation without JS thread involvement
  const phaseStartTime = useSharedValue(0); // timestamp when animation started
  const phaseStartValue = useSharedValue(INITIAL_START_PHASE); // phase value at start
  const phaseCycleMs = useSharedValue(1000); // cycle duration in ms
  // Mode for one-shot animations: 0=loop, 1=ONE (stop at 1 cycle), 2=HLF (stop at 0.5 cycle)
  const phaseAnimationMode = useSharedValue(INITIAL_CONFIG.mode === 'ONE' ? 1 : INITIAL_CONFIG.mode === 'HLF' ? 2 : 0);
  // Progress already made before current animation segment (for pause/resume in ONE/HLF modes)
  // When resuming mid-cycle, this tracks how much of the cycle was already completed
  const phaseInitialProgress = useSharedValue(0);

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

  // Track whether we're in a preset transition (for idempotent finish)
  const isTransitioningRef = useRef(false);

  // Persist config to storage (debounced, then deferred to idle by settings service)
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    // Debounce persistence (500ms) - settings service handles idle callback
    persistTimeoutRef.current = setTimeout(() => {
      Settings.setJSON('currentConfig', currentConfig);
    }, 500);

    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [currentConfig]);

  const setActivePreset = useCallback((index: number) => {
    setActivePresetState(index);
    // Persist to storage (deferred to idle time by settings service)
    Settings.setNumber('activePreset', index);
    // Clear saved config so preset defaults are used on next load
    Settings.setJSON('currentConfig', null);
  }, []);

  // Change preset with Skia-native crossfade transition
  // Stores current config, immediately applies new preset, and animates opacity
  // Always unpauses - fresh preset starts fresh
  const changePresetWithTransition = useCallback((index: number) => {
    // Store the current config for crossfade (the "old" visualization)
    setPreviousConfig({ ...currentConfig });
    setIsChangingPreset(true);
    isTransitioningRef.current = true;

    // Always unpause when switching presets - set both state and ref
    // Ref must be set synchronously so config change effects see it immediately
    setIsPaused(false);
    isPausedRef.current = false;

    // Set opacity to 1 (showing old) then animate to 0 (showing new)
    crossfadeOpacity.value = 1;
    crossfadeOpacity.value = withTiming(0, {
      duration: presetSwitchDuration,
      easing: Easing.out(Easing.ease),
    });

    // Actually change the preset immediately
    setActivePresetState(index);
    // Persist to storage (deferred to idle time by settings service)
    Settings.setNumber('activePreset', index);
    Settings.setJSON('currentConfig', null);
  }, [currentConfig, crossfadeOpacity, presetSwitchDuration]);

  // Called when crossfade animation completes - clears the previous config
  // Idempotent: safe to call multiple times (e.g., from worklet)
  const finishPresetTransition = useCallback(() => {
    if (!isTransitioningRef.current) return; // Already finished
    isTransitioningRef.current = false;
    setPreviousConfig(null);
    setIsChangingPreset(false);
  }, []);

  const setBPM = useCallback((newBPM: number) => {
    const clampedBPM = Math.max(30, Math.min(300, Math.round(newBPM)));
    setBPMState(clampedBPM);
    Settings.setNumber('bpm', clampedBPM);
  }, []);

  const setShowFillsWhenEditing = useCallback((show: boolean) => {
    setShowFillsWhenEditingState(show);
    Settings.setBoolean('showFillsWhenEditing', show);
  }, []);

  const setFadeInOnOpen = useCallback((fade: boolean) => {
    setFadeInOnOpenState(fade);
    Settings.setBoolean('fadeInOnOpen', fade);
  }, []);

  const setFadeInVisualization = useCallback((fade: boolean) => {
    setFadeInVisualizationState(fade);
    Settings.setBoolean('fadeInVisualization', fade);
  }, []);

  const setResetLFOOnChange = useCallback((reset: boolean) => {
    setResetLFOOnChangeState(reset);
    Settings.setBoolean('resetLFOOnChange', reset);
  }, []);

  const setFadeInDuration = useCallback((duration: number) => {
    setFadeInDurationState(duration);
    Settings.setNumber('fadeInDuration', duration);
  }, []);

  const setVisualizationFadeDuration = useCallback((duration: number) => {
    setVisualizationFadeDurationState(duration);
    Settings.setNumber('visualizationFadeDuration', duration);
  }, []);

  const setEditFadeOutDuration = useCallback((duration: number) => {
    setEditFadeOutDurationState(duration);
    Settings.setNumber('editFadeOutDuration', duration);
  }, []);

  const setEditFadeInDuration = useCallback((duration: number) => {
    setEditFadeInDurationState(duration);
    Settings.setNumber('editFadeInDuration', duration);
  }, []);

  const setShowFadeEnvelope = useCallback((show: boolean) => {
    setShowFadeEnvelopeState(show);
    Settings.setBoolean('showFadeEnvelope', show);
  }, []);

  const setDepthAnimationDuration = useCallback((duration: number) => {
    setDepthAnimationDurationState(duration);
    Settings.setNumber('depthAnimationDuration', duration);
  }, []);

  const setPresetSwitchDuration = useCallback((duration: number) => {
    setPresetSwitchDurationState(duration);
    Settings.setNumber('presetSwitchDuration', duration);
  }, []);

  const setSmoothPhaseAnimation = useCallback((enabled: boolean) => {
    setSmoothPhaseAnimationState(enabled);
    Settings.setBoolean('smoothPhaseAnimation', enabled);
  }, []);

  const setPhaseAnimationDuration = useCallback((duration: number) => {
    setPhaseAnimationDurationState(duration);
    Settings.setNumber('phaseAnimationDuration', duration);
  }, []);

  const setTabSwitchFadeOpacity = useCallback((opacity: number) => {
    setTabSwitchFadeOpacityState(opacity);
    Settings.setNumber('tabSwitchFadeOpacity', opacity);
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

  // UI-thread phase animation via useFrameCallback
  // This runs every frame on the UI thread without JS involvement
  const frameCallback = useFrameCallback((frameInfo) => {
    'worklet';
    // Initialize start time on first frame
    if (phaseStartTime.value === 0) {
      phaseStartTime.value = frameInfo.timestamp;
    }

    // Calculate elapsed time since animation started
    const elapsed = frameInfo.timestamp - phaseStartTime.value;

    // Calculate phase progress for this animation segment
    const phaseProgress = elapsed / phaseCycleMs.value;

    // Total progress includes any progress made before pause (for ONE/HLF resume)
    const totalProgress = phaseInitialProgress.value + phaseProgress;

    // Handle one-shot modes (ONE and HLF)
    const mode = phaseAnimationMode.value;
    if (mode === 1 && totalProgress >= 1) {
      // ONE mode: stop at end of one full cycle
      // Calculate remaining distance from when this animation segment started
      const remaining = 1 - phaseInitialProgress.value;
      // Use remaining - epsilon to keep indicator at visual end position
      lfoPhase.value = (phaseStartValue.value + remaining - 0.0001) % 1;
      return; // Stop updating - frameCallback stays active but phase is frozen
    } else if (mode === 2 && totalProgress >= 0.5) {
      // HLF mode: stop at half cycle
      const remaining = 0.5 - phaseInitialProgress.value;
      lfoPhase.value = (phaseStartValue.value + remaining) % 1;
      return; // Stop updating - frameCallback stays active but phase is frozen
    }

    // Normal looping: wrap phase at 1
    const newPhase = (phaseStartValue.value + phaseProgress) % 1;

    // Update cycle count - totalProgress is cumulative, so floor gives completed cycles
    lfoCycleCount.value = Math.floor(totalProgress);

    lfoPhase.value = newPhase;
  }, true); // true = autostart

  // Start/restart phase animation by updating the shared control values
  // mode: 'FRE'|'TRG'|'HLD' = loop, 'ONE' = one cycle, 'HLF' = half cycle
  // initialProgress: for resume mid-cycle, how much progress was already made (0-1)
  const startPhaseAnimation = useCallback((startFromPhase: number, cycleDurationMs: number, mode?: string, initialProgress?: number) => {
    // Cancel any existing withTiming animation on lfoPhase
    cancelAnimation(lfoPhase);
    // Set initial phase value
    lfoPhase.value = startFromPhase;
    // Configure the animation parameters
    phaseStartValue.value = startFromPhase;
    phaseCycleMs.value = cycleDurationMs;
    // Set animation mode: 0=loop, 1=ONE, 2=HLF
    phaseAnimationMode.value = mode === 'ONE' ? 1 : mode === 'HLF' ? 2 : 0;
    // Set initial progress (for resume mid-cycle in ONE/HLF modes)
    phaseInitialProgress.value = initialProgress ?? 0;
    // Reset start time to 0 - the frame callback will set it on first frame
    phaseStartTime.value = 0;
    // Activate the frame callback
    frameCallback.setActive(true);
  }, [lfoPhase, phaseStartValue, phaseCycleMs, phaseAnimationMode, phaseInitialProgress, phaseStartTime, frameCallback]);

  // Stop phase animation (for pause, background, editing)
  const stopPhaseAnimation = useCallback(() => {
    frameCallback.setActive(false);
  }, [frameCallback]);

  // Ref to track isEditing for coordination (avoids stale closure issues)
  const isEditingRef = useRef(false);
  // Ref to track if we've already handled config change in this cycle (prevents double trigger)
  const hasHandledConfigChangeRef = useRef(false);

  // Coordinate LFO stop/start with editing fade animations
  // Flow: fade out → stop LFO → (editing happens) → reset LFO → start LFO → fade in
  // Ref for fade-out timeout
  const fadeOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coordinate LFO stop/start with editing fade animations
  // Always hide values while editing (no longer a toggle)
  useEffect(() => {
    isEditingRef.current = isEditing;

    if (isEditing) {
      // Editing started: wait for fade-out to complete, then stop LFO
      fadeOutTimeoutRef.current = setTimeout(() => {
        // Stop the animation loop after fade-out completes
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
        }
        // Also pause the phase animation
        stopPhaseAnimation();
      }, editFadeOutDuration);
    } else {
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

      // Reset and get the correct initial state - but NOT if paused
      // When paused, user wants to see current position, not have it jump around
      if (resetLFOOnChange && !isPausedRef.current) {
        // Trigger resets to startPhase
        lfoRef.current.trigger();
        // Get the actual initial state from the new LFO
        const initialState = lfoRef.current.update(performance.now());
        lfoOutput.value = initialState.output;
        lfoFadeMultiplier.value = initialState.fadeMultiplier ?? 1;
        // Reset cycle count so RND waveform regenerates from fresh seed
        lfoCycleCount.value = 0;

        const newTimingInfo = calculateTimingInfo(currentConfig, effectiveBpm);
        startPhaseAnimation(initialState.phase, newTimingInfo.cycleTimeMs, currentConfig.mode);
      }

      // Mark that we've handled this config change to prevent double trigger
      hasHandledConfigChangeRef.current = true;

      // Sync debouncedConfig to prevent the recreation effect from running again
      setDebouncedConfig({ ...currentConfig });

      // Restart animation loop if it was stopped (for output/fadeMultiplier updates)
      if (animationRef.current === 0 && hasMainLoopStarted.current && !isPausedRef.current) {
        const animate = (timestamp: number) => {
          if (lfoRef.current) {
            const state = lfoRef.current.update(timestamp);
            // Phase is driven by precomputed animation
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
  }, [isEditing, editFadeOutDuration, resetLFOOnChange, currentConfig, effectiveBpm, lfoOutput, startPhaseAnimation, stopPhaseAnimation, lfoCycleCount]);

  // Handle pause/unpause state changes
  // This handles tab switches, manual pause, and returning from background
  const wasPausedRef = useRef(false);
  useEffect(() => {
    const wasPaused = wasPausedRef.current;
    wasPausedRef.current = isPaused;

    if (isPaused && !wasPaused) {
      // Just became paused - stop the phase animation
      stopPhaseAnimation();
    } else if (!isPaused && wasPaused && hasMainLoopStarted.current) {
      // Just became unpaused - restart the phase animation
      const currentPhase = lfoPhase.value;

      // For ONE/HLF modes, calculate how much progress was already made
      // This ensures we complete the remaining cycle portion, not a full cycle
      let initialProgress: number | undefined;
      if (currentConfig.mode === 'ONE' || currentConfig.mode === 'HLF') {
        const startPhase = currentConfig.startPhase / 128;
        // Calculate how far we've traveled from the original start phase
        // Handle wrap-around correctly
        const traveled = ((currentPhase - startPhase) % 1 + 1) % 1;
        initialProgress = traveled;
      }

      startPhaseAnimation(currentPhase, timingInfo.cycleTimeMs, currentConfig.mode, initialProgress);

      // Also restart the rAF loop if it was stopped (e.g., from background)
      if (animationRef.current === 0) {
        const animate = (timestamp: number) => {
          if (lfoRef.current) {
            const state = lfoRef.current.update(timestamp);
            lfoOutput.value = state.output;
            lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    }
  }, [isPaused, lfoPhase, lfoOutput, lfoFadeMultiplier, startPhaseAnimation, stopPhaseAnimation, timingInfo.cycleTimeMs, currentConfig.mode, currentConfig.startPhase]);

  // Recreate LFO when debounced config changes (after initial creation)
  // Skip on first render - LFO is already created synchronously above
  useEffect(() => {
    // Skip on first render - LFO already exists
    if (isInitialLFOCreation.current) {
      isInitialLFOCreation.current = false;
      return;
    }

    // Skip if we already handled this config change in the editing coordination effect
    if (hasHandledConfigChangeRef.current) {
      hasHandledConfigChangeRef.current = false;
      return;
    }

    lfoRef.current = new LFO(debouncedConfig, effectiveBpm);

    // Note: timing info is now computed live from currentConfig via useMemo,
    // so no need to update it here

    // Only reset phase/output and trigger if resetLFOOnChange is enabled AND not paused
    // When paused, user wants to see current position, not have it jump around
    if (resetLFOOnChange && !isPausedRef.current) {
      // Trigger resets to startPhase
      lfoRef.current.trigger();
      // Get the actual initial state (don't assume output is 0 - it depends on waveform)
      const initialState = lfoRef.current.update(performance.now());
      lfoOutput.value = initialState.output;
      lfoFadeMultiplier.value = initialState.fadeMultiplier ?? 1;
      // Reset cycle count so RND waveform regenerates from fresh seed
      lfoCycleCount.value = 0;

      const newTimingInfo = calculateTimingInfo(debouncedConfig, effectiveBpm);
      startPhaseAnimation(initialState.phase, newTimingInfo.cycleTimeMs, debouncedConfig.mode);
    }
  }, [debouncedConfig, effectiveBpm, lfoPhase, lfoOutput, lfoFadeMultiplier, resetLFOOnChange, startPhaseAnimation]);

  // Animation loop - runs at provider level, independent of tabs
  // Phase is now precomputed via withRepeat, so this loop only updates output/fadeMultiplier
  // Track if this effect has run before (to distinguish initial mount from re-runs)
  const isInitialAnimationMount = useRef(true);
  useEffect(() => {
    const isInitialRun = isInitialAnimationMount.current;
    if (isInitialAnimationMount.current) {
      isInitialAnimationMount.current = false;
    }
    hasMainLoopStarted.current = true;

    // Start/restart the precomputed phase animation
    // On initial mount, always start. On re-runs (e.g., timing change), respect pause state.
    if (isInitialRun || !isPausedRef.current) {
      const startPhase = currentConfig.startPhase / 128;
      startPhaseAnimation(startPhase, timingInfo.cycleTimeMs, currentConfig.mode);
    }

    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        // Phase is now driven by precomputed animation, not engine
        // Only update output and fadeMultiplier from engine
        lfoOutput.value = state.output;
        lfoFadeMultiplier.value = state.fadeMultiplier ?? 1;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      // Note: Don't stop phase animation here - useFrameCallback handles its own lifecycle
      // and stopping it here would prevent it from running when switching tabs
    };
  }, [lfoPhase, lfoOutput, lfoFadeMultiplier, startPhaseAnimation, currentConfig.startPhase, timingInfo.cycleTimeMs]);

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

        // Stop the animation loop and phase animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
        }
        stopPhaseAnimation();
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
              // Reset cycle count so RND waveform regenerates from fresh seed
              lfoCycleCount.value = 0;
              // Restart precomputed phase animation from startPhase
              const startPhase = currentConfig.startPhase / 128;
              startPhaseAnimation(startPhase, timingInfo.cycleTimeMs, currentConfig.mode);
              // Restart the animation loop for output/fadeMultiplier
              const animate = (timestamp: number) => {
                if (lfoRef.current) {
                  const state = lfoRef.current.update(timestamp);
                  // Phase is driven by precomputed animation
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
  }, [lfoPhase, lfoOutput, lfoFadeMultiplier, startPhaseAnimation, stopPhaseAnimation, currentConfig.startPhase, timingInfo.cycleTimeMs]);

  // LFO control methods
  const triggerLFO = useCallback(() => {
    // Trigger resets the LFO to startPhase
    lfoRef.current?.trigger();
    // Reset cycle count so RND waveform regenerates from fresh seed
    lfoCycleCount.value = 0;
    // Also restart the phase animation from startPhase
    const startPhase = currentConfig.startPhase / 128;
    startPhaseAnimation(startPhase, timingInfo.cycleTimeMs, currentConfig.mode);
  }, [currentConfig.startPhase, currentConfig.mode, timingInfo.cycleTimeMs, startPhaseAnimation, lfoCycleCount]);
  const startLFO = useCallback(() => lfoRef.current?.start(), []);
  const stopLFO = useCallback(() => lfoRef.current?.stop(), []);
  const resetLFOTiming = useCallback(() => lfoRef.current?.resetTiming(), []);
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
    // LFO animation state
    lfoPhase,
    lfoOutput,
    lfoFadeMultiplier,
    lfoCycleCount,
    lfoRef,
    timingInfo,
    // LFO control
    triggerLFO,
    startLFO,
    stopLFO,
    resetLFOTiming,
    isLFORunning,
    isPaused,
    setIsPaused,
    // Settings
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
    presetSwitchDuration,
    setPresetSwitchDuration,
    smoothPhaseAnimation,
    setSmoothPhaseAnimation,
    phaseAnimationDuration,
    setPhaseAnimationDuration,
    tabSwitchFadeOpacity,
    setTabSwitchFadeOpacity,
    // Preset transition
    isChangingPreset,
    changePresetWithTransition,
    previousConfig,
    crossfadeOpacity,
    finishPresetTransition,
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
