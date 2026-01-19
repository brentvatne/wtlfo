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

  // Calculate visualizer width - now accounts for meter
  const meterWidth = 60;
  const visualizerWidth = screenWidth - meterWidth;

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
      {/* Visualization Row - Full width, no horizontal padding */}
      <Pressable
        style={[styles.visualizationRow, isPaused && styles.paused]}
        onPress={handleTap}
      >
        {/* LFO Visualizer - takes remaining space */}
        <View style={styles.visualizerContainer}>
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
            width={visualizerWidth}
            height={280}
            theme={ELEKTRON_THEME}
            showParameters={false}
            showTiming={true}
            isEditing={isEditing}
            strokeWidth={2.5}
          />
        </View>

        {/* Destination Meter - fixed width */}
        <DestinationMeter
          lfoOutput={lfoOutput}
          destination={activeDestination}
          centerValue={hasDestination ? getCenterValue(activeDestinationId) : 64}
          depth={currentConfig.depth}
          width={meterWidth}
          height={280}
          style={!hasDestination ? styles.meterDimmed : undefined}
        />
      </Pressable>

      {/* Parameter Grid - with normal padding */}
      <View style={styles.paramSection}>
        <ParamGrid />
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
  visualizationRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  paused: {
    opacity: 0.5,
  },
  visualizerContainer: {
    flex: 1,
  },
  meterDimmed: {
    opacity: 0.3,
  },
  paramSection: {
    paddingHorizontal: 20,
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
