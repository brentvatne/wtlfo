import React, { useEffect } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, useDerivedValue, Easing } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { WaveformDisplayProps } from './types';
import { sampleWaveformWorklet, sampleWaveformWithSlew, isUnipolarWorklet, sampleExpDecay, sampleExpRise } from './worklets';
import { DEFAULT_DEPTH_ANIM_DURATION, DEFAULT_EDIT_FADE_IN } from '@/src/context/preset-context';

const BASE_FILL_OPACITY = 0.2;

interface WaveformDisplayExtendedProps extends WaveformDisplayProps {
  /** Seed for RND waveform - can be a number or SharedValue for reactive updates */
  randomSeed?: number | SharedValue<number>;
}

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
  randomSeed = 0,
  isEditing = false,
  editFadeInDuration = DEFAULT_EDIT_FADE_IN,
  depthAnimationDuration = DEFAULT_DEPTH_ANIM_DURATION,
}: WaveformDisplayExtendedProps) {
  const padding = 8;
  // Account for stroke extending beyond path centerline
  const strokePadding = strokeWidth / 2;
  const effectivePadding = padding + strokePadding;

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

  // Pre-compute static values
  const drawWidth = width - padding * 2;
  // Use effective padding (includes stroke width) for vertical bounds
  const drawHeight = height - effectivePadding * 2;
  const centerY = height / 2;
  const scaleY = -drawHeight / 2;
  const hasNegativeSpeed = speed !== undefined && speed < 0;
  const isUnipolar = isUnipolarWorklet(waveform);
  const isRandom = waveform === 'RND';
  const isExp = waveform === 'EXP';
  const slewValue = isRandom ? (startPhase || 0) : 0;
  // For EXP, divide by 127 so SPH=127 wraps to same as SPH=0
  // For other waveforms, divide by 128 as normal
  // Use SPH/127 so SPH=127 wraps to look like SPH=0 (matches Digitakt visualization)
  // RND uses startPhase as SLEW, not phase offset
  const startPhaseNormalized = isRandom ? 0 : (startPhase || 0) / 127;

  // Generate stroke path on UI thread with animated depth
  const strokePath = useDerivedValue(() => {
    'worklet';
    const path = Skia.Path.Make();
    const currentDepthScale = depthScale.value;
    // Read randomSeed - handle both number and SharedValue
    const seedValue = typeof randomSeed === 'number' ? randomSeed : randomSeed.value;

    let prevValue: number | null = null;

    // For EXP, determine if decay or rise
    const isExpDecay = isExp && !hasNegativeSpeed;
    const isExpRise = isExp && hasNegativeSpeed;
    const isSaw = waveform === 'SAW';
    const isSqr = waveform === 'SQR';

    // Several waveforms need a vertical line at the start to show the cycle reset:
    // - EXP decay: jumps from ~0 (end of previous cycle) to peak at start
    // - SAW: jumps from -1 (end) to +1 (start)
    // - SQR: jumps from -1 (end) to +1 (start)
    let drewStartVerticalLine = false;
    const firstPhase = startPhaseNormalized;

    if (isExpDecay) {
      // EXP decay: vertical line from center to first value
      const firstValue = sampleExpDecay(firstPhase) * currentDepthScale;
      const firstY = centerY + firstValue * scaleY;
      path.moveTo(padding, centerY);
      path.lineTo(padding, firstY);
      drewStartVerticalLine = true;
    } else if ((isSaw || isSqr) && !hasNegativeSpeed) {
      // SAW/SQR with positive speed: vertical line from -1 to first value (+1 at phase 0)
      const firstValue = sampleWaveformWorklet(waveform, firstPhase, seedValue) * currentDepthScale;
      const endOfCycleValue = -1 * currentDepthScale; // Both end at -1
      const firstY = centerY + firstValue * scaleY;
      const endY = centerY + endOfCycleValue * scaleY;
      path.moveTo(padding, endY);
      path.lineTo(padding, firstY);
      drewStartVerticalLine = true;
    }

    // Threshold for hiding EXP end step (SPH < 5 or SPH > 122)
    const expSphThreshold = 5 / 127;
    const hideExpEndLine = startPhaseNormalized < expSphThreshold || startPhaseNormalized > (1 - expSphThreshold);

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      // All waveforms use phase wrapping with startPhase offset
      // All waveforms use SPH/127 so SPH=127 wraps to SPH=0
      let phase = (xNormalized + startPhaseNormalized) % 1;

      // For EXP with SPH near 0 or 127, prevent visual wrap at the end
      // Sample near phase=1 instead of wrapped phase=0 so curve reaches full height
      if (isExp && hideExpEndLine && i === resolution && phase < 0.01) {
        phase = 1 - 1e-4;
      }

      let value: number;
      if (isExp) {
        // EXP needs different formulas to maintain concave shape in both directions
        value = hasNegativeSpeed ? sampleExpRise(phase) : sampleExpDecay(phase);
      } else if (isRandom) {
        value = sampleWaveformWithSlew(waveform, phase, slewValue, seedValue);
      } else {
        value = sampleWaveformWorklet(waveform, phase, seedValue);
      }

      // Apply speed transformation (except EXP which already handled it)
      if (hasNegativeSpeed && !isExp) {
        if (isUnipolar) {
          // RMP: flip values (1-x works for linear)
          value = 1 - value;
        } else {
          // Bipolar: invert polarity
          value = -value;
        }
      }

      value = value * currentDepthScale;

      const x = padding + xNormalized * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        if (drewStartVerticalLine) {
          // Continue from the vertical line we drew
          path.lineTo(x, y);
        } else {
          path.moveTo(x, y);
        }
      } else {
        // Draw step for large value changes (square wave, random)
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

    // For EXP rise, add vertical line at the end from peak to center
    // Only when SPH is between 5 and 122 (matches Digitakt behavior)
    if (isExpRise && !hideExpEndLine) {
      const endX = padding + drawWidth;
      path.lineTo(endX, centerY);
    }

    return path;
  }, [depthScale, waveform, resolution, hasNegativeSpeed, isUnipolar, isExp, startPhaseNormalized, isRandom, slewValue, randomSeed, padding, drawWidth, centerY, scaleY]);

  // Generate fill path on UI thread with animated depth
  const fillPath = useDerivedValue(() => {
    'worklet';
    const path = Skia.Path.Make();
    const currentDepthScale = depthScale.value;
    // Read randomSeed - handle both number and SharedValue
    const seedValue = typeof randomSeed === 'number' ? randomSeed : randomSeed.value;
    const startX = padding;
    const endX = padding + drawWidth;

    let prevValue: number | null = null;

    // For EXP, determine if decay or rise
    const isExpDecay = isExp && !hasNegativeSpeed;
    const isSaw = waveform === 'SAW';
    const isSqr = waveform === 'SQR';

    // Several waveforms need a vertical line at the start to show the cycle reset
    let drewStartVerticalLine = false;
    const firstPhase = startPhaseNormalized;

    if (isExpDecay) {
      // EXP decay: vertical line from center to first value
      const firstValue = sampleExpDecay(firstPhase) * currentDepthScale;
      const firstY = centerY + firstValue * scaleY;
      path.moveTo(padding, centerY);
      path.lineTo(padding, firstY);
      drewStartVerticalLine = true;
    } else if ((isSaw || isSqr) && !hasNegativeSpeed) {
      // SAW/SQR with positive speed: vertical line from -1 to first value (+1 at phase 0)
      const firstValue = sampleWaveformWorklet(waveform, firstPhase, seedValue) * currentDepthScale;
      const endOfCycleValue = -1 * currentDepthScale;
      const firstY = centerY + firstValue * scaleY;
      const endY = centerY + endOfCycleValue * scaleY;
      path.moveTo(padding, endY);
      path.lineTo(padding, firstY);
      drewStartVerticalLine = true;
    }

    // Threshold for hiding EXP end step (SPH < 5 or SPH > 122)
    const expSphThreshold = 5 / 127;
    const hideExpEndLine = startPhaseNormalized < expSphThreshold || startPhaseNormalized > (1 - expSphThreshold);

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      // All waveforms use phase wrapping with startPhase offset
      // All waveforms use SPH/127 so SPH=127 wraps to SPH=0
      let phase = (xNormalized + startPhaseNormalized) % 1;

      // For EXP with SPH near 0 or 127, prevent visual wrap at the end
      // Sample near phase=1 instead of wrapped phase=0 so curve reaches full height
      if (isExp && hideExpEndLine && i === resolution && phase < 0.01) {
        phase = 1 - 1e-4;
      }

      let value: number;
      if (isExp) {
        // EXP needs different formulas to maintain concave shape in both directions
        value = hasNegativeSpeed ? sampleExpRise(phase) : sampleExpDecay(phase);
      } else if (isRandom) {
        value = sampleWaveformWithSlew(waveform, phase, slewValue, seedValue);
      } else {
        value = sampleWaveformWorklet(waveform, phase, seedValue);
      }

      // Apply speed transformation (except EXP which already handled it)
      if (hasNegativeSpeed && !isExp) {
        if (isUnipolar) {
          // RMP: flip values (1-x works for linear)
          value = 1 - value;
        } else {
          // Bipolar: invert polarity
          value = -value;
        }
      }

      value = value * currentDepthScale;

      const x = padding + xNormalized * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        if (drewStartVerticalLine) {
          path.lineTo(x, y);
        } else {
          path.moveTo(x, y);
        }
      } else {
        // Draw step for large value changes (square wave, random)
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
  }, [depthScale, waveform, resolution, hasNegativeSpeed, isUnipolar, isExp, startPhaseNormalized, isRandom, slewValue, randomSeed, padding, drawWidth, centerY, scaleY]);

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
