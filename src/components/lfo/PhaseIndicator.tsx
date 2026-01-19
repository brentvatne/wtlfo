import React from 'react';
import { Line, Circle, Group, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import type { PhaseIndicatorProps } from './types';

export function PhaseIndicator({
  phase,
  output,
  width,
  height,
  color,
  showDot = true,
  dotRadius = 6,
  startPhase,
  opacity: opacityProp,
}: PhaseIndicatorProps) {
  // Default opacity to 1 if not provided
  const defaultOpacity = useSharedValue(1);
  const opacity = opacityProp ?? defaultOpacity;
  const padding = 8;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Start phase offset (0-127 → 0.0-~1.0)
  const startPhaseNormalized = (startPhase || 0) / 128;

  // Always use bipolar coordinate system (-1 to 1, centered) for consistency
  const centerY = height / 2;
  const scaleY = -drawHeight / 2;

  // Animated X position based on phase, shifted so startPhaseNormalized appears at x=0
  const xPosition = useDerivedValue(() => {
    'worklet';
    const phaseVal = typeof phase === 'number' ? phase : phase.value;
    // Shift phase so startPhaseNormalized appears at x=0
    const displayPhase = ((phaseVal - startPhaseNormalized) % 1 + 1) % 1;
    return padding + displayPhase * drawWidth;
  }, [phase, padding, drawWidth, startPhaseNormalized]);

  // Animated Y position based on output value
  // Note: centerY and scaleY are passed explicitly to ensure worklet gets current values
  const yPosition = useDerivedValue(() => {
    'worklet';
    return centerY + output.value * scaleY;
  }, [output, centerY, scaleY]);

  // Create point vectors for the line
  const p1 = useDerivedValue(() => {
    'worklet';
    return vec(xPosition.value, padding);
  }, [xPosition]);

  const p2 = useDerivedValue(() => {
    'worklet';
    return vec(xPosition.value, height - padding);
  }, [xPosition]);

  // Derived opacity for the line (half of main opacity)
  const lineOpacity = useDerivedValue(() => {
    'worklet';
    return opacity.value * 0.5;
  }, [opacity]);

  return (
    <Group opacity={opacity}>
      {/* Vertical line showing current phase position */}
      <Line
        p1={p1}
        p2={p2}
        color={color}
        style="stroke"
        strokeWidth={1}
        opacity={lineOpacity}
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
