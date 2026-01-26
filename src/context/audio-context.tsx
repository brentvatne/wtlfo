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

// Destinations that can be meaningfully mapped to audio parameters
type AudioDestination = 'volume' | 'filter_freq' | 'filter_reso' | 'pan' | 'pitch';

const AUDIO_DESTINATIONS: Set<DestinationId> = new Set([
  'volume',
  'filter_freq',
  'filter_reso',
  'pan',
  'pitch',
]);

// Helper to yield during idle time (falls back to setTimeout if not available)
function nextIdle(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve());
    } else {
      setTimeout(() => resolve(), 0);
    }
  });
}

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
  isPlaying: boolean;
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
const FADE_IN_DURATION = 0.05; // 50ms fade-in to prevent click
const FADE_OUT_DURATION = 0.05; // 50ms fade-out to prevent click

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { lfoOutput, currentConfig, lfoFadeMultiplier, isPaused } = usePreset();
  const { activeDestinationId, getCenterValue } = useModulation();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Use ref instead of state to avoid re-renders during initialization
  const isInitializingRef = useRef(false);

  // Cancellation flag for chunked initialization
  const initCancelledRef = useRef(false);

  // Track if audio graph has been built (persistent across toggles)
  const audioGraphReadyRef = useRef(false);

  // Audio node refs
  const audioContextRef = useRef<AudioContextType | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);

  // Track app state for background handling
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasPlayingBeforeBackgroundRef = useRef(false);
  const animationFrameRef = useRef<number>(0);
  // Track if audio was stopped due to LFO pause (not user toggle)
  const stoppedDueToPauseRef = useRef(false);

  // Build the audio graph with chunked initialization to prevent frame drops
  // Each step yields during idle time via requestIdleCallback
  // This only builds the persistent nodes (gain, filter, panner) - oscillator is created on each start
  const buildAudioGraphChunked = useCallback(async (): Promise<boolean> => {
    try {
      // Step 1: Create audio context
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      await nextIdle();
      if (initCancelledRef.current) return false;

      // Step 2: Create gain node (start at 0 for fade-in)
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gainNodeRef.current = gain;

      await nextIdle();
      if (initCancelledRef.current) return false;

      // Step 3: Create filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = DEFAULT_FILTER_FREQ;
      filter.Q.value = DEFAULT_FILTER_Q;
      filterNodeRef.current = filter;

      await nextIdle();
      if (initCancelledRef.current) return false;

      // Step 4: Create panner
      const panner = ctx.createStereoPanner();
      panner.pan.value = 0;
      pannerNodeRef.current = panner;

      await nextIdle();
      if (initCancelledRef.current) return false;

      // Step 5: Connect persistent nodes (oscillator connects to gain on start)
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

  // Reset all audio parameters to defaults (used when destination changes)
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

  // Stop oscillator only (keeps audio graph alive for quick restart)
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

  // Fully destroy audio graph (only on unmount)
  const destroyAudioGraph = useCallback(() => {
    stopOscillator();

    gainNodeRef.current = null;
    filterNodeRef.current = null;
    pannerNodeRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioGraphReadyRef.current = false;
  }, [stopOscillator]);

  // Update audio parameters based on LFO output
  const updateAudioParams = useCallback(() => {
    if (!isPlaying) return;

    const osc = oscillatorRef.current;
    const gain = gainNodeRef.current;
    const filter = filterNodeRef.current;
    const panner = pannerNodeRef.current;

    if (!osc || !gain || !filter || !panner) return;

    // Get LFO modulation (already scaled by depth from preset context)
    const lfoValue = lfoOutput.value;
    const fadeMultiplier = lfoFadeMultiplier.value ?? 1;
    const scaledLfo = lfoValue * fadeMultiplier;

    // Calculate modulation based on destination and center value
    const centerValue = getCenterValue(activeDestinationId);
    const depth = currentConfig.depth;
    // Depth is -64 to +63, scale to -1 to +1
    const depthScale = Math.max(-1, Math.min(1, depth / 63));

    // Modulation amount: LFO output * depth scale * parameter range
    // lfoOutput is already normalized to -1 to +1 based on waveform

    switch (activeDestinationId) {
      case 'volume': {
        // Volume: 0-127 MIDI range, center typically around 100
        const maxMod = 63.5; // Half the MIDI range
        const modulation = scaledLfo * depthScale * maxMod;
        const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
        gain.gain.value = midiToGain(finalValue);
        break;
      }
      case 'filter_freq': {
        // Filter freq: 0-127 MIDI range
        const maxMod = 63.5;
        const modulation = scaledLfo * depthScale * maxMod;
        const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
        filter.frequency.value = midiToFilterFreq(finalValue);
        break;
      }
      case 'filter_reso': {
        // Filter resonance: 0-127 MIDI range
        const maxMod = 63.5;
        const modulation = scaledLfo * depthScale * maxMod;
        const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
        filter.Q.value = midiToFilterQ(finalValue);
        break;
      }
      case 'pan': {
        // Pan: -64 to +63 MIDI range (bipolar)
        const maxMod = 63.5;
        const modulation = scaledLfo * depthScale * maxMod;
        const finalValue = Math.max(-64, Math.min(63, centerValue + modulation));
        panner.pan.value = midiToPan(finalValue);
        break;
      }
      case 'pitch': {
        // Pitch: 0-127 MIDI range, 64 = no change from base frequency
        const maxMod = 63.5;
        const modulation = scaledLfo * depthScale * maxMod;
        const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
        osc.frequency.value = midiToPitch(finalValue);
        break;
      }
      default:
        // For non-audio destinations, just play with default params
        gain.gain.value = DEFAULT_GAIN;
        filter.frequency.value = DEFAULT_FILTER_FREQ;
        filter.Q.value = DEFAULT_FILTER_Q;
        panner.pan.value = 0;
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateAudioParams);
  }, [isPlaying, activeDestinationId, getCenterValue, currentConfig.depth, lfoOutput, lfoFadeMultiplier]);

  // Start audio - builds graph on first call, then reuses it
  const start = useCallback(async () => {
    if (isPlaying || isInitializingRef.current) return;

    const ctx = audioContextRef.current;

    // Build graph on first start (subsequent starts reuse it)
    if (!audioGraphReadyRef.current) {
      isInitializingRef.current = true;
      initCancelledRef.current = false;

      const success = await buildAudioGraphChunked();

      if (initCancelledRef.current || !success) {
        isInitializingRef.current = false;
        if (initCancelledRef.current) {
          destroyAudioGraph();
        }
        return;
      }

      audioGraphReadyRef.current = true;
      isInitializingRef.current = false;
    }

    try {
      const audioCtx = audioContextRef.current;
      const gain = gainNodeRef.current;

      if (!audioCtx || !gain) return;

      // Resume context if suspended
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Create fresh oscillator (cheap operation)
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = BASE_FREQUENCY;
      osc.connect(gain);
      oscillatorRef.current = osc;

      // Start with gain at 0 for fade-in
      gain.gain.value = 0;
      osc.start();

      // Fade in to prevent click
      gain.gain.linearRampToValueAtTime(DEFAULT_GAIN, audioCtx.currentTime + FADE_IN_DURATION);

      setIsPlaying(true);
    } catch (error) {
      console.warn('Failed to start audio:', error);
    }
  }, [isPlaying, buildAudioGraphChunked, destroyAudioGraph]);

  // Stop audio with fade-out (keeps audio graph alive for quick restart)
  const stop = useCallback(() => {
    // Cancel any in-progress initialization
    if (isInitializingRef.current) {
      initCancelledRef.current = true;
    }

    if (!isPlaying && !isInitializingRef.current) return;

    stoppedDueToPauseRef.current = false; // User explicitly stopped
    setIsPlaying(false);

    const ctx = audioContextRef.current;
    const gain = gainNodeRef.current;

    if (!ctx || !gain) {
      stopOscillator();
      return;
    }

    // Fade out to prevent click
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_DURATION);

    // After fade completes, stop oscillator and suspend context
    setTimeout(() => {
      stopOscillator();
      // Suspend context to free resources but keep graph alive
      ctx.suspend();
    }, FADE_OUT_DURATION * 1000 + 10);
  }, [isPlaying, stopOscillator]);

  // Toggle audio
  const toggle = useCallback(() => {
    if (isPlaying || isInitializingRef.current) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  // Start update loop when playing
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateAudioParams);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [isPlaying, updateAudioParams]);

  // Stop audio when LFO is paused (but keep toggle state and audio graph)
  useEffect(() => {
    if (isPaused && isPlaying && oscillatorRef.current) {
      stoppedDueToPauseRef.current = true;

      const ctx = audioContextRef.current;
      const gain = gainNodeRef.current;

      if (ctx && gain) {
        // Fade out then stop oscillator and suspend
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_DURATION);
        setTimeout(() => {
          stopOscillator();
          ctx.suspend();
        }, FADE_OUT_DURATION * 1000 + 10);
      } else {
        stopOscillator();
      }
    }
  }, [isPaused, isPlaying, stopOscillator]);

  // Resume audio when LFO is unpaused (if toggle is still on)
  useEffect(() => {
    if (!isPaused && isPlaying && stoppedDueToPauseRef.current) {
      stoppedDueToPauseRef.current = false;

      (async () => {
        try {
          const ctx = audioContextRef.current;
          const gain = gainNodeRef.current;

          if (!ctx || !gain) return;

          // Resume context
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          // Create fresh oscillator
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = BASE_FREQUENCY;
          osc.connect(gain);
          oscillatorRef.current = osc;

          // Fade in
          gain.gain.value = 0;
          osc.start();
          gain.gain.linearRampToValueAtTime(DEFAULT_GAIN, ctx.currentTime + FADE_IN_DURATION);

          animationFrameRef.current = requestAnimationFrame(updateAudioParams);
        } catch (error) {
          console.warn('Failed to restart audio:', error);
          setIsPlaying(false);
        }
      })();
    }
  }, [isPaused, isPlaying, updateAudioParams]);

  // Reset audio params when destination changes to remove modulation from previous destination
  // This ensures switching from Volume->Filter resets volume, and switching to non-audio
  // destinations removes all modulation effects
  const prevDestinationRef = useRef<DestinationId>(activeDestinationId);
  useEffect(() => {
    if (isPlaying && prevDestinationRef.current !== activeDestinationId) {
      resetAudioParams();
    }
    prevDestinationRef.current = activeDestinationId;
  }, [activeDestinationId, isPlaying, resetAudioParams]);

  // Handle app background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;

      if (
        previousState === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // Going to background - pause audio
        wasPlayingBeforeBackgroundRef.current = isPlaying;
        if (isPlaying) {
          stop();
        }
      } else if (
        (previousState === 'inactive' || previousState === 'background') &&
        nextAppState === 'active'
      ) {
        // Coming back to foreground - resume if was playing
        if (wasPlayingBeforeBackgroundRef.current) {
          start();
        }
        wasPlayingBeforeBackgroundRef.current = false;
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isPlaying, start, stop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      destroyAudioGraph();
    };
  }, [destroyAudioGraph]);

  const value: AudioContextValue = {
    isPlaying,
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
