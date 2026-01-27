import React, { createContext, useRef, useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  AudioContext as AudioContextClass,
  OscillatorNode,
  GainNode,
  BiquadFilterNode,
  StereoPannerNode,
  type AudioContext as AudioContextType,
} from 'react-native-audio-api';
import { usePreset } from './preset-context';
import { useModulation } from './modulation-context';
import type { DestinationId } from '@/src/types/destination';

// Map MIDI values to audio parameters
function midiToGain(value: number): number {
  // 0-127 -> 0-1
  return Math.max(0, Math.min(1, value / 127));
}

function midiToFilterFreq(value: number): number {
  // 0-127 -> 20-20000 Hz (exponential)
  const minFreq = 20;
  const maxFreq = 20000;
  const normalized = Math.max(0, Math.min(1, value / 127));
  return minFreq * Math.pow(maxFreq / minFreq, normalized);
}

function midiToFilterQ(value: number): number {
  // 0-127 -> 0.5-30
  const minQ = 0.5;
  const maxQ = 30;
  const normalized = Math.max(0, Math.min(1, value / 127));
  return minQ + (maxQ - minQ) * normalized;
}

function midiToPan(value: number): number {
  // -64..+63 -> -1..+1
  return Math.max(-1, Math.min(1, value / 63));
}

const BASE_FREQUENCY = 220; // A3

function midiToPitch(value: number, baseFreq: number = BASE_FREQUENCY): number {
  // 0-127 -> semitones from base, where 64 = no change
  // Range: -24 to +24 semitones (4 octaves total)
  const semitones = ((value - 64) / 64) * 24;
  return baseFreq * Math.pow(2, semitones / 12);
}

interface AudioContextValue {
  /** Whether user has toggled audio on (persists through pauses) */
  isEnabled: boolean;
  /** Whether audio is actually producing sound right now */
  isActive: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

const AudioContextReact = createContext<AudioContextValue | null>(null);

// Default gain for sawtooth oscillator (~-9dB to allow modulation headroom)
const DEFAULT_GAIN = 0.35;
const DEFAULT_FILTER_FREQ = 4000;
const DEFAULT_FILTER_Q = 1;
const FADE_DURATION = 0.05; // 50ms fade to prevent click

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { lfoOutput, isPaused } = usePreset();
  const { activeDestinationId, getCenterValue } = useModulation();

