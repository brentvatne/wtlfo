import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Canvas, Rect, RoundedRect, Group, Line, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useAnimatedReaction, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
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
}: DestinationMeterProps) {
  // Handle null destination (none selected) - show empty meter
  const min = destination?.min ?? 0;
  const max = destination?.max ?? 127;
  const range = max - min;
  const maxModulation = range / 2;
  const depthScale = Math.abs(depth) / 63;

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

  // Animate when values change with a subtle spring (no overshoot)
  const springConfig = { damping: 40, stiffness: 380, overshootClamping: true };
  useEffect(() => {
    animatedCenterValue.value = withSpring(centerValue, springConfig);
    animatedLowerBound.value = withSpring(targetLowerBound, springConfig);
    animatedUpperBound.value = withSpring(targetUpperBound, springConfig);
  }, [centerValue, targetLowerBound, targetUpperBound]);

  // Track current value for display
  const [currentValue, setCurrentValue] = useState(centerValue);

  // Update current value from animation
  // Note: lfoOutput is already depth-scaled by the LFO engine (range: -depth/63 to +depth/63)
  useAnimatedReaction(
    () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
    ({ output, center }) => {
      const modulationAmount = output * maxModulation;
      const value = Math.round(Math.max(min, Math.min(max, center + modulationAmount)));
      runOnJS(setCurrentValue)(value);
    },
    [maxModulation, min, max]
  );

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
      <Canvas style={{ width, height, backgroundColor: '#000000' }}>
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

        {/* Upper bound line - orange */}
        {depth !== 0 && (
          <Line
            p1={upperBoundP1}
            p2={upperBoundP2}
            color="#ff6600"
            strokeWidth={1.5}
          />
        )}

        {/* Lower bound line - orange */}
        {depth !== 0 && (
          <Line
            p1={lowerBoundP1}
            p2={lowerBoundP2}
            color="#ff6600"
            strokeWidth={1.5}
          />
        )}

        {/* Animated current value - white line */}
        <Group>
          <Line
            p1={currentValueP1}
            p2={currentValueP2}
            color="#ffffff"
            strokeWidth={2.5}
          />
        </Group>
      </Canvas>

      {/* Current value display - matches TimingInfo styling */}
      <View style={styles.valueContainer}>
        <Text style={[styles.valueText, !showValue && styles.valueHidden]}>
          {currentValue}
        </Text>
        <Text style={[styles.valueLabel, !showValue && styles.valueHidden]}>
          VALUE
        </Text>
      </View>
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
    color: '#666677',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  valueHidden: {
    opacity: 0,
  },
});
