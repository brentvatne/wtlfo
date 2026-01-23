import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { Canvas, Rect, RoundedRect, Group, Line, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming, withSequence, useAnimatedReaction, Easing, cancelAnimation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { DestinationDefinition } from '@/src/types/destination';
import type { WaveformType, TriggerMode } from '@/src/components/lfo/types';
import { sampleWaveformWorklet } from '@/src/components/lfo/worklets';

type DisplayMode = 'VALUE' | 'MIN' | 'MAX';

// Unipolar waveforms only output 0 to 1 (not -1 to +1)
const UNIPOLAR_WAVEFORMS: WaveformType[] = ['EXP', 'RMP'];

interface DestinationMeterProps {
  lfoOutput: SharedValue<number>;
  destination: DestinationDefinition | null;
  centerValue: number;
  depth: number;
  /** Fade value (-64 to +63) - affects envelope bounds */
  fade?: number;
  /** Trigger mode - fade only applies when not FRE */
  mode?: TriggerMode;
  /** Current fade envelope multiplier (0.0 to 1.0) from LFO state */
  fadeMultiplier?: SharedValue<number>;
  waveform?: WaveformType;
  /** Start phase offset (0-127) for waveform sampling */
  startPhase?: number;
  width?: number;
  height?: number;
  style?: ViewStyle;
  showValue?: boolean;
  /** When true, hides the current value line and shows center value instead - use isEditingShared for better performance */
  isEditing?: boolean;
  /** SharedValue for editing state - avoids re-renders when editing state changes */
  isEditingShared?: SharedValue<boolean>;
  /** When false, disables hiding values while editing */
  hideValuesWhileEditing?: boolean;
  /** When true, keeps fill areas visible while editing (default true) */
  showFillsWhenEditing?: boolean;
  /** Duration in ms for fade-out when editing starts (default 100) */
  editFadeOutDuration?: number;
  /** Duration in ms for fade-in when editing ends (default 350) */
  editFadeInDuration?: number;
  /** When true, dims the visualization canvas (but not the value text) */
  isPaused?: boolean;
}

export function DestinationMeter({
  lfoOutput,
  destination,
  centerValue,
  depth,
  fade = 0,
  mode = 'FRE',
  fadeMultiplier,
  waveform = 'SIN',
  startPhase = 0,
  width = 60,
  height = 108,
  style,
  showValue = false,
  isEditing = false,
  isEditingShared,
  hideValuesWhileEditing = true,
  showFillsWhenEditing = true,
  editFadeOutDuration = 100,
  editFadeInDuration = 350,
  isPaused = false,
}: DestinationMeterProps) {
  // Local state for shouldHideValue - updated via scheduleOnRN when using SharedValue
  const [shouldHideValueState, setShouldHideValueState] = useState(isEditing && hideValuesWhileEditing);

  // Only apply editing fade if setting is enabled
  // Use local state when isEditingShared is provided, otherwise use prop directly
  const shouldHideValue = isEditingShared ? shouldHideValueState : (isEditing && hideValuesWhileEditing);
  // Only hide fills if editing AND the setting says to hide them
  const shouldHideFill = isEditingShared ? (shouldHideValueState && !showFillsWhenEditing) : (isEditing && !showFillsWhenEditing);

  // React to isEditingShared changes on UI thread (preferred, avoids re-renders for animations)
  // Updates local state via scheduleOnRN for text rendering that needs React re-render
  useAnimatedReaction(
    () => isEditingShared?.value,
    (editing, prevEditing) => {
      'worklet';
      // Only react if isEditingShared is provided and value actually changed
      if (isEditingShared === undefined || prevEditing === undefined) return;
      if (editing === prevEditing) return;

      // Calculate whether to hide based on editing state and setting
      const newShouldHide = (editing ?? false) && hideValuesWhileEditing;

      // Update local state for text rendering (needs React re-render)
      // Pass function reference + args separately (required by scheduleOnRN)
      scheduleOnRN(setShouldHideValueState, newShouldHide);

      // Handle animations directly on UI thread
      if (newShouldHide) {
        // Editing with hide enabled: fade out quickly
        currentValueOpacity.value = withTiming(0, {
          duration: editFadeOutDuration,
          easing: Easing.inOut(Easing.ease),
        });
      } else {
        // Not editing: fade back in
        currentValueOpacity.value = withTiming(1, {
          duration: editFadeInDuration,
          easing: Easing.out(Easing.ease),
        });
      }

      // Handle modulation range fill opacity
      const newShouldHideFill = editing && !showFillsWhenEditing;
      if (newShouldHideFill) {
        modulationRangeOpacity.value = 0;
      } else {
        modulationRangeOpacity.value = withTiming(0.2, {
          duration: editFadeInDuration,
          easing: Easing.out(Easing.ease),
        });
      }
    },
    [isEditingShared, hideValuesWhileEditing, showFillsWhenEditing, editFadeOutDuration, editFadeInDuration]
  );
  // Handle null destination (none selected) - show empty meter
  const min = destination?.min ?? 0;
  const max = destination?.max ?? 127;
  const range = max - min;
  const maxModulation = range / 2;
  // Clamp to max 1 to handle asymmetric range (-64 to +63)
  const depthScale = Math.min(1, Math.abs(depth) / 63);

  // Calculate bounds based on depth and waveform type
  const swing = maxModulation * depthScale;
  const isUnipolar = UNIPOLAR_WAVEFORMS.includes(waveform);

  // For unipolar waveforms (EXP, RMP):
  // - Positive depth: only modulates above center
  // - Negative depth: only modulates below center
  // For bipolar waveforms: modulates both directions
  let targetLowerBound: number;
  let targetUpperBound: number;

  if (isUnipolar) {
    if (depth >= 0) {
      // Unipolar + positive depth: center to center + swing
      targetLowerBound = centerValue;
      targetUpperBound = Math.min(max, centerValue + swing);
    } else {
      // Unipolar + negative depth: center - swing to center
      targetLowerBound = Math.max(min, centerValue - swing);
      targetUpperBound = centerValue;
    }
  } else {
    // Bipolar: both directions
    targetLowerBound = Math.max(min, centerValue - swing);
    targetUpperBound = Math.min(max, centerValue + swing);
  }

  // Animated shared values for smooth transitions
  const animatedCenterValue = useSharedValue(centerValue);
  const animatedLowerBound = useSharedValue(targetLowerBound);
  const animatedUpperBound = useSharedValue(targetUpperBound);

  // Animated opacity for current value line (fades out when editing or waveform changing)
  const currentValueOpacity = useSharedValue(shouldHideValue ? 0 : 1);
  const prevWaveformRef = useRef(waveform);

  // Animated opacity for modulation range fill (orange area)
  const modulationRangeOpacity = useSharedValue(shouldHideFill ? 0 : 0.2);

  // Effect for current value line opacity (fallback when isEditingShared not provided)
  // Handles: editing state changes, waveform changes, and their combinations
  useEffect(() => {
    // Skip if using SharedValue - handled by useAnimatedReaction above
    if (isEditingShared !== undefined) return;

    // Check if waveform changed since last render
    const waveformChanged = prevWaveformRef.current !== waveform;
    if (waveformChanged) {
      prevWaveformRef.current = waveform;
    }

    if (shouldHideValue) {
      // Editing with hide enabled: fade out quickly
      currentValueOpacity.value = withTiming(0, {
        duration: editFadeOutDuration,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (waveformChanged) {
      // Waveform changed while not editing: cross-fade
      currentValueOpacity.value = withSequence(
        withTiming(0, { duration: 80, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 150, easing: Easing.in(Easing.ease) })
      );
    } else {
      // Not editing (includes editing just ended): fade back in
      currentValueOpacity.value = withTiming(1, {
        duration: editFadeInDuration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [shouldHideValue, waveform, currentValueOpacity, editFadeOutDuration, editFadeInDuration, isEditingShared]);

  // Separate effect for modulation range fill opacity (fallback when isEditingShared not provided)
  useEffect(() => {
    // Skip if using SharedValue - handled by useAnimatedReaction above
    if (isEditingShared !== undefined) return;

    if (shouldHideFill) {
      // Instantly hide modulation range when editing starts
      modulationRangeOpacity.value = 0;
    } else {
      // Fade in modulation range when editing ends
      modulationRangeOpacity.value = withTiming(0.2, {
        duration: editFadeInDuration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [shouldHideFill, modulationRangeOpacity, editFadeInDuration, isEditingShared]);

  // Animate bounds smoothly to match waveform path interpolation (60ms)
  // Uses withTiming instead of direct assignment for cohesive visual transitions
  // Cancel in-progress animations to prevent stacking during rapid changes
  useEffect(() => {
    cancelAnimation(animatedCenterValue);
    cancelAnimation(animatedLowerBound);
    cancelAnimation(animatedUpperBound);
    const config = { duration: 60, easing: Easing.out(Easing.ease) };
    animatedCenterValue.value = withTiming(centerValue, config);
    animatedLowerBound.value = withTiming(targetLowerBound, config);
    animatedUpperBound.value = withTiming(targetUpperBound, config);
  }, [centerValue, targetLowerBound, targetUpperBound]);

  // Track current value for display - updated via interval to avoid blocking UI thread
  const [currentValue, setCurrentValue] = useState(centerValue);

  // Display mode: VALUE (current modulated), MIN (lower bound), MAX (upper bound)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('VALUE');

  // Cycle through display modes on tap
  const handleDisplayModePress = useCallback(() => {
    setDisplayMode(prev => {
      if (prev === 'VALUE') return 'MIN';
      if (prev === 'MIN') return 'MAX';
      return 'VALUE';
    });
  }, []);

  // Sample lfoOutput from JS thread periodically (decoupled from UI thread animation)
  // Uses centerValue prop directly (not spring-animated) so text responds immediately to slider
  // Apply fadeMultiplier to account for fade envelope
  useEffect(() => {
    const interval = setInterval(() => {
      const fadeMult = fadeMultiplier?.value ?? 1;
      const modulationAmount = lfoOutput.value * maxModulation * fadeMult;
      const value = Math.round(Math.max(min, Math.min(max, centerValue + modulationAmount)));
      setCurrentValue(value);
    }, 33); // 30fps for text
    return () => clearInterval(interval);
  }, [lfoOutput, fadeMultiplier, centerValue, maxModulation, min, max]);

  // Position calculations
  const meterX = 8;
  const meterWidth = width - 16;
  const meterTop = 8;
  const meterHeight = height - 16;

  // Determine if fade should be applied (only for non-FRE modes with non-zero fade)
  const hasFade = fade !== 0 && mode !== 'FRE';

  // Calculate the current modulated value position (animated)
  // lfoOutput is already depth-scaled, so we only multiply by maxModulation
  // Apply fadeMultiplier to account for fade envelope
  const meterFillHeight = useDerivedValue(() => {
    'worklet';
    const fadeMult = fadeMultiplier?.value ?? 1;
    const modulationAmount = lfoOutput.value * maxModulation * fadeMult;
    const currentVal = animatedCenterValue.value + modulationAmount;
    const clampedValue = Math.max(min, Math.min(max, currentVal));
    const normalized = (clampedValue - min) / range;
    return normalized * (height - 16); // Leave padding
  }, [maxModulation, min, max, range, height]);

  // Animated upper and lower bound Y positions (these are the "full" depth bounds)
  const upperBoundY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - ((animatedUpperBound.value - min) / range) * meterHeight;
  }, [meterTop, meterHeight, min, range]);

  const lowerBoundY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - ((animatedLowerBound.value - min) / range) * meterHeight;
  }, [meterTop, meterHeight, min, range]);

  // Calculate the actual max/min values by sampling the output curve (waveform × fade)
  // This gives accurate bounds regardless of waveform type or fade timing
  const { fadeActualMax, fadeActualMin } = useMemo(() => {
    if (!hasFade || depth === 0) {
      return { fadeActualMax: targetUpperBound, fadeActualMin: targetLowerBound };
    }

    const samples = 128;
    const absFade = Math.abs(fade);
    const fadeDuration = (64 - absFade) / 64;
    // Clamp depth scale to [-1, 1] to handle asymmetric range
    const localDepthScale = Math.max(-1, Math.min(1, depth / 63));
    // Normalize startPhase (0-127) to 0-1
    const startPhaseNormalized = startPhase / 128;

    let maxOutput = -Infinity;
    let minOutput = Infinity;

    for (let i = 0; i <= samples; i++) {
      const xNormalized = i / samples;

      // Sample waveform at shifted phase (same as FadeEnvelope)
      const waveformPhase = (xNormalized + startPhaseNormalized) % 1;
      const rawOutput = sampleWaveformWorklet(waveform, waveformPhase);

      // Calculate fade envelope at visual position (not waveform phase)
      let fadeEnvelope: number;
      if (fade < 0) {
        // Fade-in: 0 → 1 over fadeDuration
        fadeEnvelope = fadeDuration > 0 ? Math.min(1, xNormalized / fadeDuration) : 1;
      } else {
        // Fade-out: 1 → 0 over fadeDuration
        fadeEnvelope = fadeDuration > 0 ? Math.max(0, 1 - xNormalized / fadeDuration) : 0;
      }

      // Calculate output: waveform × depth × fade
      const output = rawOutput * localDepthScale * fadeEnvelope;

      if (output > maxOutput) maxOutput = output;
      if (output < minOutput) minOutput = output;
    }

    // Convert to actual parameter values
    const actualMax = Math.min(max, centerValue + maxOutput * maxModulation);
    const actualMin = Math.max(min, centerValue + minOutput * maxModulation);

    return { fadeActualMax: actualMax, fadeActualMin: actualMin };
  }, [hasFade, depth, fade, waveform, startPhase, centerValue, maxModulation, min, max, targetUpperBound, targetLowerBound]);

  // Animated fade bounds for smooth transitions
  const animatedFadeActualMax = useSharedValue(fadeActualMax);
  const animatedFadeActualMin = useSharedValue(fadeActualMin);

  useEffect(() => {
    cancelAnimation(animatedFadeActualMax);
    cancelAnimation(animatedFadeActualMin);
    const config = { duration: 60, easing: Easing.out(Easing.ease) };
    animatedFadeActualMax.value = withTiming(fadeActualMax, config);
    animatedFadeActualMin.value = withTiming(fadeActualMin, config);
  }, [fadeActualMax, fadeActualMin]);

  // Fade bounds Y positions - FIXED at the actual max/min the output will reach
  const fadeMaxBoundY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - ((animatedFadeActualMax.value - min) / range) * meterHeight;
  }, [meterTop, meterHeight, min, range]);

  const fadeMinBoundY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - ((animatedFadeActualMin.value - min) / range) * meterHeight;
  }, [meterTop, meterHeight, min, range]);

  // Animated current value Y position
  const currentValueY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - meterFillHeight.value;
  }, [meterTop, meterHeight]);

  // Pre-compute derived values for bound lines (must be unconditional for hooks rules)
  const boundRangeHeight = useDerivedValue(() => {
    'worklet';
    return lowerBoundY.value - upperBoundY.value;
  }, []);

  const upperBoundP1 = useDerivedValue(() => {
    'worklet';
    return vec(meterX, upperBoundY.value);
  }, []);

  const upperBoundP2 = useDerivedValue(() => {
    'worklet';
    return vec(meterX + meterWidth, upperBoundY.value);
  }, []);

  const lowerBoundP1 = useDerivedValue(() => {
    'worklet';
    return vec(meterX, lowerBoundY.value);
  }, []);

  const lowerBoundP2 = useDerivedValue(() => {
    'worklet';
    return vec(meterX + meterWidth, lowerBoundY.value);
  }, []);

  const currentValueP1 = useDerivedValue(() => {
    'worklet';
    return vec(meterX, currentValueY.value);
  }, []);

  const currentValueP2 = useDerivedValue(() => {
    'worklet';
    return vec(meterX + meterWidth, currentValueY.value);
  }, []);

  // Fade bound line points (fixed at depth bounds)
  const fadeMaxP1 = useDerivedValue(() => {
    'worklet';
    return vec(meterX, fadeMaxBoundY.value);
  }, []);

  const fadeMaxP2 = useDerivedValue(() => {
    'worklet';
    return vec(meterX + meterWidth, fadeMaxBoundY.value);
  }, []);

  const fadeMinP1 = useDerivedValue(() => {
    'worklet';
    return vec(meterX, fadeMinBoundY.value);
  }, []);

  const fadeMinP2 = useDerivedValue(() => {
    'worklet';
    return vec(meterX + meterWidth, fadeMinBoundY.value);
  }, []);

  // Generate horizontal grid lines (4 divisions = 5 lines including top/bottom)
  // Center line (i=2) is slightly more visible to match LFO visualizer
  const gridLines = [];
  const gridDivisions = 4;
  for (let i = 0; i <= gridDivisions; i++) {
    const y = meterTop + (i / gridDivisions) * meterHeight;
    const isCenter = i === gridDivisions / 2;
    gridLines.push(
      <Line
        key={`grid-${i}`}
        p1={{ x: meterX, y }}
        p2={{ x: meterX + meterWidth, y }}
        color="#ffffff"
        strokeWidth={1}
        opacity={isCenter ? 0.35 : 0.25}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Canvas style={{ width, height, backgroundColor: '#000000', opacity: isPaused ? 0.5 : 1 }}>
        {/* Background track */}
        <RoundedRect
          x={meterX}
          y={meterTop}
          width={meterWidth}
          height={meterHeight}
          r={4}
          color="#000000"
        />

        {/* Grid lines - drawn first so they're behind everything */}
        <Group>
          {gridLines}
        </Group>

        {/* Modulation range - orange filled area showing depth bounds, fades in when editing ends */}
        {depth !== 0 && (
          <Rect
            x={meterX}
            y={upperBoundY}
            width={meterWidth}
            height={boundRangeHeight}
            color="#ff6600"
            opacity={modulationRangeOpacity}
          />
        )}

        {/* Upper bound line - white when MAX selected (only if no fade), orange otherwise */}
        {depth !== 0 && (
          <Line
            p1={upperBoundP1}
            p2={upperBoundP2}
            color={displayMode === 'MAX' && !hasFade ? '#ffffff' : '#ff6600'}
            strokeWidth={displayMode === 'MAX' && !hasFade ? 2.5 : 1.5}
          />
        )}

        {/* Lower bound line - white when MIN selected (only if no fade), orange otherwise */}
        {depth !== 0 && (
          <Line
            p1={lowerBoundP1}
            p2={lowerBoundP2}
            color={displayMode === 'MIN' && !hasFade ? '#ffffff' : '#ff6600'}
            strokeWidth={displayMode === 'MIN' && !hasFade ? 2.5 : 1.5}
          />
        )}

        {/* Fade curve bounds - cyan lines showing fixed min/max of fade-adjusted curve */}
        {/* When MIN/MAX is selected, highlight the corresponding fade line instead of the orange one */}
        {depth !== 0 && hasFade && (
          <>
            {/* Fade MAX - fixed at the peak value along the fade curve */}
            <Line
              p1={fadeMaxP1}
              p2={fadeMaxP2}
              color={displayMode === 'MAX' ? '#ffffff' : '#00cccc'}
              strokeWidth={displayMode === 'MAX' ? 2.5 : 1.5}
              opacity={displayMode === 'MAX' ? 1 : 0.6}
            />
            {/* Fade MIN - fixed at the minimum value along the fade curve */}
            <Line
              p1={fadeMinP1}
              p2={fadeMinP2}
              color={displayMode === 'MIN' ? '#ffffff' : '#00cccc'}
              strokeWidth={displayMode === 'MIN' ? 2.5 : 1.5}
              opacity={displayMode === 'MIN' ? 1 : 0.6}
            />
          </>
        )}

        {/* Animated current value - white when VALUE selected, orange otherwise (fades when editing) */}
        <Group opacity={currentValueOpacity}>
          <Line
            p1={currentValueP1}
            p2={currentValueP2}
            color={displayMode === 'VALUE' ? '#ffffff' : '#ff6600'}
            strokeWidth={displayMode === 'VALUE' ? 2.5 : 1.5}
          />
        </Group>
      </Canvas>

      {/* Value display - tappable to cycle through VALUE/MIN/MAX */}
      {/* Added padding and hitSlop to prevent accidental taps from visualization above */}
      <Pressable
        style={styles.valueContainer}
        onPress={handleDisplayModePress}
        hitSlop={{ top: 4, bottom: 8, left: 12, right: 12 }}
      >
        <Text style={styles.valueText}>
          {!showValue
            ? '—'
            : displayMode === 'VALUE'
              ? (shouldHideValue ? Math.round(centerValue) : currentValue)
              : displayMode === 'MIN'
                ? Math.round(hasFade ? fadeActualMin : targetLowerBound)
                : Math.round(hasFade ? fadeActualMax : targetUpperBound)}
        </Text>
        <Text style={styles.valueLabel}>
          {displayMode}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  valueContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#000000',
  },
  valueText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  valueLabel: {
    color: '#8888a0',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
