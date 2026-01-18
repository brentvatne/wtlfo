import React from 'react';
import { Line, Circle, Group, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { PhaseIndicatorProps } from './types';
import { isUnipolar } from './hooks/useWaveformPath';

export function PhaseIndicator({
  phase,
  output,
  width,
  height,
  color,
  showDot = true,
  dotRadius = 6,
  waveform,
}: PhaseIndicatorProps) {
  const padding = 8;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Determine if unipolar for Y calculation
  const unipolar = waveform ? isUnipolar(waveform) : false;
  const centerY = unipolar ? height - padding : height / 2;
  const scaleY = unipolar ? -drawHeight : -drawHeight / 2;

  // Animated X position based on phase
  const xPosition = useDerivedValue(() => {
    'worklet';
    const phaseVal = typeof phase === 'number' ? phase : phase.value;
    return padding + phaseVal * drawWidth;
  }, [phase]);

  // Animated Y position based on output value
  const yPosition = useDerivedValue(() => {
    'worklet';
    return centerY + output.value * scaleY;
  }, [output]);

  // Create point vectors for the line
  const p1 = useDerivedValue(() => {
    'worklet';
    return vec(xPosition.value, padding);
  }, [xPosition]);

  const p2 = useDerivedValue(() => {
    'worklet';
    return vec(xPosition.value, height - padding);
  }, [xPosition]);

  return (
    <Group>
      {/* Vertical line showing current phase position */}
      <Line
        p1={p1}
        p2={p2}
        color={color}
        style="stroke"
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Dot at current output value */}
      {showDot && (
        <Circle
          cx={xPosition}
          cy={yPosition}
          r={dotRadius}
          color={color}
        />
      )}
    </Group>
  );
}