  // User toggle state - persists through pauses
  const [isEnabled, setIsEnabled] = useState(false);
  // Whether audio is actually producing sound
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Audio node refs
  const audioContextRef = useRef<AudioContextType | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);

  // Track app state for background handling
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasEnabledBeforeBackgroundRef = useRef(false);
  const animationFrameRef = useRef<number>(0);
  // Timeout for fade-out cleanup
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Operation ID to handle concurrent start/stop calls
  const operationIdRef = useRef(0);

  // Use refs for values accessed in animation loop to avoid stale closures
  const activeDestinationIdRef = useRef<DestinationId>(activeDestinationId);
  const getCenterValueRef = useRef(getCenterValue);

  // Keep refs in sync with state/props
  useEffect(() => {
    activeDestinationIdRef.current = activeDestinationId;
  }, [activeDestinationId]);

  useEffect(() => {
    getCenterValueRef.current = getCenterValue;
  }, [getCenterValue]);

  // Build the audio graph synchronously
  const buildAudioGraph = useCallback((): boolean => {
    try {
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gainNodeRef.current = gain;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = DEFAULT_FILTER_FREQ;
      filter.Q.value = DEFAULT_FILTER_Q;
      filterNodeRef.current = filter;

      const panner = ctx.createStereoPanner();
      panner.pan.value = 0;
      pannerNodeRef.current = panner;

      // Connect: oscillator -> gain -> filter -> panner -> destination
      gain.connect(filter);
      filter.connect(panner);
      panner.connect(ctx.destination);

      return true;
    } catch (error) {
      console.warn('Failed to build audio graph:', error);
      setIsSupported(false);
      return false;
    }
  }, []);

  // Reset all audio parameters to defaults
  const resetAudioParams = useCallback(() => {
    const osc = oscillatorRef.current;
    const gain = gainNodeRef.current;
    const filter = filterNodeRef.current;
    const panner = pannerNodeRef.current;

    if (osc) osc.frequency.value = BASE_FREQUENCY;
    if (gain) gain.gain.value = DEFAULT_GAIN;
    if (filter) {
      filter.frequency.value = DEFAULT_FILTER_FREQ;
      filter.Q.value = DEFAULT_FILTER_Q;
    }
    if (panner) panner.pan.value = 0;
  }, []);

  // Cancel any pending fade timeout
  const cancelFadeTimeout = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
  }, []);

  // Stop oscillator and animation loop
  const stopOscillator = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch {
        // Oscillator may already be stopped
      }
      oscillatorRef.current = null;
    }
  }, []);

  // Animation loop - uses refs to avoid stale closures
  const runAnimationLoop = useCallback(() => {
    const updateAudioParams = () => {
      const ctx = audioContextRef.current;
      const osc = oscillatorRef.current;
      const gain = gainNodeRef.current;
      const filter = filterNodeRef.current;
      const panner = pannerNodeRef.current;

      // Guard against missing audio nodes - exits loop if any are missing
      if (!ctx || !osc || !gain || !filter || !panner) return;

      // Read LFO output - already has depth and fade applied
      const lfoValue = lfoOutput.value;

      // Get current destination and center value from refs
      const destId = activeDestinationIdRef.current;
      const centerValue = getCenterValueRef.current(destId);

      // The LFO output is already scaled by depth (-1 to +1 at max depth)
      const maxMod = 63.5;
      const modulation = lfoValue * maxMod;

      const now = ctx.currentTime;

      switch (destId) {
        case 'volume': {
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(midiToGain(finalValue), now);
          break;
        }
        case 'filter_freq': {
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          filter.frequency.value = midiToFilterFreq(finalValue);
          break;
        }
        case 'filter_reso': {
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          filter.Q.value = midiToFilterQ(finalValue);
          break;
        }
        case 'pan': {
          const finalValue = Math.max(-64, Math.min(63, centerValue + modulation));
          panner.pan.value = midiToPan(finalValue);
          break;
        }
        case 'pitch': {
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          osc.frequency.value = midiToPitch(finalValue);
          break;
        }
        default:
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(DEFAULT_GAIN, now);
          filter.frequency.value = DEFAULT_FILTER_FREQ;
          filter.Q.value = DEFAULT_FILTER_Q;
          panner.pan.value = 0;
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updateAudioParams);
    };

    animationFrameRef.current = requestAnimationFrame(updateAudioParams);
  }, [lfoOutput]);

  // Internal: Activate audio (start oscillator and animation)
  const activateAudio = useCallback(async (opId: number): Promise<boolean> => {
    // Check if this operation is still valid
    if (opId !== operationIdRef.current) return false;

    // Cancel any pending fade and stop existing oscillator
    cancelFadeTimeout();
    stopOscillator();

    // Build graph if needed
    const existingCtx = audioContextRef.current;
    const isContextValid = existingCtx && existingCtx.state !== 'closed';

    if (!isContextValid) {
      if (existingCtx) {
        audioContextRef.current = null;
        gainNodeRef.current = null;
        filterNodeRef.current = null;
        pannerNodeRef.current = null;
      }

      const success = buildAudioGraph();
      if (!success) return false;
    }

    // Check operation still valid after potential async work
    if (opId !== operationIdRef.current) return false;

    try {
      const ctx = audioContextRef.current;
      const gain = gainNodeRef.current;

      if (!ctx || !gain) return false;

      // Resume context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Check operation still valid after async resume
      if (opId !== operationIdRef.current) return false;

      // Create fresh oscillator (Web Audio oscillators are one-shot, can't be restarted)
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = BASE_FREQUENCY;
      osc.connect(gain);
      oscillatorRef.current = osc;

      // Cancel any scheduled gain changes from previous fade-out
      gain.gain.cancelScheduledValues(ctx.currentTime);
      // Start with gain at 0 for fade-in
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.start();

      // Fade in
      gain.gain.linearRampToValueAtTime(DEFAULT_GAIN, ctx.currentTime + FADE_DURATION);

      // Start animation loop
      runAnimationLoop();
      setIsActive(true);

      return true;
    } catch (error) {
      console.warn('Failed to activate audio:', error);
      return false;
    }
  }, [buildAudioGraph, cancelFadeTimeout, stopOscillator, runAnimationLoop]);

  // Internal: Deactivate audio (stop oscillator with fade-out)
  const deactivateAudio = useCallback((opId: number) => {
    // Check if this operation is still valid
    if (opId !== operationIdRef.current) return;

    setIsActive(false);

    // Stop animation loop FIRST so it doesn't interfere with fade-out
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    const ctx = audioContextRef.current;
    const gain = gainNodeRef.current;

    if (!ctx || !gain) {
      stopOscillator();
      return;
    }

    // Fade out (now safe since animation loop is stopped)
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION);

    // Cancel any existing fade timeout
    cancelFadeTimeout();

    // After fade completes, clean up
    fadeTimeoutRef.current = setTimeout(() => {
      fadeTimeoutRef.current = null;
      // Check operation still valid
      if (opId !== operationIdRef.current) return;
      stopOscillator();
      // Suspend context to free resources
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.suspend();
      }
    }, FADE_DURATION * 1000 + 10);
  }, [cancelFadeTimeout, stopOscillator]);

  // User-facing: Start audio (sets enabled state)
  const start = useCallback(() => {
    if (isEnabled) return;
    setIsEnabled(true);
  }, [isEnabled]);

  // User-facing: Stop audio (clears enabled state)
  const stop = useCallback(() => {
    if (!isEnabled) return;
    setIsEnabled(false);
  }, [isEnabled]);

  // User-facing: Toggle audio
  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Effect: Sync audio active state with enabled + paused
  // Audio should be active when: enabled AND not paused AND not backgrounded
  useEffect(() => {
    const shouldBeActive = isEnabled && !isPaused && appStateRef.current === 'active';

    if (shouldBeActive && !isActive) {
      const opId = ++operationIdRef.current;
      activateAudio(opId);
    } else if (!shouldBeActive && isActive) {
      const opId = ++operationIdRef.current;
      deactivateAudio(opId);
    }
  }, [isEnabled, isPaused, isActive, activateAudio, deactivateAudio]);

  // Reset audio params when destination changes
  const prevDestinationRef = useRef<DestinationId>(activeDestinationId);
  useEffect(() => {
    if (isActive && prevDestinationRef.current !== activeDestinationId) {
      resetAudioParams();
    }
    prevDestinationRef.current = activeDestinationId;
  }, [activeDestinationId, isActive, resetAudioParams]);

  // Handle app background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        previousState === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // Going to background
        wasEnabledBeforeBackgroundRef.current = isEnabled;
        if (isActive) {
          const opId = ++operationIdRef.current;
          deactivateAudio(opId);
        }
      } else if (
        (previousState === 'inactive' || previousState === 'background') &&
        nextAppState === 'active'
      ) {
        // Coming back to foreground
        if (wasEnabledBeforeBackgroundRef.current && isEnabled && !isPaused) {
          const opId = ++operationIdRef.current;
          activateAudio(opId);
        }
        wasEnabledBeforeBackgroundRef.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isEnabled, isActive, isPaused, activateAudio, deactivateAudio]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Increment operation ID to invalidate any pending operations
      operationIdRef.current++;
      cancelFadeTimeout();
      stopOscillator();

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [cancelFadeTimeout, stopOscillator]);

  const value: AudioContextValue = {
    isEnabled,
    isActive,
    isSupported,
    start,
    stop,
    toggle,
  };

  return (
    <AudioContextReact value={value}>
      {children}
    </AudioContextReact>
  );
}

export function useAudio() {
  const context = React.use(AudioContextReact);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
