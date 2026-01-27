import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Canvas, Text as SkiaText, matchFont } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useAnimatedReaction,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { TimingInfoProps } from './types';

// Canvas dimensions for each item
const ITEM_HEIGHT = 32;
const VALUE_Y = 14; // Baseline for 14px value text
const LABEL_Y = 29; // Baseline for 10px label text (matches DestinationMeter)

type DestDisplayMode = 'VALUE' | 'MIN' | 'MAX';

export function TimingInfo({
  bpm,
  cycleTimeMs,
  noteValue,
  steps,
  theme,
  phase,
  startPhase = 0,
  destinationValue,
  destinationMin,
  destinationMax,
  hasDestination = false,
}: TimingInfoProps) {
  const [isBpmPulsing, setIsBpmPulsing] = useState(false);
  const [showElapsedTime, setShowElapsedTime] = useState(false);
  const [showCurrentStep, setShowCurrentStep] = useState(false);
  const [destDisplayMode, setDestDisplayMode] = useState<DestDisplayMode>('VALUE');
  const bpmOpacity = useSharedValue(1);

  // Skia fonts (same as DestinationMeter)
  const valueFont = useMemo(() => matchFont({
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 14,
    fontWeight: '700',
  }), []);

  const labelFont = useMemo(() => matchFont({
    fontFamily: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }),
    fontSize: 10,
    fontWeight: '500',
  }), []);

  // SharedValues for dynamic displays
  const elapsedTimeMsShared = useSharedValue(0);
  const currentStepShared = useSharedValue(1);

  // Throttle updates to ~15fps to prioritize visualization performance
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
      elapsedTimeMsShared.value = adjustedPhase * cycleTimeMs;
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
      currentStepShared.value = step;
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
        const startPhaseNormalized = startPhase / 128;
        const adjustedPhase = ((phase.value - startPhaseNormalized) % 1 + 1) % 1;
        const rawStep = Math.floor(adjustedPhase * steps);
        const step = (rawStep % totalSteps) + 1;
        currentStepShared.value = step;
      }
      return newValue;
    });
  }, [phase, steps, startPhase, currentStepShared]);

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
        elapsedTimeMsShared.value = adjustedPhase * cycleTimeMs;
      }
      return newValue;
    });
  }, [phase, cycleTimeMs, startPhase, elapsedTimeMsShared]);

  // Start/stop BPM pulsing animation
  useEffect(() => {
    if (isBpmPulsing && bpm) {
      const beatDuration = 60000 / bpm;
      const halfBeat = beatDuration / 2;

      bpmOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: halfBeat, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: halfBeat, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(bpmOpacity);
      bpmOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [isBpmPulsing, bpm, bpmOpacity]);

  // Format time value for display
  const formatTime = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms.toFixed(0)}ms`;
  };

  // Derived text values for Skia
  const bpmText = useDerivedValue(() => String(bpm ?? ''), [bpm]);

  const cycleText = useDerivedValue(() => {
    'worklet';
    if (showElapsedTime) {
      const ms = elapsedTimeMsShared.value;
      if (ms >= 1000) {
        return `${(ms / 1000).toFixed(2)}s`;
      }
      return `${ms.toFixed(0)}ms`;
    }
    if (cycleTimeMs === undefined) return '';
    if (cycleTimeMs >= 1000) {
      return `${(cycleTimeMs / 1000).toFixed(2)}s`;
    }
    return `${cycleTimeMs.toFixed(0)}ms`;
  }, [showElapsedTime, cycleTimeMs, elapsedTimeMsShared]);

  const cycleLabelText = useDerivedValue(() => showElapsedTime ? 'TIME' : 'CYCLE', [showElapsedTime]);

  const stepsText = useDerivedValue(() => {
    'worklet';
    if (showCurrentStep) {
      return String(currentStepShared.value);
    }
    if (steps === undefined) return '';
    if (Number.isInteger(steps)) return String(steps);
    return steps.toFixed(1);
  }, [showCurrentStep, steps, currentStepShared]);

  const stepsLabelText = useDerivedValue(() => showCurrentStep ? 'STEP' : 'STEPS', [showCurrentStep]);

  // Calculate centered x positions for text using actual font measurements
  const bpmTextX = useDerivedValue(() => {
    'worklet';
    const text = bpmText.value;
    if (!text) return 0;
    const textWidth = valueFont.measureText(text).width;
    return (50 - textWidth) / 2;
  }, [bpmText, valueFont]);

  const cycleTextX = useDerivedValue(() => {
    'worklet';
    const text = cycleText.value;
    if (!text) return 0;
    const textWidth = valueFont.measureText(text).width;
    return (60 - textWidth) / 2;
  }, [cycleText, valueFont]);

  const cycleLabelX = useDerivedValue(() => {
    'worklet';
    const text = cycleLabelText.value;
    const textWidth = labelFont.measureText(text).width;
    return (60 - textWidth) / 2;
  }, [cycleLabelText, labelFont]);

  const stepsTextX = useDerivedValue(() => {
    'worklet';
    const text = stepsText.value;
    if (!text) return 0;
    const textWidth = valueFont.measureText(text).width;
    return (50 - textWidth) / 2;
  }, [stepsText, valueFont]);

  const stepsLabelX = useDerivedValue(() => {
    'worklet';
    const text = stepsLabelText.value;
    const textWidth = labelFont.measureText(text).width;
    return (50 - textWidth) / 2;
  }, [stepsLabelText, labelFont]);

  // Static text values - use actual font measurements
  // NOTE column uses dynamic width to prevent truncation of values like "128 bars"
  const noteText = noteValue ?? '';
  const noteTextWidth = noteText ? valueFont.measureText(noteText).width : 0;
  const noteLabelWidth = labelFont.measureText('NOTE').width;
  const noteCanvasWidth = Math.max(50, Math.ceil(noteTextWidth) + 4, Math.ceil(noteLabelWidth) + 4);
  const noteTextX = noteText ? (noteCanvasWidth - noteTextWidth) / 2 : 0;
  const noteLabelX = (noteCanvasWidth - noteLabelWidth) / 2;

  const bpmLabelX = (50 - labelFont.measureText('BPM').width) / 2;

  // Destination value display - cycles through VALUE/MIN/MAX on tap
  const handleDestPress = useCallback(() => {
    setDestDisplayMode(prev => {
      const modes: DestDisplayMode[] = ['VALUE', 'MIN', 'MAX'];
      const currentIndex = modes.indexOf(prev);
      return modes[(currentIndex + 1) % 3];
    });
  }, []);

  const destText = useDerivedValue(() => {
    'worklet';
    if (!hasDestination) return '—';
    if (destDisplayMode === 'MIN') {
      return String(Math.round(destinationMin ?? 0));
    }
    if (destDisplayMode === 'MAX') {
      return String(Math.round(destinationMax ?? 127));
    }
    // VALUE mode
    const val = destinationValue?.value ?? 64;
    return String(Math.round(val));
  }, [hasDestination, destDisplayMode, destinationMin, destinationMax, destinationValue]);

  const destLabelText = useDerivedValue(() => destDisplayMode, [destDisplayMode]);

  const destTextX = useDerivedValue(() => {
    'worklet';
    const text = destText.value;
    if (!text) return 0;
    const textWidth = valueFont.measureText(text).width;
    return (50 - textWidth) / 2;
  }, [destText, valueFont]);

  const destLabelX = useDerivedValue(() => {
    'worklet';
    const text = destLabelText.value;
    const textWidth = labelFont.measureText(text).width;
    return (50 - textWidth) / 2;
  }, [destLabelText, labelFont]);

  return (
    <View style={[styles.container, { borderTopColor: theme.gridLines + '20' }]}>
      {bpm !== undefined && (
        <View style={styles.item}>
          <Canvas style={{ width: 50, height: ITEM_HEIGHT }}>
            <SkiaText
              x={bpmTextX}
              y={VALUE_Y}
              text={bpmText}
              font={valueFont}
              color={theme.text}
              opacity={bpmOpacity}
            />
            <SkiaText
              x={bpmLabelX}
              y={LABEL_Y}
              text="BPM"
              font={labelFont}
              color={theme.textSecondary}
              opacity={bpmOpacity}
            />
          </Canvas>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBpmPress}
            hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
          />
        </View>
      )}

      {cycleTimeMs !== undefined && (
        <View style={styles.item}>
          <Canvas style={{ width: 60, height: ITEM_HEIGHT }}>
            <SkiaText
              x={cycleTextX}
              y={VALUE_Y}
              text={cycleText}
              font={valueFont}
              color={theme.text}
            />
            <SkiaText
              x={cycleLabelX}
              y={LABEL_Y}
              text={cycleLabelText}
              font={labelFont}
              color={theme.textSecondary}
            />
          </Canvas>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleCyclePress}
            hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
          />
        </View>
      )}

      {noteValue && (
        <View style={styles.item}>
          <Canvas style={{ width: noteCanvasWidth, height: ITEM_HEIGHT }}>
            <SkiaText
              x={noteTextX}
              y={VALUE_Y}
              text={noteText}
              font={valueFont}
              color={theme.text}
            />
            <SkiaText
              x={noteLabelX}
              y={LABEL_Y}
              text="NOTE"
              font={labelFont}
              color={theme.textSecondary}
            />
          </Canvas>
        </View>
      )}

      {steps !== undefined && steps > 0 && (
        <View style={styles.item}>
          <Canvas style={{ width: 50, height: ITEM_HEIGHT }}>
            <SkiaText
              x={stepsTextX}
              y={VALUE_Y}
              text={stepsText}
              font={valueFont}
              color={theme.text}
            />
            <SkiaText
              x={stepsLabelX}
              y={LABEL_Y}
              text={stepsLabelText}
              font={labelFont}
              color={theme.textSecondary}
            />
          </Canvas>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleStepsPress}
            hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
          />
        </View>
      )}

      {hasDestination && (
        <View style={styles.item}>
          <Canvas style={{ width: 50, height: ITEM_HEIGHT }}>
            <SkiaText
              x={destTextX}
              y={VALUE_Y}
              text={destText}
              font={valueFont}
              color={theme.text}
            />
            <SkiaText
              x={destLabelX}
              y={LABEL_Y}
              text={destLabelText}
              font={labelFont}
              color={theme.textSecondary}
            />
          </Canvas>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDestPress}
            hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
          />
        </View>
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
});
