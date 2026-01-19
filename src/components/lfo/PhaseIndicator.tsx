import React from 'react';
import { Line, Circle, Group, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import type { PhaseIndicatorProps } from './types';
import { sampleWaveformWorklet } from './worklets';

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
  fade,
  mode,
}: PhaseIndicatorProps) {
  // Default opacity to 1 if not provided
  const defaultOpacity = useSharedValue(1);
  const opacity = opacityProp ?? defaultOpacity;
  const padding = 8;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Start phase offset (0-127 → 0.0-~1.0)
  const startPhaseNormalized = (startPhase || 0) / 128;
  const depthScale = depth !== undefined ? depth / 63 : 1;
  // Check if fade applies (only when fade is set and mode is not FRE)
  const fadeApplies = fade !== undefined && fade !== 0 && mode !== 'FRE';
  const fadeValue = fade ?? 0;

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

  // Animated Y position - calculated to match visualization exactly
  // When fade is active, we calculate the expected value at current phase
  // using the same formula as FadeEnvelope
  const yPosition = useDerivedValue(() => {
    'worklet';
    const phaseVal = typeof phase === 'number' ? phase : phase.value;

    // If we have waveform info, calculate position to match visualization
    if (waveform) {
      // Get the display phase (shifted for visualization)
      const displayPhase = ((phaseVal - startPhaseNormalized) % 1 + 1) % 1;

      // Sample the waveform at the actual phase position
      const waveformPhase = phaseVal;
      let value = sampleWaveformWorklet(waveform, waveformPhase);

      // Apply depth scaling
      value = value * depthScale;

      // Apply fade envelope (same formula as FadeEnvelope component)
      if (fadeApplies) {
        const absFade = Math.abs(fadeValue);
        const fadeDuration = (64 - absFade) / 64;

        let fadeEnvelope: number;
        if (fadeValue < 0) {
          // Fade-in: envelope goes from 0 to 1 over fadeDuration
          fadeEnvelope = fadeDuration > 0 ? Math.min(1, displayPhase / fadeDuration) : 1;
        } else {
          // Fade-out: envelope goes from 1 to 0 over fadeDuration
          fadeEnvelope = fadeDuration > 0 ? Math.max(0, 1 - displayPhase / fadeDuration) : 0;
        }
        value = value * fadeEnvelope;
      }

      return centerY + value * scaleY;
    }

    // Fallback to using output value directly
    return centerY + output.value * scaleY;
  }, [phase, output, centerY, scaleY, waveform, depthScale, fadeApplies, fadeValue, startPhaseNormalized]);

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
