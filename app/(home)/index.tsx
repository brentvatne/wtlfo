import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LFOVisualizer, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { ParamGrid } from '@/src/components/params';
import { DestinationMeter, CenterValueSlider } from '@/src/components/destination';
import { usePreset } from '@/src/context/preset-context';
import { useModulation } from '@/src/context/modulation-context';
import { getDestination } from '@/src/data/destinations';
import { colors } from '@/src/theme';

// Visualizer height and timing info height
const VISUALIZER_HEIGHT = 240;
const TIMING_HEIGHT = 40;
const METER_HEIGHT = VISUALIZER_HEIGHT - TIMING_HEIGHT; // Match canvas height

// Meter width - fixed
const METER_WIDTH = 52;

export default function HomeScreen() {
  const {
    currentConfig,
    bpm,
    isEditing,
    lfoPhase,
    lfoOutput,
    timingInfo,
    triggerLFO,
    startLFO,
    stopLFO,
    isLFORunning,
    isPaused,
    setIsPaused,
  } = usePreset();

  const { activeDestinationId, getCenterValue, setCenterValue } = useModulation();
  const { width: screenWidth } = useWindowDimensions();

  // Get the active destination (null if 'none')
  const activeDestination = getDestination(activeDestinationId);
  const hasDestination = activeDestination !== null;

  // Calculate visualizer width - screen minus meter
  const visualizerWidth = screenWidth - METER_WIDTH;

  // Tap handler - pause/play/restart logic
  const handleTap = () => {
    if (isPaused) {
      // Resume from manual pause
      startLFO();
      setIsPaused(false);
    } else if (!isLFORunning()) {
      // Stopped (ONE/HLF completed) - restart
      triggerLFO();
    } else {
      // Currently running - pause it
      stopLFO();
      setIsPaused(true);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* LFO Visualizer + Destination Meter Row */}
      <View style={styles.visualizerRow}>
        {/* LFO Visualizer */}
        <Pressable
          style={[styles.visualizerContainer, isPaused && styles.paused]}
          onPress={handleTap}
        >
          <LFOVisualizer
            phase={lfoPhase}
            output={lfoOutput}
            waveform={currentConfig.waveform as WaveformType}
            speed={currentConfig.speed}
            multiplier={currentConfig.multiplier}
            startPhase={currentConfig.startPhase}
            mode={currentConfig.mode as TriggerMode}
            depth={currentConfig.depth}
            fade={currentConfig.fade}
            bpm={bpm}
            cycleTimeMs={timingInfo.cycleTimeMs}
            noteValue={timingInfo.noteValue}
            steps={timingInfo.steps}
            width={visualizerWidth}
            height={VISUALIZER_HEIGHT}
            theme={ELEKTRON_THEME}
            showParameters={false}
            showTiming={true}
            showOutput={false}
            isEditing={isEditing}
            strokeWidth={2.5}
          />
        </Pressable>

        {/* Destination Meter - same height as canvas (excluding timing info) */}
        <Pressable
          style={[
            styles.meterContainer,
            !hasDestination && styles.meterDimmed,
            isPaused && styles.paused,
          ]}
          onPress={handleTap}
        >
          <DestinationMeter
            lfoOutput={lfoOutput}
            destination={activeDestination}
            centerValue={hasDestination ? getCenterValue(activeDestinationId) : 64}
            depth={currentConfig.depth}
            waveform={currentConfig.waveform as WaveformType}
            width={METER_WIDTH}
            height={METER_HEIGHT}
            showValue={hasDestination}
          />
        </Pressable>
      </View>

      {/* Parameter Grid - Full width */}
      <View style={styles.gridContainer}>
        <ParamGrid />
      </View>

      {/* Destination Info - always rendered to prevent layout shift */}
      <View style={[styles.destinationSection, !hasDestination && styles.destinationHidden]}>
        <Text style={styles.destinationName}>
          {hasDestination ? activeDestination.name : 'No Destination'}
        </Text>
        <CenterValueSlider
          value={hasDestination ? getCenterValue(activeDestinationId) : 64}
          onChange={(value) => hasDestination && setCenterValue(activeDestinationId, value)}
          min={activeDestination?.min ?? 0}
          max={activeDestination?.max ?? 127}
          label="Center Value"
          bipolar={activeDestination?.bipolar ?? false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  visualizerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  visualizerContainer: {
    flex: 1,
  },
  paused: {
    opacity: 0.5,
  },
  gridContainer: {
    // Full width
  },
  meterContainer: {
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  meterDimmed: {
    opacity: 0.3,
  },
  destinationSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  destinationHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  destinationName: {
    color: '#ff6600',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
