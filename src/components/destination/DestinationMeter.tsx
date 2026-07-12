import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Platform, type ViewStyle } from 'react-native';
import { Canvas, Rect, RoundedRect, Group, Line, vec, Text as SkiaText } from '@shopify/react-native-skia';
import { getValueFont, getLabelFont } from '@/src/components/lfo/utils/skiaFont';

type DisplayMode = 'VALUE' | 'MIN' | 'MAX';
import { useDerivedValue, useSharedValue, withTiming, withSequence, Easing, cancelAnimation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { DestinationDefinition } from '@/src/types/destination';
import type { WaveformType, TriggerMode } from '@/src/components/lfo/types';
import { DEFAULT_EDIT_FADE_IN, DEFAULT_EDIT_FADE_OUT } from '@/src/context/preset-context';

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
  /** When true, hides the current value line and shows center value instead */
  isEditing?: boolean;
  /** When true, keeps fill areas visible while editing (default true) */
  showFillsWhenEditing?: boolean;
  /** Duration in ms for fade-out when editing starts (default 100) */
  editFadeOutDuration?: number;
  /** Duration in ms for fade-in when editing ends */
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
  showFillsWhenEditing = true,
  editFadeOutDuration = DEFAULT_EDIT_FADE_OUT,
  editFadeInDuration = DEFAULT_EDIT_FADE_IN,
  isPaused = false,
}: DestinationMeterProps) {
  // Always hide values while editing
  const shouldHideValue = isEditing;
  // Only hide fills if editing AND the setting says to hide them
  const shouldHideFill = isEditing && !showFillsWhenEditing;

  // Skia fonts for text rendering (bundled typefaces on web, system on native)
  const valueFont = useMemo(() => getValueFont(14), []);
  const labelFont = useMemo(() => getLabelFont(10), []);

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

  // Effect for current value line opacity
  // Handles: editing state changes, waveform changes, and their combinations
  useEffect(() => {
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
  }, [shouldHideValue, waveform, currentValueOpacity, editFadeOutDuration, editFadeInDuration]);

  // Separate effect for modulation range fill opacity (controlled by showFillsWhenEditing)
  useEffect(() => {
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
  }, [shouldHideFill, modulationRangeOpacity, editFadeInDuration]);

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

  // Display mode as SharedValue (0=VALUE, 1=MIN, 2=MAX) so it can be read in worklets
  const displayModeIndex = useSharedValue(0);
  const DISPLAY_MODES: DisplayMode[] = ['VALUE', 'MIN', 'MAX'];

  // React state for display mode (for JSX line highlighting - updates immediately on tap)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('VALUE');

  // Cycle through display modes on tap - updates both SharedValue and React state
  const handleDisplayModePress = useCallback(() => {
    const newIndex = (displayModeIndex.value + 1) % 3;
    displayModeIndex.value = newIndex;
    setDisplayMode(DISPLAY_MODES[newIndex]);
  }, [displayModeIndex]);

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

  // Calculate the "target" (unfaded) value position - where LFO would be at full depth
  const targetFillHeight = useDerivedValue(() => {
    'worklet';
    // No fade multiplier - show full depth target
    const modulationAmount = lfoOutput.value * maxModulation;
    const targetVal = animatedCenterValue.value + modulationAmount;
    const clampedValue = Math.max(min, Math.min(max, targetVal));
    const normalized = (clampedValue - min) / range;
    return normalized * (height - 16);
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

  // Compute the display text entirely on UI thread (no JS callback needed)
  // This reads displayModeIndex to determine what to show
  // MIN/MAX always show full depth bounds (not fade-adjusted)
  const minBoundValue = targetLowerBound;
  const maxBoundValue = targetUpperBound;

  const displayText = useDerivedValue(() => {
    'worklet';
    // Handle showValue=false case
    if (!showValue) return '—';

    const mode = displayModeIndex.value;

    if (mode === 0) {
      // VALUE mode - compute from lfoOutput
      // When editing, show centerValue instead of computed value
      if (shouldHideValue) {
        return centerValue.toFixed(2);
      }
      const fadeMult = fadeMultiplier?.value ?? 1;
      const modulationAmount = lfoOutput.value * maxModulation * fadeMult;
      const value = Math.max(min, Math.min(max, centerValue + modulationAmount));
      return value.toFixed(2);
    } else if (mode === 1) {
      // MIN mode
      return minBoundValue.toFixed(2);
    } else {
      // MAX mode
      return maxBoundValue.toFixed(2);
    }
  }, [showValue, shouldHideValue, centerValue, fadeMultiplier, lfoOutput, maxModulation, min, max, minBoundValue, maxBoundValue, displayModeIndex]);

  // Label text - derived from displayModeIndex
  const displayLabelText = useDerivedValue(() => {
    'worklet';
    const modes = ['VALUE', 'MIN', 'MAX'];
    return modes[displayModeIndex.value];
  }, [displayModeIndex]);

  // Text centering - calculate x positions using actual font measurements
  const valueTextX = useDerivedValue(() => {
    'worklet';
    const text = displayText.value;
    if (!text) return width / 2;
    const textWidth = valueFont.getTextWidth(text);
    return (width - textWidth) / 2;
  }, [displayText, width, valueFont]);

  const labelTextX = useDerivedValue(() => {
    'worklet';
    const text = displayLabelText.value;
    const textWidth = labelFont.getTextWidth(text);
    return (width - textWidth) / 2;
  }, [displayLabelText, width, labelFont]);

  // Animated current value Y position
  const currentValueY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - meterFillHeight.value;
  }, [meterTop, meterHeight]);

  // Animated target (unfaded) value Y position
  const targetValueY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - targetFillHeight.value;
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

  // Target (unfaded) value line points
  const targetValueP1 = useDerivedValue(() => {
    'worklet';
    return vec(meterX, targetValueY.value);
  }, []);

  const targetValueP2 = useDerivedValue(() => {
    'worklet';
    return vec(meterX + meterWidth, targetValueY.value);
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

        {/* Upper bound line - white when MAX selected, orange otherwise */}
        {depth !== 0 && (
          <Line
            p1={upperBoundP1}
            p2={upperBoundP2}
            color={displayMode === 'MAX' ? '#ffffff' : '#ff6600'}
            strokeWidth={displayMode === 'MAX' ? 2.5 : 1.5}
          />
        )}

        {/* Lower bound line - white when MIN selected, orange otherwise */}
        {depth !== 0 && (
          <Line
            p1={lowerBoundP1}
            p2={lowerBoundP2}
            color={displayMode === 'MIN' ? '#ffffff' : '#ff6600'}
            strokeWidth={displayMode === 'MIN' ? 2.5 : 1.5}
          />
        )}

        {/* Target (unfaded) value - dimmer line showing where LFO "wants" to be at full depth */}
        {/* Only show when fade is active (not complete) */}
        {hasFade && (
          <Group opacity={currentValueOpacity}>
            <Line
              p1={targetValueP1}
              p2={targetValueP2}
              color="#ff6600"
              strokeWidth={1}
              opacity={0.4}
            />
          </Group>
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

      {/* Value display - Skia text for UI-thread rendering */}
      {/* Only render when showValue is true */}
      {showValue && (
        <View style={styles.valueContainer}>
          <Canvas style={{ width, height: 32 }}>
            {/* Value text - centered horizontally, y is baseline */}
            <SkiaText
              x={valueTextX}
              y={14}
              text={displayText}
              font={valueFont}
              color="#ffffff"
            />
            {/* Label text - centered below value, y is baseline */}
            <SkiaText
              x={labelTextX}
              y={29}
              text={displayLabelText}
              font={labelFont}
              color="#8888a0"
            />
          </Canvas>
          {/* Transparent Pressable overlay for tap handling */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDisplayModePress}
            hitSlop={{ top: 4, bottom: 8, left: 12, right: 12 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  valueContainer: {
    backgroundColor: '#000000',
    paddingVertical: 12,
  },
});
