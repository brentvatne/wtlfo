import React, { useState, useEffect } from 'react';
import { Path, usePathInterpolation } from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useWaveformPath } from './hooks/useWaveformPath';
import type { WaveformDisplayProps } from './types';

const INTERPOLATION_DURATION = 40; // ms - fast but smooth

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
}: WaveformDisplayProps) {
  // Track "from" and "to" paths for interpolation
  const [fromDepth, setFromDepth] = useState(depth);
  const [toDepth, setToDepth] = useState(depth);

  // Animation progress
  const progress = useSharedValue(1);

  // When depth changes, set up interpolation
  useEffect(() => {
    if (depth !== toDepth) {
      // Current "to" becomes new "from"
      setFromDepth(toDepth);
      setToDepth(depth);
      // Animate progress
      progress.value = 0;
      progress.value = withTiming(1, { duration: INTERPOLATION_DURATION });
    }
  }, [depth, toDepth, progress]);

  // Generate paths for both from and to states
  const fromStrokePath = useWaveformPath(waveform, width, height, resolution, 8, fromDepth, startPhase, false);
  const fromFillPath = useWaveformPath(waveform, width, height, resolution, 8, fromDepth, startPhase, true);
  const toStrokePath = useWaveformPath(waveform, width, height, resolution, 8, toDepth, startPhase, false);
  const toFillPath = useWaveformPath(waveform, width, height, resolution, 8, toDepth, startPhase, true);

  // Interpolate between from and to paths
  const interpolatedStrokePath = usePathInterpolation(progress, [0, 1], [fromStrokePath, toStrokePath]);
  const interpolatedFillPath = usePathInterpolation(progress, [0, 1], [fromFillPath, toFillPath]);

  return (
    <>
      {/* Optional fill - closed path to baseline */}
      {fillColor && (
        <Path path={interpolatedFillPath} color={fillColor} style="fill" opacity={0.2} />
      )}

      {/* Stroke - open path */}
      <Path
        path={interpolatedStrokePath}
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </>
  );
}
