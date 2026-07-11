import React from 'react';
import { Group, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { WaveformType } from './types';
import { sampleDisplayValue } from './worklets';
import { SPH_DISPLAY_DIVISOR } from './constants';

interface FadedWaveformCurveProps {
  waveform: WaveformType;
  width: number;
  height: number;
  color: string;
  /** Current fade multiplier from LFO engine (0.0 to 1.0) */
  fadeMultiplier: SharedValue<number>;
  /** Fade direction: negative = fade-in, positive = fade-out */
  fadeDirection: number;
  resolution?: number;
  depth?: number;
  speed?: number;
  strokeWidth?: number;
  startPhase?: number;
}

/**
 * FadedWaveformCurve draws the waveform trajectory scaled by the current fadeMultiplier.
 * This shows where the output will go during the current cycle.
 *
 * - For fade-in: curve grows as fadeMultiplier increases 0→1
 * - For fade-out: curve shrinks as fadeMultiplier decreases 1→0
 * - Hides when fade is complete
 */
export function FadedWaveformCurve({
  waveform,
  width,
  height,
  color,
  fadeMultiplier,
  fadeDirection,
  resolution = 128,
  depth,
  speed,
  strokeWidth = 2,
  startPhase,
}: FadedWaveformCurveProps) {
  const padding = 8;
  const strokePadding = strokeWidth / 2;
  const effectivePadding = padding + strokePadding;
  const depthScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;
  const hasNegativeSpeed = speed !== undefined && speed < 0;
  const startPhaseNormalized = (startPhase || 0) / SPH_DISPLAY_DIVISOR;

  const drawWidth = width - padding * 2;
  const drawHeight = height - effectivePadding * 2;
  const centerY = height / 2;
  const scaleY = -drawHeight / 2;

  // Pre-compute base waveform samples (without fade scaling)
  const baseSamples: number[] = [];
  for (let i = 0; i <= resolution; i++) {
    const xNormalized = i / resolution;
    const waveformPhase = (xNormalized + startPhaseNormalized) % 1;

    baseSamples.push(sampleDisplayValue(waveform, waveformPhase, hasNegativeSpeed) * depthScale);
  }

  // Create animated path that scales with fadeMultiplier
  const animatedPath = useDerivedValue(() => {
    'worklet';
    const fadeMult = fadeMultiplier.value;

    const p = Skia.PathBuilder.Make();

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      const baseValue = baseSamples[i];

      // Scale by current fadeMultiplier
      const value = baseValue * fadeMult;

      const x = padding + xNormalized * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        p.moveTo(x, y);
      } else {
        p.lineTo(x, y);
      }
    }

    return p.detach();
  }, [fadeMultiplier, baseSamples, resolution, padding, drawWidth, centerY, scaleY]);

  // Animate opacity - fade out as we approach completion
  const animatedOpacity = useDerivedValue(() => {
    'worklet';
    const fadeMult = fadeMultiplier.value;

    if (fadeDirection < 0) {
      // Fade-in: hide when fadeMultiplier reaches 1
      // Start fading out the curve at 80% completion
      if (fadeMult >= 1) return 0;
      if (fadeMult >= 0.8) return (1 - fadeMult) * 5 * 0.5; // 0.5 max opacity, fade out
      return 0.5;
    } else {
      // Fade-out: hide when fadeMultiplier reaches 0
      // Start fading out the curve at 20% remaining
      if (fadeMult <= 0) return 0;
      if (fadeMult <= 0.2) return fadeMult * 5 * 0.5;
      return 0.5;
    }
  }, [fadeMultiplier, fadeDirection]);

  return (
    <Group opacity={animatedOpacity}>
      <Path
        path={animatedPath}
        color={color}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </Group>
  );
}
