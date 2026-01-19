import React from 'react';
import { Canvas, Rect, RoundedRect, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { DestinationDefinition } from '@/src/types/destination';

interface DestinationMeterProps {
  lfoOutput: SharedValue<number>;
  destination: DestinationDefinition;
  centerValue: number;
  depth: number;
  width?: number;
  height?: number;
}

export function DestinationMeter({
  lfoOutput,
  destination,
  centerValue,
  depth,
  width = 60,
  height = 200,
}: DestinationMeterProps) {
  const { min, max } = destination;
  const range = max - min;
  const maxModulation = range / 2;
  const depthScale = depth / 63;

  // Calculate the current modulated value position
  const meterFillHeight = useDerivedValue(() => {
    'worklet';
    const modulationAmount = lfoOutput.value * depthScale * maxModulation;
    const currentValue = centerValue + modulationAmount;
    const clampedValue = Math.max(min, Math.min(max, currentValue));
    const normalized = (clampedValue - min) / range;
    return normalized * (height - 20); // Leave padding
  }, [lfoOutput, centerValue, depthScale, maxModulation, min, max, range, height]);

  // Center line position
  const centerLineY = height - 10 - ((centerValue - min) / range) * (height - 20);

  // Meter bar (background)
  const meterX = 10;
  const meterWidth = width - 20;

  return (
    <Canvas style={{ width, height }}>
      {/* Background track */}
      <RoundedRect
        x={meterX}
        y={10}
        width={meterWidth}
        height={height - 20}
        r={4}
        color="#1a1a1a"
      />

      {/* Animated fill bar */}
      <Group>
        <RoundedRect
          x={meterX}
          y={useDerivedValue(() => {
            'worklet';
            return height - 10 - meterFillHeight.value;
          }, [meterFillHeight])}
          width={meterWidth}
          height={meterFillHeight}
          r={4}
          color="#ff6600"
        />
      </Group>

      {/* Center value indicator line */}
      <Rect
        x={meterX - 4}
        y={centerLineY - 1}
        width={meterWidth + 8}
        height={2}
        color="#ffffff"
      />
    </Canvas>
  );
}
