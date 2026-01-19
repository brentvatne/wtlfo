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

// Grid height: 2 rows * 52px minHeight + 4px gap = 108px
const GRID_HEIGHT = 108;

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

  // Calculate visualizer width - full width now
  const visualizerWidth = screenWidth;

  // Meter width
  const meterWidth = 56;

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
      {/* LFO Visualizer - Full width, no output label */}
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
          height={240}
          theme={ELEKTRON_THEME}
          showParameters={false}
          showTiming={true}
          showOutput={false}
          isEditing={isEditing}
          strokeWidth={2.5}
        />
      </Pressable>

      {/* Parameter Grid + Destination Meter Row */}
      <View style={styles.controlsRow}>
        {/* Parameter Grid */}
        <View style={styles.gridContainer}>
          <ParamGrid />
        </View>

        {/* Destination Meter - same height as grid */}
        <View style={styles.meterContainer}>
          <DestinationMeter
            lfoOutput={lfoOutput}
            destination={activeDestination}
            centerValue={hasDestination ? getCenterValue(activeDestinationId) : 64}
            depth={currentConfig.depth}
            width={meterWidth}
            height={GRID_HEIGHT}
            showValue={hasDestination}
            style={!hasDestination ? styles.meterDimmed : undefined}
          />
        </View>
      </View>

      {/* Destination Info - only shown when destination selected */}
      {hasDestination && (
        <View style={styles.destinationSection}>
          <Text style={styles.destinationName}>{activeDestination.name}</Text>
          <CenterValueSlider
            value={getCenterValue(activeDestinationId)}
            onChange={(value) => setCenterValue(activeDestinationId, value)}
            min={activeDestination.min}
            max={activeDestination.max}
            label="Center Value"
            bipolar={activeDestination.bipolar}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  visualizerContainer: {
    marginBottom: 12,
  },
  paused: {
    opacity: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    paddingRight: 12,
    gap: 0,
  },
  gridContainer: {
    flex: 1,
  },
  meterContainer: {
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  meterDimmed: {
    opacity: 0.3,
  },
  destinationSection: {
    paddingHorizontal: 20,
    marginTop: 16,
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
