import React, { useEffect, useState, useRef } from 'react';
import { Path } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useWaveformPath } from './hooks/useWaveformPath';
import type { WaveformDisplayProps } from './types';

const BASE_FILL_OPACITY = 0.2;
// Throttle path regeneration to reduce JS thread work during slider drag
const PATH_THROTTLE_MS = 60;

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
  // Throttle depth changes for path generation to avoid regenerating on every frame
  // This dramatically reduces JS thread work during slider interaction
  const [pathDepth, setPathDepth] = useState(depth);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending throttle
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    // If editing, throttle path updates to reduce work
    if (isEditing) {
      throttleRef.current = setTimeout(() => {
        setPathDepth(depth);
        throttleRef.current = null;
      }, PATH_THROTTLE_MS);
    } else {
      // When not editing, update immediately for final state
      setPathDepth(depth);
    }

    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [depth, isEditing]);

  // Generate paths using throttled depth value
  const strokePath = useWaveformPath(waveform, width, height, resolution, 8, pathDepth, startPhase, false);
  const fillPath = useWaveformPath(waveform, width, height, resolution, 8, pathDepth, startPhase, true);

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
