import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import type { TimingInfoProps } from './types';

export function TimingInfo({ bpm, cycleTimeMs, noteValue, steps, theme, phase, startPhase = 0 }: TimingInfoProps) {
  const [isBpmPulsing, setIsBpmPulsing] = useState(false);
  const [showElapsedTime, setShowElapsedTime] = useState(false);
  const [showCurrentStep, setShowCurrentStep] = useState(false);
  const bpmOpacity = useSharedValue(1);

  // Track current step for display (updated periodically from phase)
  const [currentStep, setCurrentStep] = useState(1);

  // Track elapsed time within cycle (updated periodically from phase)
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);

  // Throttle state updates to ~15fps to prioritize visualization performance
  const lastElapsedUpdateRef = useRef(0);
  const lastStepUpdateRef = useRef(0);
  const THROTTLE_MS = 66; // ~15fps

  // Update elapsed time from phase using useAnimatedReaction (UI thread safe)
  useAnimatedReaction(
    () => phase?.value ?? 0,
    (currentPhase) => {
      'worklet';
      if (!showElapsedTime || !cycleTimeMs) return;

      // Throttle updates to ~15fps
      const now = Date.now();
      if (now - lastElapsedUpdateRef.current < THROTTLE_MS) return;
      lastElapsedUpdateRef.current = now;

      // Convert startPhase (0-127) to normalized (0-1)
      const startPhaseNormalized = startPhase / 128;
      // Subtract startPhase offset so elapsed time starts at the LFO's start position
      const adjustedPhase = ((currentPhase - startPhaseNormalized) % 1 + 1) % 1;
      // Calculate elapsed time within cycle
      runOnJS(setElapsedTimeMs)(adjustedPhase * cycleTimeMs);
    },
    [showElapsedTime, cycleTimeMs, startPhase]
  );

  // Update current step from phase using useAnimatedReaction (UI thread safe)
  useAnimatedReaction(
    () => phase?.value ?? 0,
    (currentPhase) => {
      'worklet';
      if (!showCurrentStep || !steps || steps <= 0) return;

      // Throttle updates to ~15fps
      const now = Date.now();
      if (now - lastStepUpdateRef.current < THROTTLE_MS) return;
      lastStepUpdateRef.current = now;

      const totalSteps = Math.ceil(steps);
      // Convert startPhase (0-127) to normalized (0-1)
      const startPhaseNormalized = startPhase / 128;
      // Subtract startPhase offset so step 1 starts at the LFO's start position
      const adjustedPhase = ((currentPhase - startPhaseNormalized) % 1 + 1) % 1;
      // Calculate current step (1-indexed), wrapping correctly
      const rawStep = Math.floor(adjustedPhase * steps);
      const step = (rawStep % totalSteps) + 1;
      runOnJS(setCurrentStep)(step);
    },
    [showCurrentStep, steps, startPhase]
  );

  // Toggle between STEPS and STEP display
  const handleStepsPress = useCallback(() => {
    setShowCurrentStep(prev => {
      const newValue = !prev;
      // Immediately calculate current step when toggling on
      if (newValue && phase && steps && steps > 0) {
        const totalSteps = Math.ceil(steps);
        // Convert startPhase (0-127) to normalized (0-1)
        const startPhaseNormalized = startPhase / 128;
        // Subtract startPhase offset so step 1 starts at the LFO's start position
        const adjustedPhase = ((phase.value - startPhaseNormalized) % 1 + 1) % 1;
        const rawStep = Math.floor(adjustedPhase * steps);
        const step = (rawStep % totalSteps) + 1;
        setCurrentStep(step);
      }
      return newValue;
    });
  }, [phase, steps, startPhase]);

  // Format steps - show decimal only if not a whole number
  const formatSteps = (s: number): string => {
    if (Number.isInteger(s)) return String(s);
    return s.toFixed(1);
  };

  // Handle BPM tap to toggle pulsing
  const handleBpmPress = useCallback(() => {
    setIsBpmPulsing(prev => !prev);
  }, []);

  // Handle cycle tap to toggle elapsed time display
  const handleCyclePress = useCallback(() => {
    setShowElapsedTime(prev => {
      const newValue = !prev;
      // Immediately calculate elapsed time when toggling on
      if (newValue && phase && cycleTimeMs) {
        const startPhaseNormalized = startPhase / 128;
        const adjustedPhase = ((phase.value - startPhaseNormalized) % 1 + 1) % 1;
        setElapsedTimeMs(adjustedPhase * cycleTimeMs);
      }
      return newValue;
    });
  }, [phase, cycleTimeMs, startPhase]);

  // Start/stop BPM pulsing animation
  useEffect(() => {
    if (isBpmPulsing && bpm) {
      // Calculate timing for one beat (ms per beat)
      const beatDuration = 60000 / bpm;
      // Fade down takes half a beat, fade up takes half a beat
      const halfBeat = beatDuration / 2;

      bpmOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: halfBeat, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: halfBeat, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Repeat forever
        false // Don't reverse
      );
    } else {
      // Stop pulsing and reset to full opacity
      cancelAnimation(bpmOpacity);
      bpmOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [isBpmPulsing, bpm, bpmOpacity]);


  // Animated style for BPM text
  const bpmAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bpmOpacity.value,
  }));

  // Format time value for display
  const formatTime = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms.toFixed(0)}ms`;
  };

  return (
    <View style={[styles.container, { borderTopColor: theme.gridLines + '20' }]}>
      {bpm !== undefined && (
        <Pressable onPress={handleBpmPress} style={styles.item} hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}>
          <Animated.Text style={[styles.value, { color: theme.text }, bpmAnimatedStyle]}>
            {bpm}
          </Animated.Text>
          <Animated.Text style={[styles.label, { color: theme.textSecondary }, bpmAnimatedStyle]}>
            BPM
          </Animated.Text>
        </Pressable>
      )}

      {cycleTimeMs !== undefined && (
        <Pressable onPress={handleCyclePress} style={styles.item} hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.value, styles.cycleValue, { color: theme.text }]}>
            {showElapsedTime ? formatTime(elapsedTimeMs) : formatTime(cycleTimeMs)}
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {showElapsedTime ? 'TIME' : 'CYCLE'}
          </Text>
        </Pressable>
      )}

      {noteValue && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>{noteValue}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>NOTE</Text>
        </View>
      )}

      {steps !== undefined && steps > 0 && (
        <Pressable onPress={handleStepsPress} style={styles.item} hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.value, styles.stepsValue, { color: theme.text }]}>
            {showCurrentStep ? currentStep : formatSteps(steps)}
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {showCurrentStep ? 'STEP' : 'STEPS'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  item: {
    alignItems: 'center',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  stepsValue: {
    minWidth: 32,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  cycleValue: {
    minWidth: 48,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
