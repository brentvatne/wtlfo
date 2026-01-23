import React, { useMemo, useEffect } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

const BASE_FILL_OPACITY = 0.2;

interface RandomWaveformProps {
  samples: Array<{ phase: number; value: number }>;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  depth?: number;
  /** Speed value. Negative speed inverts the output (separate from depth inversion). */
  speed?: number;
  /** Start phase offset (0-127) to shift display position */
  startPhase?: number;
  /** When true, hides the fill (while actively editing depth) */
  isEditing?: boolean;
  /** Duration in ms for fade-in when editing ends (default 350) */
  editFadeInDuration?: number;
}

/**
 * RandomWaveform renders the actual random samples as a stepped line.
 * This shows the real sample-and-hold values from the LFO engine.
 */
export function RandomWaveform({
  samples,
  width,
  height,
  strokeColor,
  strokeWidth,
  fillColor,
  depth,
  speed,
  startPhase,
  isEditing = false,
  editFadeInDuration = 350,
}: RandomWaveformProps) {
  // Animated fill opacity - fades in when editing ends
  const fillOpacity = useSharedValue(isEditing ? 0 : BASE_FILL_OPACITY);

  useEffect(() => {
    if (isEditing) {
      // Instantly hide when editing starts
      fillOpacity.value = 0;
    } else {
      // Fade in when editing ends
      fillOpacity.value = withTiming(BASE_FILL_OPACITY, {
        duration: editFadeInDuration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isEditing, editFadeInDuration, fillOpacity]);

  const padding = 8;
  // Clamp to [-1, 1] to handle asymmetric range (-64 to +63)
  const depthScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;
  // Negative speed inverts the output (separate from depth inversion)
  const speedInvert = speed !== undefined && speed < 0 ? -1 : 1;
  const startPhaseNormalized = (startPhase || 0) / 128;

  const { strokePath, fillPath } = useMemo(() => {
    const stroke = Skia.Path.Make();
    const fill = Skia.Path.Make();

    if (samples.length === 0) {
      return { strokePath: stroke, fillPath: fill };
    }

    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const centerY = height / 2;
    const scaleY = -drawHeight / 2;
    const startX = padding;
    const endX = padding + drawWidth;

    // Shift samples so startPhaseNormalized appears at x=0
    // displayPhase = (sample.phase - startPhaseNormalized + 1) % 1
    const shiftedSamples = samples.map(s => ({
      ...s,
      displayPhase: ((s.phase - startPhaseNormalized) % 1 + 1) % 1,
    }));

    // Sort by display phase for correct drawing order
    shiftedSamples.sort((a, b) => a.displayPhase - b.displayPhase);

    // Draw stepped line through samples
    for (let i = 0; i < shiftedSamples.length; i++) {
      const sample = shiftedSamples[i];
      const x = padding + sample.displayPhase * drawWidth;
      // Apply speed inversion first, then depth scaling (matches engine order)
      const scaledValue = sample.value * speedInvert * depthScale;
      const y = centerY + scaledValue * scaleY;

      if (i === 0) {
        // Start from left edge at the first sample's value
        stroke.moveTo(padding, y);
        stroke.lineTo(x, y);
        fill.moveTo(padding, y);
        fill.lineTo(x, y);
      } else {
        // Horizontal line to this sample's x position at previous y
        const prevY = centerY + shiftedSamples[i - 1].value * speedInvert * depthScale * scaleY;
        stroke.lineTo(x, prevY);
        stroke.lineTo(x, y);
        fill.lineTo(x, prevY);
        fill.lineTo(x, y);
      }
    }

    // Extend to right edge if we have samples
    if (shiftedSamples.length > 0) {
      const lastSample = shiftedSamples[shiftedSamples.length - 1];
      const lastY = centerY + lastSample.value * speedInvert * depthScale * scaleY;
      stroke.lineTo(endX, lastY);
      fill.lineTo(endX, lastY);

      // Close fill path to baseline
      fill.lineTo(endX, centerY);
      fill.lineTo(startX, centerY);
      fill.close();
    }

    return { strokePath: stroke, fillPath: fill };
  }, [samples, width, height, depthScale, speedInvert, startPhaseNormalized]);

  if (samples.length === 0) {
    return null;
  }

  return (
    <>
      {fillColor && (
        <Path path={fillPath} color={fillColor} style="fill" opacity={fillOpacity} />
      )}
      <Path
        path={strokePath}
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </>
  );
}
