import React, { useEffect } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, useDerivedValue, Easing } from 'react-native-reanimated';
import type { WaveformDisplayProps } from './types';
import { sampleWaveformWorklet, sampleWaveformWithSlew } from './worklets';

const BASE_FILL_OPACITY = 0.2;
const DEPTH_ANIMATION_DURATION = 120;

export function WaveformDisplay({
  waveform,
  width,
  height,
  strokeColor,
  strokeWidth,
  fillColor,
  resolution = 128,
  depth,
  speed,
  startPhase,
  isEditing = false,
  editFadeInDuration = 350,
}: WaveformDisplayProps) {
  const padding = 8;

  // Animated depth scale (-1 to 1, where depth/63 gives the scale factor)
  const depthScale = useSharedValue(depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1);

  // Animate depth changes
  useEffect(() => {
    const targetScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;
    depthScale.value = withTiming(targetScale, {
      duration: DEPTH_ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [depth, depthScale]);

  // Pre-compute static values
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;
  const centerY = height / 2;
  const scaleY = -drawHeight / 2;
  const speedInvert = speed !== undefined && speed < 0 ? -1 : 1;
  const isRandom = waveform === 'RND';
  const slewValue = isRandom ? (startPhase || 0) : 0;
  const startPhaseNormalized = isRandom ? 0 : (startPhase || 0) / 128;

  // Generate stroke path on UI thread with animated depth
  const strokePath = useDerivedValue(() => {
    'worklet';
    const path = Skia.Path.Make();
    const currentDepthScale = depthScale.value;

    let prevValue: number | null = null;

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      const phase = (xNormalized + startPhaseNormalized) % 1;
      let value = isRandom
        ? sampleWaveformWithSlew(waveform, phase, slewValue)
        : sampleWaveformWorklet(waveform, phase);

      value = value * speedInvert * currentDepthScale;

      const x = padding + xNormalized * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        const threshold = 0.5;
        if (prevValue !== null && Math.abs(value - prevValue) > threshold) {
          const prevY = centerY + prevValue * scaleY;
          path.lineTo(x, prevY);
          path.lineTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }

      prevValue = value;
    }

    return path;
  }, [depthScale, waveform, resolution, speedInvert, startPhaseNormalized, isRandom, slewValue, padding, drawWidth, centerY, scaleY]);

  // Generate fill path on UI thread with animated depth
  const fillPath = useDerivedValue(() => {
    'worklet';
    const path = Skia.Path.Make();
    const currentDepthScale = depthScale.value;
    const startX = padding;
    const endX = padding + drawWidth;

    let prevValue: number | null = null;

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      const phase = (xNormalized + startPhaseNormalized) % 1;
      let value = isRandom
        ? sampleWaveformWithSlew(waveform, phase, slewValue)
        : sampleWaveformWorklet(waveform, phase);

      value = value * speedInvert * currentDepthScale;

      const x = padding + xNormalized * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        const threshold = 0.5;
        if (prevValue !== null && Math.abs(value - prevValue) > threshold) {
          const prevY = centerY + prevValue * scaleY;
          path.lineTo(x, prevY);
          path.lineTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }

      prevValue = value;
    }

    // Close path to baseline for fill
    path.lineTo(endX, centerY);
    path.lineTo(startX, centerY);
    path.close();

    return path;
  }, [depthScale, waveform, resolution, speedInvert, startPhaseNormalized, isRandom, slewValue, padding, drawWidth, centerY, scaleY]);

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

  return (
    <>
      {/* Optional fill - closed path to baseline, fades in when editing ends */}
      {fillColor && (
        <Path path={fillPath} color={fillColor} style="fill" opacity={fillOpacity} />
      )}

      {/* Stroke - open path */}
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
