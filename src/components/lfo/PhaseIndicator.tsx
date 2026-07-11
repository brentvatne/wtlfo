import React from 'react';
import { Line, Circle, Group, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { PhaseIndicatorProps } from './types';
import { sampleDisplayValue } from './worklets';

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
  waveform,
  depth,
  speed,
  fade,
  mode,
  fadeMultiplier,
  randomSeed,
}: PhaseIndicatorProps) {
  // Default opacity to 1 if not provided
  const defaultOpacity = useSharedValue(1);
  const opacity = opacityProp ?? defaultOpacity;
  const padding = 8;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // For RND waveform, startPhase acts as SLEW (0=sharp S&H, 127=max smoothing)
  // For other waveforms, it's a phase offset (0-127 → 0.0-~1.0)
  const isRandom = waveform === 'RND';
  const slewValue = isRandom ? (startPhase || 0) : 0;
  // Standard SPH/128 for all waveforms (matches engine behavior)
  // Note: visualization uses SPH/127 for EXP display quirk, but indicator tracks engine
  const startPhaseNormalized = isRandom ? 0 : (startPhase || 0) / 128;
  // Clamp to [-1, 1] to handle asymmetric range (-64 to +63)
  const depthScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;
  const hasNegativeSpeed = speed !== undefined && speed < 0;
  // Fade applies whenever a non-zero FADE is set outside FRE mode
  const fadeCanApply = fade !== undefined && fade !== 0 && mode !== 'FRE';

  // Always use bipolar coordinate system (-1 to 1, centered) for consistency
  const centerY = height / 2;
  const scaleY = -drawHeight / 2;

  // Animated X position based on phase, shifted so startPhaseNormalized appears at x=0
  const xPosition = useDerivedValue(() => {
    'worklet';
    const phaseVal = typeof phase === 'number' ? phase : phase.value;
    // Calculate display phase (offset from start phase)
    const displayPhase = ((phaseVal - startPhaseNormalized) % 1 + 1) % 1;
    return padding + displayPhase * drawWidth;
  }, [phase, padding, drawWidth, startPhaseNormalized]);

  // Animated Y position - calculated to match visualization exactly
  // When fade is active, we scale by the engine's fade multiplier
  const yPosition = useDerivedValue(() => {
    'worklet';
    const phaseVal = typeof phase === 'number' ? phase : phase.value;
    // Read randomSeed - handle both number and SharedValue
    const seedValue = randomSeed === undefined ? 0 : (typeof randomSeed === 'number' ? randomSeed : (randomSeed as SharedValue<number>).value);

    // If we have waveform info, calculate position to match visualization
    if (waveform) {
      // Sample the waveform at the engine phase
      const waveformPhase = phaseVal;

      // Sample via the shared display pipeline, then apply depth scaling
      let value = sampleDisplayValue(waveform, waveformPhase, hasNegativeSpeed, slewValue, seedValue) * depthScale;

      // Apply fade envelope using the engine's fade multiplier (time-based,
      // can span multiple cycles). If the prop is absent, no fade (multiplier 1).
      if (fadeCanApply && fadeMultiplier !== undefined) {
        value = value * fadeMultiplier.value;
      }

      return centerY + value * scaleY;
    }

    // Fallback to using output value directly
    return centerY + output.value * scaleY;
  }, [phase, output, centerY, scaleY, waveform, depthScale, hasNegativeSpeed, fadeCanApply, fadeMultiplier, randomSeed, isRandom, slewValue]);

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
