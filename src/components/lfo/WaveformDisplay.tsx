import React, { useEffect } from 'react';
import { Path } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useWaveformPath } from './hooks/useWaveformPath';
import type { WaveformDisplayProps } from './types';

const BASE_FILL_OPACITY = 0.2;

export function WaveformDisplay({
  waveform,
  width,
  height,
  strokeColor,
  strokeWidth,
  fillColor,
  resolution = 128,
  depth,
  startPhase,
  isEditing = false,
  editFadeInDuration = 350,
}: WaveformDisplayProps) {
  // Generate paths directly from current depth - no interpolation
  const strokePath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, false);
  const fillPath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, true);

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
