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

// Helper to yield to the next animation frame
function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

const AudioContextReact = createContext<AudioContextValue | null>(null);

// Default gain for sawtooth oscillator (~-9dB to allow modulation headroom)
const DEFAULT_GAIN = 0.35;
const DEFAULT_FILTER_FREQ = 4000;
const DEFAULT_FILTER_Q = 1;
const FADE_IN_DURATION = 0.1; // 100ms fade-in to prevent click

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { lfoOutput, currentConfig, lfoFadeMultiplier, isPaused } = usePreset();
  const { activeDestinationId, getCenterValue } = useModulation();


  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Use ref instead of state to avoid re-renders during initialization
  const isInitializingRef = useRef(false);

  // Cancellation flag for chunked initialization
  const initCancelledRef = useRef(false);

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

  // Check if current destination can be mapped to audio
  const canModulateAudio = AUDIO_DESTINATIONS.has(activeDestinationId as AudioDestination);

  // Warm up the audio system on mount to avoid lag on first user interaction
  // iOS lazily initializes audio hardware, so we do a silent init/teardown
  const hasWarmedUpRef = useRef(false);
  useEffect(() => {
    if (hasWarmedUpRef.current) return;
    hasWarmedUpRef.current = true;

    const warmUp = async () => {
      try {
        // Create context and oscillator
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Set gain to 0 so it's silent
        gain.gain.value = 0;

        // Connect and start briefly
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        // Let it run for one frame then clean up
        await nextFrame();

        osc.stop();
        ctx.close();
      } catch {
        // Audio may not be supported
      }
    };

    // Run warmup after a short delay to not block initial render
    const timeoutId = setTimeout(warmUp, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Build the audio graph with chunked initialization to prevent frame drops
  // Each step yields to the next frame via requestAnimationFrame
  const buildAudioGraphChunked = useCallback(async (): Promise<boolean> => {
    try {
      // Frame 1: Create audio context
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      await nextFrame();
      if (initCancelledRef.current) return false;

      // Frame 2: Create oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 220; // A3
      oscillatorRef.current = osc;

      await nextFrame();
      if (initCancelledRef.current) return false;

      // Frame 3: Create gain node
      const gain = ctx.createGain();
      gain.gain.value = DEFAULT_GAIN;
      gainNodeRef.current = gain;

      await nextFrame();
      if (initCancelledRef.current) return false;

      // Frame 4: Create filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = DEFAULT_FILTER_FREQ;
      filter.Q.value = DEFAULT_FILTER_Q;
      filterNodeRef.current = filter;

      await nextFrame();
      if (initCancelledRef.current) return false;

      // Frame 5: Create panner
      const panner = ctx.createStereoPanner();
      panner.pan.value = 0;
      pannerNodeRef.current = panner;

      await nextFrame();
      if (initCancelledRef.current) return false;

      // Frame 6: Connect graph
      osc.connect(gain);
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

  // Clean up audio graph
  const destroyAudioGraph = useCallback(() => {
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

    gainNodeRef.current = null;
    filterNodeRef.current = null;
    pannerNodeRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

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

  // Start audio with chunked initialization
  const start = useCallback(async () => {
    if (isPlaying || isInitializingRef.current) return;

    isInitializingRef.current = true;
    initCancelledRef.current = false;

    // Build graph across multiple frames to prevent frame drops
    const success = await buildAudioGraphChunked();

    // Check if cancelled during initialization
    if (initCancelledRef.current || !success) {
      isInitializingRef.current = false;
      if (initCancelledRef.current) {
        destroyAudioGraph();
      }
      return;
    }

    try {
      const gain = gainNodeRef.current;
      const ctx = audioContextRef.current;

      // Start with gain at 0 for fade-in
      if (gain) {
        gain.gain.value = 0;
      }

      oscillatorRef.current?.start();

      // Fade in over 100ms to prevent click
      if (gain && ctx) {
        gain.gain.linearRampToValueAtTime(DEFAULT_GAIN, ctx.currentTime + FADE_IN_DURATION);
      }

      setIsPlaying(true);
    } catch (error) {
      console.warn('Failed to start audio:', error);
      destroyAudioGraph();
    } finally {
      isInitializingRef.current = false;
    }
  }, [isPlaying, buildAudioGraphChunked, destroyAudioGraph]);

  // Stop audio (also cancels initialization if in progress)
  const stop = useCallback(() => {
    // Cancel any in-progress initialization
    if (isInitializingRef.current) {
      initCancelledRef.current = true;
    }

    if (!isPlaying && !isInitializingRef.current) return;
    setIsPlaying(false);
    stoppedDueToPauseRef.current = false; // User explicitly stopped
    destroyAudioGraph();
  }, [isPlaying, destroyAudioGraph]);

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

  // Stop audio when LFO is paused (but keep toggle state)
  useEffect(() => {
    if (isPaused && isPlaying && oscillatorRef.current) {
      stoppedDueToPauseRef.current = true;
      destroyAudioGraph();
    }
  }, [isPaused, isPlaying, destroyAudioGraph]);

  // Resume audio when LFO is unpaused (if toggle is still on)
  useEffect(() => {
    if (!isPaused && isPlaying && stoppedDueToPauseRef.current) {
      stoppedDueToPauseRef.current = false;
      initCancelledRef.current = false;

      // Use async chunked build for resume too
      (async () => {
        const success = await buildAudioGraphChunked();
        if (!success || initCancelledRef.current) {
          if (initCancelledRef.current) destroyAudioGraph();
          return;
        }
        try {
          const gain = gainNodeRef.current;
          const ctx = audioContextRef.current;

          // Start with gain at 0 for fade-in
          if (gain) {
            gain.gain.value = 0;
          }

          oscillatorRef.current?.start();

          // Fade in over 100ms to prevent click
          if (gain && ctx) {
            gain.gain.linearRampToValueAtTime(DEFAULT_GAIN, ctx.currentTime + FADE_IN_DURATION);
          }

          animationFrameRef.current = requestAnimationFrame(updateAudioParams);
        } catch (error) {
          console.warn('Failed to restart audio:', error);
          destroyAudioGraph();
          setIsPlaying(false);
        }
      })();
    }
  }, [isPaused, isPlaying, buildAudioGraphChunked, destroyAudioGraph, updateAudioParams]);

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
