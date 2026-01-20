import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { Canvas, Rect, RoundedRect, Group, Line, vec } from '@shopify/react-native-skia';

type DisplayMode = 'VALUE' | 'MIN' | 'MAX';
import { useDerivedValue, useSharedValue, withTiming, withSequence, Easing } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { DestinationDefinition } from '@/src/types/destination';
import type { WaveformType } from '@/src/components/lfo/types';

// Unipolar waveforms only output 0 to 1 (not -1 to +1)
const UNIPOLAR_WAVEFORMS: WaveformType[] = ['EXP', 'RMP'];

interface DestinationMeterProps {
  lfoOutput: SharedValue<number>;
  destination: DestinationDefinition | null;
  centerValue: number;
  depth: number;
  waveform?: WaveformType;
  width?: number;
  height?: number;
  style?: ViewStyle;
  showValue?: boolean;
  /** When true, hides the current value line and shows center value instead */
  isEditing?: boolean;
  /** When false, disables hiding values while editing */
  hideValuesWhileEditing?: boolean;
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
  waveform = 'SIN',
  width = 60,
  height = 108,
  style,
  showValue = false,
  isEditing = false,
  hideValuesWhileEditing = true,
  editFadeOutDuration = 100,
  editFadeInDuration = 350,
  isPaused = false,
}: DestinationMeterProps) {
  // Only apply editing fade if setting is enabled
  const shouldHideValue = isEditing && hideValuesWhileEditing;
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

  // Single consolidated effect for current value opacity
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

  // Update values directly (no spring) to avoid ghosting during slider drag
  useEffect(() => {
    animatedCenterValue.value = centerValue;
    animatedLowerBound.value = targetLowerBound;
    animatedUpperBound.value = targetUpperBound;
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
  useEffect(() => {
    const interval = setInterval(() => {
      const modulationAmount = lfoOutput.value * maxModulation;
      const value = Math.round(Math.max(min, Math.min(max, centerValue + modulationAmount)));
      setCurrentValue(value);
    }, 33); // 30fps for text
    return () => clearInterval(interval);
  }, [lfoOutput, centerValue, maxModulation, min, max]);

  // Position calculations
  const meterX = 8;
  const meterWidth = width - 16;
  const meterTop = 8;
  const meterHeight = height - 16;

  // Calculate the current modulated value position (animated)
  // lfoOutput is already depth-scaled, so we only multiply by maxModulation
  const meterFillHeight = useDerivedValue(() => {
    'worklet';
    const modulationAmount = lfoOutput.value * maxModulation;
    const currentVal = animatedCenterValue.value + modulationAmount;
    const clampedValue = Math.max(min, Math.min(max, currentVal));
    const normalized = (clampedValue - min) / range;
    return normalized * (height - 16); // Leave padding
  }, [maxModulation, min, max, range, height]);

  // Animated upper and lower bound Y positions
  const upperBoundY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - ((animatedUpperBound.value - min) / range) * meterHeight;
  }, [meterTop, meterHeight, min, range]);

  const lowerBoundY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - ((animatedLowerBound.value - min) / range) * meterHeight;
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

  // Generate horizontal grid lines (4 divisions = 5 lines including top/bottom)
  const gridLines = [];
  const gridDivisions = 4;
  for (let i = 0; i <= gridDivisions; i++) {
    const y = meterTop + (i / gridDivisions) * meterHeight;
    gridLines.push(
      <Line
        key={`grid-${i}`}
        p1={{ x: meterX, y }}
        p2={{ x: meterX + meterWidth, y }}
        color="rgba(255, 255, 255, 0.15)"
        strokeWidth={1}
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

        {/* Modulation range - orange filled area showing depth bounds */}
        {depth !== 0 && (
          <Rect
            x={meterX}
            y={upperBoundY}
            width={meterWidth}
            height={boundRangeHeight}
            color="rgba(255, 102, 0, 0.2)"
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
      <Pressable style={styles.valueContainer} onPress={handleDisplayModePress}>
        <Text style={[styles.valueText, !showValue && styles.valueHidden]}>
          {displayMode === 'VALUE'
            ? (shouldHideValue ? Math.round(centerValue) : currentValue)
            : displayMode === 'MIN'
              ? Math.round(targetLowerBound)
              : Math.round(targetUpperBound)}
        </Text>
        <Text style={[styles.valueLabel, !showValue && styles.valueHidden]}>
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
    paddingVertical: 8,
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
  valueHidden: {
    opacity: 0,
  },
});
