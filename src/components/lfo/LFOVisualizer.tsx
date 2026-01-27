import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, withSequence, Easing, useReducedMotion } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { WaveformDisplay } from './WaveformDisplay';
import { RandomWaveform } from './RandomWaveform';
import { FadeEnvelope } from './FadeEnvelope';
import { FadeEnvelopeShape } from './FadeEnvelopeShape';
import { PhaseIndicator } from './PhaseIndicator';
import { OutputValueDisplay } from './OutputValueDisplay';
import { TimingInfo } from './TimingInfo';
import { ParameterBadges } from './ParameterBadges';
import { GridLines } from './GridLines';
import { DEFAULT_THEME_DARK, DEFAULT_THEME_LIGHT, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './constants';
import { DEFAULT_DEPTH_ANIM_DURATION, DEFAULT_EDIT_FADE_IN, DEFAULT_EDIT_FADE_OUT } from '@/src/context/preset-context';
import type { LFOVisualizerProps, LFOTheme } from './types';

export function LFOVisualizer({
  phase,
  output,
  waveform,
  speed,
  multiplier,
  startPhase,
  mode,
  depth,
  fade,
  bpm,
  cycleTimeMs,
  noteValue,
  steps,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  theme = 'dark',
  showParameters = true,
  showTiming = true,
  showOutput = true,
  showPhaseIndicator = true,
  strokeWidth = 2,
  isEditing = false,
  showFillsWhenEditing = true,
  editFadeOutDuration = DEFAULT_EDIT_FADE_OUT,
  editFadeInDuration = DEFAULT_EDIT_FADE_IN,
  fadeMultiplier,
  cycleCount,
  randomSamples,
  randomSeed,
  showFadeEnvelope = true,
  depthAnimationDuration = DEFAULT_DEPTH_ANIM_DURATION,
}: LFOVisualizerProps) {
  // Always hide values while editing
  const shouldHideValue = isEditing;
  // Only hide fills if editing AND the setting says to hide them (showFillsWhenEditing=false)
  const shouldHideFill = isEditing && !showFillsWhenEditing;
  // Check if user prefers reduced motion (accessibility setting)
  const reducedMotion = useReducedMotion();

  // Resolve theme
  const resolvedTheme: LFOTheme = useMemo(() => {
    if (typeof theme === 'object') return theme;
    return theme === 'dark' ? DEFAULT_THEME_DARK : DEFAULT_THEME_LIGHT;
  }, [theme]);

  // IMPORTANT: Always call hooks unconditionally to satisfy Rules of Hooks
  // Create internal shared values that we'll sync with props
  const internalPhase = useSharedValue(typeof phase === 'number' ? phase : 0);
  const internalOutput = useSharedValue(typeof output === 'number' ? output : 0);

  // Determine which values to use (prop SharedValue or internal)
  const isPhaseShared = typeof phase !== 'number';
  const isOutputShared = typeof output !== 'number';

  // Sync internal values when static props change
  useEffect(() => {
    if (!isPhaseShared) {
      internalPhase.value = phase as number;
    }
  }, [phase, isPhaseShared, internalPhase]);

  useEffect(() => {
    if (!isOutputShared) {
      internalOutput.value = output as number;
    }
  }, [output, isOutputShared, internalOutput]);

  // Use the appropriate shared value (from props or internal)
  const phaseValue = isPhaseShared ? (phase as SharedValue<number>) : internalPhase;
  const outputValue = isOutputShared ? (output as SharedValue<number>) : internalOutput;

  // Animated opacity for phase indicator (fades out when editing or waveform changing)
  const phaseIndicatorOpacity = useSharedValue(1);
  const prevWaveformRef = useRef(waveform);

  // Single consolidated effect for phase indicator opacity
  // Handles: editing state changes, waveform changes, and their combinations
  useEffect(() => {
    // Check if waveform changed since last render
    const waveformChanged = prevWaveformRef.current !== waveform;
    if (waveformChanged) {
      prevWaveformRef.current = waveform;
    }

    if (shouldHideValue) {
      // Editing with hide enabled: fade out quickly
      phaseIndicatorOpacity.value = withTiming(0, {
        duration: editFadeOutDuration,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (waveformChanged && !reducedMotion) {
      // Waveform changed while not editing: cross-fade
      phaseIndicatorOpacity.value = withSequence(
        withTiming(0, { duration: 80, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 150, easing: Easing.in(Easing.ease) })
      );
    } else {
      // Not editing (includes editing just ended): fade back in
      phaseIndicatorOpacity.value = withTiming(1, {
        duration: editFadeInDuration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [shouldHideValue, waveform, reducedMotion, phaseIndicatorOpacity, editFadeOutDuration, editFadeInDuration]);

  // Calculate canvas dimensions (excluding padding for info displays)
  const parameterHeight = showParameters ? 40 : 0;
  const timingHeight = showTiming ? 40 : 0;
  const outputHeight = showOutput ? 28 : 0;
  const canvasHeight = height - parameterHeight - timingHeight - outputHeight;

  return (
    <View style={[styles.container, { width, backgroundColor: resolvedTheme.background }]} pointerEvents="none">
      {/* Parameter badges at top */}
      {showParameters && (
        <ParameterBadges
          waveform={waveform}
          speed={speed}
          multiplier={multiplier}
          mode={mode}
          depth={depth}
          fade={fade}
          startPhase={startPhase}
          theme={resolvedTheme}
        />
      )}

      {/* Main waveform canvas */}
      <Canvas style={{ width, height: canvasHeight }} pointerEvents="none">
        <Group>
          {/* Grid lines (optional background) */}
          <GridLines
            width={width}
            height={canvasHeight}
            color={resolvedTheme.gridLines}
          />

          {/* Waveform display - use RandomWaveform for RND if samples provided */}
          {waveform === 'RND' && randomSamples && randomSamples.length > 0 ? (
            <RandomWaveform
              samples={randomSamples}
              width={width}
              height={canvasHeight}
              strokeColor={resolvedTheme.waveformStroke}
              strokeWidth={strokeWidth}
              fillColor={resolvedTheme.waveformFill}
              depth={depth}
              speed={speed}
              startPhase={startPhase}
              isEditing={shouldHideFill}
              editFadeInDuration={editFadeInDuration}
              depthAnimationDuration={depthAnimationDuration}
            />
          ) : (
            <WaveformDisplay
              waveform={waveform}
              width={width}
              height={canvasHeight}
              strokeColor={resolvedTheme.waveformStroke}
              strokeWidth={strokeWidth}
              fillColor={resolvedTheme.waveformFill}
              resolution={128}
              depth={depth}
              speed={speed}
              startPhase={startPhase}
              randomSeed={randomSeed}
              isEditing={shouldHideFill}
              editFadeInDuration={editFadeInDuration}
              depthAnimationDuration={depthAnimationDuration}
            />
          )}

          {/* Fade envelope shape - dashed line showing the fade envelope independent of LFO */}
          {/* Only show when fade is set AND mode is not FRE (fade doesn't apply in FRE) */}
          {showFadeEnvelope && fade !== undefined && fade !== 0 && mode !== 'FRE' && resolvedTheme.fadeCurve && (
            <FadeEnvelopeShape
              width={width}
              height={canvasHeight}
              color={resolvedTheme.fadeCurve}
              depth={depth}
              fade={fade}
              strokeWidth={1.5}
              opacity={0.25}
            />
          )}

          {/* Fade trajectory curve - shows path with fade envelope applied to LFO */}
          {/* Only show when fade is set AND mode is not FRE (fade doesn't apply in FRE) */}
          {fade !== undefined && fade !== 0 && mode !== 'FRE' && resolvedTheme.fadeCurve && (
            <FadeEnvelope
              waveform={waveform}
              width={width}
              height={canvasHeight}
              color={resolvedTheme.fadeCurve}
              depth={depth}
              speed={speed}
              fade={fade}
              strokeWidth={strokeWidth}
              resolution={128}
              startPhase={startPhase}
              opacity={0.6}
            />
          )}

          {/* Animated phase indicator - hidden when reduced motion is enabled */}
          {showPhaseIndicator && !reducedMotion && (
            <PhaseIndicator
              phase={phaseValue}
              output={outputValue}
              width={width}
              height={canvasHeight}
              color={resolvedTheme.phaseIndicator}
              showDot={true}
              dotRadius={6}
              startPhase={startPhase}
              opacity={phaseIndicatorOpacity}
              waveform={waveform}
              depth={depth}
              speed={speed}
              fade={fade}
              mode={mode}
              fadeMultiplier={fadeMultiplier}
              cycleCount={cycleCount}
              randomSeed={randomSeed}
            />
          )}
        </Group>
      </Canvas>

      {/* Output value display */}
      {showOutput && (
        <OutputValueDisplay
          output={outputValue}
          theme={resolvedTheme}
          isEditing={shouldHideValue}
        />
      )}

      {/* Timing info at bottom */}
      {showTiming && (
        <TimingInfo
          bpm={bpm}
          cycleTimeMs={cycleTimeMs}
          noteValue={noteValue}
          steps={steps}
          theme={resolvedTheme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
