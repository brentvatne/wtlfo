import React, { useState } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Canvas, Rect, RoundedRect, Group, Line } from '@shopify/react-native-skia';
import { useDerivedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { DestinationDefinition } from '@/src/types/destination';

interface DestinationMeterProps {
  lfoOutput: SharedValue<number>;
  destination: DestinationDefinition | null;
  centerValue: number;
  depth: number;
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

  // Calculate bounds based on depth
  const swing = maxModulation * depthScale;
  const lowerBound = Math.max(min, centerValue - swing);
  const upperBound = Math.min(max, centerValue + swing);

  // Track current value for display
  const [currentValue, setCurrentValue] = useState(centerValue);

  // Update current value from animation
  // Note: lfoOutput is already depth-scaled by the LFO engine (range: -depth/63 to +depth/63)
  useAnimatedReaction(
    () => lfoOutput.value,
    (output) => {
      const modulationAmount = output * maxModulation;
      const value = Math.round(Math.max(min, Math.min(max, centerValue + modulationAmount)));
      runOnJS(setCurrentValue)(value);
    },
    [centerValue, maxModulation, min, max]
  );

  // Calculate the current modulated value position
  // lfoOutput is already depth-scaled, so we only multiply by maxModulation
  const meterFillHeight = useDerivedValue(() => {
    'worklet';
    const modulationAmount = lfoOutput.value * maxModulation;
    const currentVal = centerValue + modulationAmount;
    const clampedValue = Math.max(min, Math.min(max, currentVal));
    const normalized = (clampedValue - min) / range;
    return normalized * (height - 16); // Leave padding
  }, [lfoOutput, centerValue, maxModulation, min, max, range, height]);

  // Position calculations
  const meterX = 8;
  const meterWidth = width - 16;
  const meterTop = 8;
  const meterHeight = height - 16;

  // Upper and lower bound Y positions
  const upperBoundY = meterTop + meterHeight - ((upperBound - min) / range) * meterHeight;
  const lowerBoundY = meterTop + meterHeight - ((lowerBound - min) / range) * meterHeight;

  // Animated current value Y position
  const currentValueY = useDerivedValue(() => {
    'worklet';
    return meterTop + meterHeight - meterFillHeight.value;
  }, [meterFillHeight, meterTop, meterHeight]);

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
            height={lowerBoundY - upperBoundY}
            color="rgba(255, 102, 0, 0.2)"
          />
        )}

        {/* Upper bound line - orange */}
        {depth !== 0 && (
          <Line
            p1={{ x: meterX, y: upperBoundY }}
            p2={{ x: meterX + meterWidth, y: upperBoundY }}
            color="#ff6600"
            strokeWidth={1.5}
          />
        )}

        {/* Lower bound line - orange */}
        {depth !== 0 && (
          <Line
            p1={{ x: meterX, y: lowerBoundY }}
            p2={{ x: meterX + meterWidth, y: lowerBoundY }}
            color="#ff6600"
            strokeWidth={1.5}
          />
        )}

        {/* Animated current value - white line */}
        <Group>
          <Line
            p1={useDerivedValue(() => ({ x: meterX, y: currentValueY.value }), [currentValueY, meterX])}
            p2={useDerivedValue(() => ({ x: meterX + meterWidth, y: currentValueY.value }), [currentValueY, meterX, meterWidth])}
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
