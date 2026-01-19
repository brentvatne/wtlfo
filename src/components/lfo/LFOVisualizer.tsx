import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { WaveformDisplay } from './WaveformDisplay';
import { RandomWaveform } from './RandomWaveform';
import { FadeEnvelope } from './FadeEnvelope';
import { PhaseIndicator } from './PhaseIndicator';
import { OutputValueDisplay } from './OutputValueDisplay';
import { TimingInfo } from './TimingInfo';
import { ParameterBadges } from './ParameterBadges';
import { GridLines } from './GridLines';
import { DEFAULT_THEME_DARK, DEFAULT_THEME_LIGHT, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './constants';
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
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  theme = 'dark',
  showParameters = true,
  showTiming = true,
  showOutput = true,
  showPhaseIndicator = true,
  strokeWidth = 2,
  isEditing = false,
  fadeMultiplier,
  randomSamples,
}: LFOVisualizerProps) {
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

  // Animated opacity for phase indicator (fades out when editing)
  const phaseIndicatorOpacity = useSharedValue(1);
  useEffect(() => {
    phaseIndicatorOpacity.value = withTiming(isEditing ? 0 : 1, {
      duration: 100,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isEditing, phaseIndicatorOpacity]);

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
              startPhase={startPhase}
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
              startPhase={startPhase}
            />
          )}

          {/* Fade trajectory curve - shows path with fade envelope applied */}
          {/* Only show when fade is set AND mode is not FRE (fade doesn't apply in FRE) */}
          {fade !== undefined && fade !== 0 && mode !== 'FRE' && resolvedTheme.fadeCurve && (
            <FadeEnvelope
              waveform={waveform}
              width={width}
              height={canvasHeight}
              color={resolvedTheme.fadeCurve}
              depth={depth}
              fade={fade}
              strokeWidth={strokeWidth}
              resolution={128}
              startPhase={startPhase}
            />
          )}

          {/* Animated phase indicator - always rendered, opacity controlled */}
          {showPhaseIndicator && (
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
            />
          )}
        </Group>
      </Canvas>

      {/* Output value display */}
      {showOutput && (
        <OutputValueDisplay
          output={outputValue}
          theme={resolvedTheme}
          isEditing={isEditing}
        />
      )}

      {/* Timing info at bottom */}
      {showTiming && (
        <TimingInfo
          bpm={bpm}
          cycleTimeMs={cycleTimeMs}
          noteValue={noteValue}
          theme={resolvedTheme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
