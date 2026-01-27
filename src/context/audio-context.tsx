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
  const { lfoOutput, isPaused } = usePreset();
  const { activeDestinationId, getCenterValue } = useModulation();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

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
  // Track pending fade-out timeout so we can cancel it on restart
  const fadeOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if audio was stopped due to LFO pause (not user toggle)
  const stoppedDueToPauseRef = useRef(false);
  // Track cleanup state to prevent operations on unmounted component (fast refresh)
  const isCleaningUpRef = useRef(false);

  // Use refs for values accessed in animation loop to avoid stale closures
  // These are updated by effects but read by the animation loop
  const isPlayingRef = useRef(false);
  const activeDestinationIdRef = useRef<DestinationId>(activeDestinationId);
  const getCenterValueRef = useRef(getCenterValue);

  // Keep refs in sync with state/props
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    activeDestinationIdRef.current = activeDestinationId;
  }, [activeDestinationId]);

  useEffect(() => {
    getCenterValueRef.current = getCenterValue;
  }, [getCenterValue]);

  // Build the audio graph synchronously
  // This only builds the persistent nodes (gain, filter, panner) - oscillator is created on each start
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

  // Fully destroy audio graph (on unmount or fast refresh)
  const destroyAudioGraph = useCallback(async () => {
    isCleaningUpRef.current = true;

    // Cancel any pending fade-out timeout
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }

    stopOscillator();

    gainNodeRef.current = null;
    filterNodeRef.current = null;
    pannerNodeRef.current = null;

    if (audioContextRef.current) {
      try {
        // Must await close() to properly release system audio resources
        await audioContextRef.current.close();
      } catch (error) {
        console.warn('Error closing AudioContext:', error);
      }
      audioContextRef.current = null;
    }

    audioGraphReadyRef.current = false;
    // Note: Don't reset isCleaningUpRef here - it stays true until component remounts
  }, [stopOscillator]);

  // Animation loop function - uses refs to avoid stale closures
  // This runs at ~60fps when audio is playing
  const runAnimationLoop = useCallback(() => {
    const updateAudioParams = () => {
      // Early exit if not playing (check ref, not state)
      if (!isPlayingRef.current) return;

      const ctx = audioContextRef.current;
      const osc = oscillatorRef.current;
      const gain = gainNodeRef.current;
      const filter = filterNodeRef.current;
      const panner = pannerNodeRef.current;

      // Guard against missing audio nodes
      if (!ctx || !osc || !gain || !filter || !panner) return;

      // Read LFO output - this already has depth and fade applied by the engine!
      // IMPORTANT: Do NOT apply depth or fade again here
      const lfoValue = lfoOutput.value;

      // Get current destination and center value from refs
      const destId = activeDestinationIdRef.current;
      const centerValue = getCenterValueRef.current(destId);

      // The LFO output is already scaled by depth (-1 to +1 at max depth)
      // We just need to map it to the appropriate audio parameter range
      // maxMod is half the MIDI range (63.5) since LFO swings both directions
      const maxMod = 63.5;

      // Modulation amount: LFO output (already depth-scaled) * parameter range
      // lfoValue ranges from -1 to +1 (after depth scaling in engine)
      const modulation = lfoValue * maxMod;

      // Get current time for Web Audio automation
      // Using setValueAtTime instead of .value ensures proper interaction with
      // scheduled automation (like fade-in/fade-out ramps)
      const now = ctx.currentTime;

      switch (destId) {
        case 'volume': {
          // Volume: 0-127 MIDI range
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          // Use cancelScheduledValues + setValueAtTime for gain to override any pending automation
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(midiToGain(finalValue), now);
          break;
        }
        case 'filter_freq': {
          // Filter freq: 0-127 MIDI range
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          filter.frequency.value = midiToFilterFreq(finalValue);
          break;
        }
        case 'filter_reso': {
          // Filter resonance: 0-127 MIDI range
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          filter.Q.value = midiToFilterQ(finalValue);
          break;
        }
        case 'pan': {
          // Pan: -64 to +63 MIDI range (bipolar)
          const finalValue = Math.max(-64, Math.min(63, centerValue + modulation));
          panner.pan.value = midiToPan(finalValue);
          break;
        }
        case 'pitch': {
          // Pitch: 0-127 MIDI range, 64 = no change from base frequency
          const finalValue = Math.max(0, Math.min(127, centerValue + modulation));
          osc.frequency.value = midiToPitch(finalValue);
          break;
        }
        default:
          // For non-audio destinations, play with default params (no modulation)
          // Cancel any scheduled gain automation first
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(DEFAULT_GAIN, now);
          filter.frequency.value = DEFAULT_FILTER_FREQ;
          filter.Q.value = DEFAULT_FILTER_Q;
          panner.pan.value = 0;
      }

      // Continue animation loop - always schedule next frame if playing
      if (isPlayingRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateAudioParams);
      }
    };

    // Start the loop
    animationFrameRef.current = requestAnimationFrame(updateAudioParams);
  }, [lfoOutput]);

  // Start audio - builds graph on first call, then reuses it
  const start = useCallback(async () => {
    if (isPlaying) return;

    // Cancel any pending fade-out timeout to prevent interference
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }

    // Check if existing AudioContext is still valid (handles fast refresh)
    const existingCtx = audioContextRef.current;
    const isContextValid = existingCtx && existingCtx.state !== 'closed';

    // Build graph on first start, or rebuild if context became invalid (fast refresh)
    if (!audioGraphReadyRef.current || !isContextValid || isCleaningUpRef.current) {
      // Clean up any stale context first
      if (existingCtx && !isContextValid) {
        console.log('[Audio] Rebuilding audio graph after invalid context detected');
        audioContextRef.current = null;
        gainNodeRef.current = null;
        filterNodeRef.current = null;
        pannerNodeRef.current = null;
      }

      // Reset cleanup flag - we're building fresh
      isCleaningUpRef.current = false;

      const success = buildAudioGraph();
      if (!success) return;
      audioGraphReadyRef.current = true;
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

      // Update state and start animation loop
      setIsPlaying(true);
      isPlayingRef.current = true;
      runAnimationLoop();
    } catch (error) {
      console.warn('Failed to start audio:', error);
    }
  }, [isPlaying, buildAudioGraph, runAnimationLoop]);

  // Stop audio with fade-out (keeps audio graph alive for quick restart)
  const stop = useCallback(() => {
    if (!isPlaying) return;

    stoppedDueToPauseRef.current = false; // User explicitly stopped
    setIsPlaying(false);
    isPlayingRef.current = false;

    const ctx = audioContextRef.current;
    const gain = gainNodeRef.current;

    if (!ctx || !gain) {
      stopOscillator();
      return;
    }

    // Fade out to prevent click
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_DURATION);

    // Clear any pending fade-out timeout
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
    }

    // After fade completes, stop oscillator and suspend context
    fadeOutTimeoutRef.current = setTimeout(() => {
      fadeOutTimeoutRef.current = null;
      // Guard against cleanup during fade (fast refresh)
      if (isCleaningUpRef.current) return;
      stopOscillator();
      // Suspend context to free resources but keep graph alive
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
    }, FADE_OUT_DURATION * 1000 + 10);
  }, [isPlaying, stopOscillator]);

  // Toggle audio
  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  // Stop audio when LFO is paused (but keep toggle state and audio graph)
  useEffect(() => {
    if (isPaused && isPlaying && oscillatorRef.current) {
      stoppedDueToPauseRef.current = true;
      isPlayingRef.current = false; // Stop animation loop immediately

      const ctx = audioContextRef.current;
      const gain = gainNodeRef.current;

      if (ctx && gain) {
        // Fade out then stop oscillator and suspend
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_DURATION);

        // Clear any pending fade-out timeout
        if (fadeOutTimeoutRef.current) {
          clearTimeout(fadeOutTimeoutRef.current);
        }

        fadeOutTimeoutRef.current = setTimeout(() => {
          fadeOutTimeoutRef.current = null;
          // Guard against cleanup during fade (fast refresh)
          if (isCleaningUpRef.current) return;
          stopOscillator();
          if (audioContextRef.current) {
            audioContextRef.current.suspend();
          }
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

      // Cancel any pending fade-out timeout to prevent it from interfering with resume
      if (fadeOutTimeoutRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
        fadeOutTimeoutRef.current = null;
      }

      (async () => {
        // Guard against cleanup in progress (fast refresh)
        if (isCleaningUpRef.current) return;

        try {
          const ctx = audioContextRef.current;
          const gain = gainNodeRef.current;

          if (!ctx || !gain) return;

          // Check if context is still valid (not closed from fast refresh)
          if (ctx.state === 'closed') {
            console.log('[Audio] Context closed, cannot resume');
            setIsPlaying(false);
            isPlayingRef.current = false;
            return;
          }

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

          // Restart animation loop
          isPlayingRef.current = true;
          runAnimationLoop();
        } catch (error) {
          console.warn('Failed to restart audio:', error);
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      })();
    }
  }, [isPaused, isPlaying, runAnimationLoop]);

  // Reset audio params when destination changes to remove modulation from previous destination
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
