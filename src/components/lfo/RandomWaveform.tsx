import React, { useEffect } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, useDerivedValue, Easing } from 'react-native-reanimated';
import { DEFAULT_DEPTH_ANIM_DURATION, DEFAULT_EDIT_FADE_IN } from '@/src/context/preset-context';

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
  /** Duration in ms for fade-in when editing ends */
  editFadeInDuration?: number;
  /** Duration in ms for depth scale animation (0 = instant) */
  depthAnimationDuration?: number;
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
  editFadeInDuration = DEFAULT_EDIT_FADE_IN,
  depthAnimationDuration = DEFAULT_DEPTH_ANIM_DURATION,
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
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;
  const centerY = height / 2;
  const scaleY = -drawHeight / 2;
  const speedInvert = speed !== undefined && speed < 0 ? -1 : 1;
  const startPhaseNormalized = (startPhase || 0) / 128;

  // Animated depth scale (-1 to 1, where depth/63 gives the scale factor)
  const depthScale = useSharedValue(depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1);

  // Animate depth changes (or set instantly if duration is 0)
  useEffect(() => {
    const targetScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;
    if (depthAnimationDuration === 0) {
      depthScale.value = targetScale;
    } else {
      depthScale.value = withTiming(targetScale, {
        duration: depthAnimationDuration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [depth, depthScale, depthAnimationDuration]);

  // Convert samples to shared value for worklet access
  const samplesData = useSharedValue(samples.map(s => ({ phase: s.phase, value: s.value })));

  // Update samples shared value when samples prop changes
  useEffect(() => {
    samplesData.value = samples.map(s => ({ phase: s.phase, value: s.value }));
  }, [samples, samplesData]);

  // Generate stroke path on UI thread with animated depth
  const strokePath = useDerivedValue(() => {
    'worklet';
    const path = Skia.Path.Make();
    const currentSamples = samplesData.value;
    const currentDepthScale = depthScale.value;

    if (currentSamples.length === 0) {
      return path;
    }

    const startX = padding;
    const endX = padding + drawWidth;

    // Shift samples so startPhaseNormalized appears at x=0
    const shiftedSamples = currentSamples.map(s => ({
      ...s,
      displayPhase: ((s.phase - startPhaseNormalized) % 1 + 1) % 1,
    }));

    // Sort by display phase for correct drawing order
    shiftedSamples.sort((a, b) => a.displayPhase - b.displayPhase);

    // Draw stepped line through samples with animated depth
    for (let i = 0; i < shiftedSamples.length; i++) {
      const sample = shiftedSamples[i];
      const x = padding + sample.displayPhase * drawWidth;
      const scaledValue = sample.value * speedInvert * currentDepthScale;
      const y = centerY + scaledValue * scaleY;

      if (i === 0) {
        const firstY = centerY + shiftedSamples[0].value * speedInvert * currentDepthScale * scaleY;
        path.moveTo(startX, firstY);
        path.lineTo(x, y);
      } else {
        const prevY = centerY + shiftedSamples[i - 1].value * speedInvert * currentDepthScale * scaleY;
        path.lineTo(x, prevY);
        path.lineTo(x, y);
      }
    }

    // Extend to right edge
    const lastSample = shiftedSamples[shiftedSamples.length - 1];
    const lastY = centerY + lastSample.value * speedInvert * currentDepthScale * scaleY;
    path.lineTo(endX, lastY);

    return path;
  }, [depthScale, samplesData, speedInvert, startPhaseNormalized, padding, drawWidth, centerY, scaleY]);

  // Generate fill path on UI thread with animated depth
  const fillPath = useDerivedValue(() => {
    'worklet';
    const path = Skia.Path.Make();
    const currentSamples = samplesData.value;
    const currentDepthScale = depthScale.value;

    if (currentSamples.length === 0) {
      return path;
    }

    const startX = padding;
    const endX = padding + drawWidth;

    // Shift samples so startPhaseNormalized appears at x=0
    const shiftedSamples = currentSamples.map(s => ({
      ...s,
      displayPhase: ((s.phase - startPhaseNormalized) % 1 + 1) % 1,
    }));

    // Sort by display phase for correct drawing order
    shiftedSamples.sort((a, b) => a.displayPhase - b.displayPhase);

    // Draw stepped line through samples with animated depth
    for (let i = 0; i < shiftedSamples.length; i++) {
      const sample = shiftedSamples[i];
      const x = padding + sample.displayPhase * drawWidth;
      const scaledValue = sample.value * speedInvert * currentDepthScale;
      const y = centerY + scaledValue * scaleY;

      if (i === 0) {
        const firstY = centerY + shiftedSamples[0].value * speedInvert * currentDepthScale * scaleY;
        path.moveTo(startX, firstY);
        path.lineTo(x, y);
      } else {
        const prevY = centerY + shiftedSamples[i - 1].value * speedInvert * currentDepthScale * scaleY;
        path.lineTo(x, prevY);
        path.lineTo(x, y);
      }
    }

    // Extend to right edge and close to baseline
    const lastSample = shiftedSamples[shiftedSamples.length - 1];
    const lastY = centerY + lastSample.value * speedInvert * currentDepthScale * scaleY;
    path.lineTo(endX, lastY);
    path.lineTo(endX, centerY);
    path.lineTo(startX, centerY);
    path.close();

    return path;
  }, [depthScale, samplesData, speedInvert, startPhaseNormalized, padding, drawWidth, centerY, scaleY]);

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
