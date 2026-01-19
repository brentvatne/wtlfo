import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { usePreset } from '@/src/context/preset-context';
import { useModulation } from '@/src/context/modulation-context';
import { getDestination } from '@/src/data/destinations';
import { LFOVisualizer, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { DestinationMeter } from '@/src/components/destination/DestinationMeter';
import { CenterValueSlider } from '@/src/components/destination/CenterValueSlider';

export default function DestinationScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const visualizerWidth = screenWidth - 40;

  const {
    currentConfig,
    bpm,
    lfoPhase,
    lfoOutput,
    timingInfo,
    isEditing,
  } = usePreset();

  const {
    activeDestinationId,
    getCenterValue,
    setCenterValue,
  } = useModulation();

  const destination = getDestination(activeDestinationId);
  const centerValue = getCenterValue(activeDestinationId);

  // Calculate modulation range
  const range = destination.max - destination.min;
  const maxModulation = range / 2;
  const depthScale = Math.abs(currentConfig.depth / 63);
  const swing = maxModulation * depthScale;
  const minValue = Math.max(destination.min, Math.round(centerValue - swing));
  const maxValue = Math.min(destination.max, Math.round(centerValue + swing));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Destination Name */}
      <View style={styles.header}>
        <Text style={styles.destinationName}>{destination.name}</Text>
        <Text style={styles.destinationDisplay}>{destination.displayName}</Text>
      </View>

      {/* Dual visualization: LFO + Meter side by side */}
      <View style={styles.visualizationRow}>
        {/* LFO Waveform */}
        <View style={styles.lfoContainer}>
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
            width={visualizerWidth - 80}
            height={200}
            theme={ELEKTRON_THEME}
            showParameters={false}
            showTiming={false}
            showOutput={false}
            isEditing={isEditing}
            strokeWidth={2}
          />
        </View>

        {/* Destination Meter */}
        <DestinationMeter
          lfoOutput={lfoOutput}
          destination={destination}
          centerValue={centerValue}
          depth={currentConfig.depth}
          width={60}
          height={200}
        />
      </View>

      {/* Current Values Display */}
      <View style={styles.valuesRow}>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>CENTER</Text>
          <Text style={styles.valueNumber}>{Math.round(centerValue)}</Text>
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>RANGE</Text>
          <Text style={styles.valueNumber}>{minValue} — {maxValue}</Text>
        </View>
      </View>

      {/* Center Value Slider */}
      <View style={styles.sliderContainer}>
        <CenterValueSlider
          value={centerValue}
          onChange={(v) => setCenterValue(activeDestinationId, v)}
          min={destination.min}
          max={destination.max}
          label="CENTER VALUE"
          bipolar={destination.bipolar}
        />
      </View>

      {/* Modulation Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Modulation</Text>
        <Text style={styles.infoText}>
          The LFO modulates {destination.name.toLowerCase()} around the center value.
          {destination.bipolar
            ? ' This is a bipolar parameter that can go positive or negative from center.'
            : ' This parameter ranges from minimum to maximum.'}
        </Text>
        <Text style={styles.infoText}>
          With depth at {currentConfig.depth >= 0 ? '+' : ''}{currentConfig.depth},
          the value will swing between {minValue} and {maxValue}.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  destinationName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  destinationDisplay: {
    fontSize: 14,
    color: '#888899',
    fontFamily: 'monospace',
  },
  visualizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  lfoContainer: {
    flex: 1,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  valueBox: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 11,
    color: '#666677',
    fontWeight: '600',
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  sliderContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#888899',
    lineHeight: 20,
    marginBottom: 8,
  },
});
